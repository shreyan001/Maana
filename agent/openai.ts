import { Reasoner } from "./reasoner";
import {
  ContextPacket,
  ClassificationResult,
  ReasonerOptions,
} from "./types";

export class OpenAIReasoner extends Reasoner {
  readonly providerName = "openai" as const;
  readonly defaultModel = "gpt-4o-mini";

  private apiKey?: string;
  private model: string;
  private baseUrl: string;

  constructor(options: ReasonerOptions = {}) {
    super(options);
    this.apiKey =
      options.apiKey ||
      (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined);
    this.model = options.model || this.defaultModel;
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
  }

  async classify(context: ContextPacket): Promise<ClassificationResult> {
    // If no API key is available, run high-precision heuristic fallback
    if (!this.apiKey) {
      return this.runHeuristicClassification(context);
    }

    const systemPrompt = this.buildPrompt(context);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content:
                "Analyze the context and return your classification in the required JSON format.",
            },
          ],
          response_format: { type: "json_object" },
          temperature: this.options.temperature ?? 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenAIReasoner] API request failed (${response.status}): ${errText}`);
        return this.runHeuristicClassification(context);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = this.parseJsonResponse(content);

      return {
        ...parsed,
        model: this.model,
        provider: this.providerName,
        rawOutput: content,
      };
    } catch (err) {
      console.error("[OpenAIReasoner] Unexpected classification error:", err);
      return this.runHeuristicClassification(context);
    }
  }

  async reason(context: ContextPacket, prompt: string): Promise<string> {
    if (!this.apiKey) {
      return `[Mock Reasoner] Analysis for goal "${context.goal.title}": Activity is consistent with active development.`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are Maana's intent explanation assistant. Explain why work is grouped or branched clearly.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return "Reasoning unavailable due to provider error.";
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch {
      return "Reasoning temporarily unavailable.";
    }
  }
}
