import { describe, it, expect } from "vitest";
import {
  getReasoner,
  OpenAIReasoner,
  VeniceReasoner,
  ContextPacket,
} from "../agent";

describe("Maana Cognitive Reasoner Abstraction (MAANA-REASONING-01)", () => {
  it("factory returns expected provider instances and falls back gracefully", () => {
    const defaultReasoner = getReasoner();
    expect(defaultReasoner).toBeDefined();
    expect(defaultReasoner.providerName).toBe("heuristic-mock");

    const openAiReasoner = getReasoner("openai", { apiKey: "mock-key" });
    expect(openAiReasoner).toBeInstanceOf(OpenAIReasoner);
    expect(openAiReasoner.providerName).toBe("openai");

    const veniceReasoner = getReasoner("venice", { apiKey: "mock-key" });
    expect(veniceReasoner).toBeInstanceOf(VeniceReasoner);
    expect(veniceReasoner.providerName).toBe("venice");
  });

  it("correctly parses markdown-wrapped structured JSON responses", () => {
    const reasoner = new OpenAIReasoner();
    // Use protected method via test-friendly subclass or cast
    const testJson = `\`\`\`json
{
  "classification": "DEPENDENCY",
  "confidence": 0.94,
  "reason": "Discovered bisect left boundary invariant required for binary search.",
  "suggestedNode": "Bisect Invariants",
  "suggestedType": "dependency"
}
\`\`\``;

    // @ts-expect-error testing protected method
    const parsed = reasoner.parseJsonResponse(testJson);
    expect(parsed.classification).toBe("dependency");
    expect(parsed.confidence).toBe(0.94);
    expect(parsed.reason).toContain("bisect left");
    expect(parsed.suggestedNode).toBe("Bisect Invariants");
    expect(parsed.suggestedType).toBe("dependency");
  });

  it("handles malformed JSON responses by falling back to AMBIGUOUS without crashing", () => {
    const reasoner = new OpenAIReasoner();
    // @ts-expect-error testing protected method
    const parsed = reasoner.parseJsonResponse("Sorry I cannot classify this text properly.");
    expect(parsed.classification).toBe("ambiguous");
    expect(parsed.confidence).toBeLessThanOrEqual(0.6);
  });

  it("semantically classifies a clear prerequisite as DEPENDENCY", async () => {
    const reasoner = getReasoner("heuristic-mock");

    const context: ContextPacket = {
      goal: {
        id: "goal_1",
        title: "Learn data structures well enough to solve interview problems",
      },
      currentPath: ["Data Structures", "Binary Search"],
      previousActivity: {
        app: "YouTube",
        type: "watch",
        domain: "youtube.com",
        title: "Binary Search Deep Dive",
        durationSeconds: 900,
      },
      currentActivity: {
        app: "LeetCode",
        type: "code",
        domain: "leetcode.com",
        title: "Bisect Left vs Right Edge Cases in Binary Search",
        durationSeconds: 120,
      },
      recentActivities: [],
    };

    const result = await reasoner.classify(context);
    expect(result.classification).toBe("dependency");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.suggestedType).toBe("dependency");
    expect(result.suggestedNode).toBeDefined();
    expect(result.driftScore).toBeLessThan(0.2);
  });

  it("semantically classifies entertainment browsing as DRIFT with high drift score", async () => {
    const reasoner = getReasoner("heuristic-mock");

    const context: ContextPacket = {
      goal: {
        id: "goal_1",
        title: "Learn data structures well enough to solve interview problems",
      },
      currentPath: ["Data Structures", "Binary Search"],
      previousActivity: {
        app: "LeetCode",
        type: "code",
        domain: "leetcode.com",
        title: "Binary Search 704",
        durationSeconds: 300,
      },
      currentActivity: {
        app: "TikTok",
        type: "watch",
        domain: "tiktok.com",
        title: "Funny pet videos compilation",
        durationSeconds: 600,
      },
      recentActivities: [],
    };

    const result = await reasoner.classify(context);
    expect(result.classification).toBe("drift");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.driftScore).toBeGreaterThanOrEqual(0.75);
    expect(result.reason).toContain("entertainment/social");
  });

  it("classifies ordinary topic continuation on docs as CONTINUE without creating a branch", async () => {
    const reasoner = getReasoner("heuristic-mock");

    const context: ContextPacket = {
      goal: {
        id: "goal_1",
        title: "Learn data structures well enough to solve interview problems",
      },
      currentPath: ["Data Structures", "Binary Search"],
      previousActivity: {
        app: "LeetCode",
        type: "code",
        domain: "leetcode.com",
        title: "Binary Search",
        durationSeconds: 180,
      },
      currentActivity: {
        app: "MDN",
        type: "read",
        domain: "developer.mozilla.org",
        title: "JavaScript Array.prototype.indexOf & binary search algorithms",
        durationSeconds: 140,
      },
      recentActivities: [],
    };

    const result = await reasoner.classify(context);
    expect(result.classification).toBe("continue");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.driftScore).toBeLessThan(0.1);
  });
});
