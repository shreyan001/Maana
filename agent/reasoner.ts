import {
  ContextPacket,
  ClassificationResult,
  ActivityClassification,
  ReasonerOptions,
} from "./types";

export abstract class Reasoner {
  protected options: ReasonerOptions;

  constructor(options: ReasonerOptions = {}) {
    this.options = options;
  }

  abstract readonly providerName: "openai" | "venice" | "heuristic-mock";
  abstract readonly defaultModel: string;

  /**
   * Classifies an observed activity transition against the active goal.
   */
  abstract classify(context: ContextPacket): Promise<ClassificationResult>;

  /**
   * Deep reasoning or explanation generation for why a branch was formed.
   */
  abstract reason(context: ContextPacket, prompt: string): Promise<string>;

  /**
   * Formats the standardized transition classifier prompt.
   */
  protected buildPrompt(context: ContextPacket): string {
    const pathStr =
      context.currentPath && context.currentPath.length > 0
        ? context.currentPath.join(" -> ")
        : "Root Goal";

    const prevStr = context.previousActivity
      ? `[${context.previousActivity.type.toUpperCase()}] ${context.previousActivity.title} (${context.previousActivity.domain || "no-domain"}, ${context.previousActivity.durationSeconds || 0}s)`
      : "None (Session Start)";

    const currStr = `[${context.currentActivity.type.toUpperCase()}] ${context.currentActivity.title} (${context.currentActivity.domain || "no-domain"}, ${context.currentActivity.durationSeconds || 0}s)`;

    const recentStr =
      context.recentActivities && context.recentActivities.length > 0
        ? context.recentActivities
            .map(
              (a, i) =>
                `  ${i + 1}. [${a.type}] ${a.title} on ${a.domain || "unknown"}`
            )
            .join("\n")
        : "  (None)";

    return `You are Maana's semantic transition classifier. Maana preserves continuity of user intent.

The user's high-level goal is:
"${context.goal.title}"
${context.goal.description ? `Description: ${context.goal.description}` : ""}

The active work path is:
${pathStr}

The previous activity was:
${prevStr}

The current activity is:
${currStr}

Recent activities:
${recentStr}

Classify the current activity transition into exactly ONE of the following:
- CONTINUE: The activity directly advances the active node or current subtask.
- DEPENDENCY: Discovered an essential prerequisite or sub-problem required to complete the objective.
- PARALLEL_BRANCH: A legitimate alternative or concurrent path of exploration towards the goal.
- NEW_OBJECTIVE: The user deliberately switched to a completely distinct, valid high-level goal.
- DRIFT: Sustained distraction, entertainment, or irrelevant browsing inconsistent with the goal.
- AMBIGUOUS: Insufficient context or evidence to determine intent. Do not guess.

Rules:
1. Do not invent user intent.
2. Ordinary navigation between docs and code is NOT a new branch (it is CONTINUE).
3. Switching applications alone is NOT drift (e.g. from YouTube to VS Code or LeetCode is healthy).
4. A newly discovered prerequisite (e.g., studying binary search and researching bisect edge cases) is a DEPENDENCY.
5. Legitimate exploration paths should NOT be punished as drift.
6. Drift requires clear evidence of distraction (e.g., social media reels, gaming, unrelated shopping).
7. Prefer AMBIGUOUS when evidence is insufficient.
8. Return concise evidence explaining your classification.
9. Return a confidence score between 0.0 and 1.0.

Return VALID JSON ONLY matching this schema:
{
  "classification": "CONTINUE" | "DEPENDENCY" | "PARALLEL_BRANCH" | "NEW_OBJECTIVE" | "DRIFT" | "AMBIGUOUS",
  "confidence": number,
  "reason": string,
  "suggestedNode": string | null,
  "suggestedType": "branch" | "dependency" | "exploration" | "objective" | null
}`;
  }

  /**
   * Helper to clean and parse JSON from an LLM response.
   */
  protected parseJsonResponse(raw: string): {
    classification: ActivityClassification;
    confidence: number;
    reason: string;
    suggestedNode?: string;
    suggestedType?: "branch" | "dependency" | "exploration" | "objective";
  } {
    let clean = raw.trim();
    if (clean.startsWith("```json")) {
      clean = clean.slice(7);
    } else if (clean.startsWith("```")) {
      clean = clean.slice(3);
    }
    if (clean.endsWith("```")) {
      clean = clean.slice(0, -3);
    }
    clean = clean.trim();

    try {
      const parsed = JSON.parse(clean);
      const rawClass = String(parsed.classification || "AMBIGUOUS")
        .toLowerCase()
        .replace(/\s+/g, "_");

      let validClass: ActivityClassification = "ambiguous";
      if (
        [
          "continue",
          "dependency",
          "parallel_branch",
          "new_objective",
          "drift",
          "ambiguous",
        ].includes(rawClass)
      ) {
        validClass = rawClass as ActivityClassification;
      }

      return {
        classification: validClass,
        confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8,
        reason: String(parsed.reason || "Semantic classification completed."),
        suggestedNode: parsed.suggestedNode || undefined,
        suggestedType: parsed.suggestedType || undefined,
      };
    } catch {
      return {
        classification: "ambiguous",
        confidence: 0.5,
        reason: "Failed to parse structured model response. Preserving ambiguity.",
      };
    }
  }

  /**
   * Fallback heuristic classifier when offline or when no API key is set.
   * Deterministic, fast, and testable.
   */
  protected runHeuristicClassification(context: ContextPacket): ClassificationResult {
    const curr = context.currentActivity;
    const goalLower = context.goal.title.toLowerCase();
    const titleLower = curr.title.toLowerCase();
    const domainLower = (curr.domain || "").toLowerCase();

    // High distraction domains -> Drift
    const driftDomains = ["reddit.com", "twitter.com", "x.com", "instagram.com", "tiktok.com", "netflix.com", "twitch.tv"];
    const isDriftDomain = driftDomains.some((d) => domainLower.includes(d));

    if (isDriftDomain) {
      return {
        classification: "drift",
        confidence: 0.88,
        reason: `Activity on entertainment/social domain (${curr.domain}) is unrelated to goal "${context.goal.title}".`,
        driftScore: 0.85,
        model: "heuristic-classifier",
        provider: this.providerName,
      };
    }

    // Coding / Problem Solving / Technical Docs -> Check semantic relation
    const techDomains = ["github.com", "leetcode.com", "stackoverflow.com", "developer.mozilla.org", "docs.rs", "youtube.com"];
    const isTechDomain = techDomains.some((d) => domainLower.includes(d));

    // Prerequisite discovery keywords
    const isPrerequisite =
      titleLower.includes("bisect") ||
      titleLower.includes("matrix") ||
      titleLower.includes("recursion") ||
      titleLower.includes("dependency") ||
      titleLower.includes("edge case") ||
      titleLower.includes("prerequisite") ||
      titleLower.includes("boundary");

    if (isTechDomain && isPrerequisite) {
      return {
        classification: "dependency",
        confidence: 0.94,
        reason: `Encountered prerequisite/edge-case investigation ("${curr.title}") connected to "${context.goal.title}".`,
        suggestedNode: curr.title.split("—")[0].split("-")[0].trim(),
        suggestedType: "dependency",
        driftScore: 0.05,
        model: "heuristic-classifier",
        provider: this.providerName,
      };
    }

    // Related technology/topic
    const goalTokens = goalLower.split(/\s+/).filter((w) => w.length > 3);
    const hasGoalTokenMatch = goalTokens.some((t) => titleLower.includes(t) || domainLower.includes(t));

    if (hasGoalTokenMatch || isTechDomain) {
      return {
        classification: "continue",
        confidence: 0.9,
        reason: `Activity directly relates to active intent ("${context.goal.title}").`,
        driftScore: 0.02,
        model: "heuristic-classifier",
        provider: this.providerName,
      };
    }

    // Ambiguous if inconclusive
    return {
      classification: "ambiguous",
      confidence: 0.6,
      reason: `Insufficient semantic overlap between "${curr.title}" and goal "${context.goal.title}". Preserving continuity without assumption.`,
      driftScore: 0.35,
      model: "heuristic-classifier",
      provider: this.providerName,
    };
  }
}
