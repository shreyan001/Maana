import { Reasoner } from "./reasoner";
import {
  ContextPacket,
  ClassificationResult,
  ReasonerOptions,
} from "./types";

export class VeniceReasoner extends Reasoner {
  readonly providerName = "venice" as const;
  readonly defaultModel = "deepseek-r1-671b";

  private apiKey?: string;
  private model: string;
  private baseUrl: string;

  constructor(options: ReasonerOptions = {}) {
    super(options);
    this.apiKey =
      options.apiKey ||
      (typeof process !== "undefined" ? process.env?.VENICE_API_KEY : undefined);
    this.model =
      options.model ||
      (typeof process !== "undefined" ? process.env?.VENICE_MODEL : undefined) ||
      this.defaultModel;
    this.baseUrl =
      options.baseUrl ||
      (typeof process !== "undefined" ? process.env?.VENICE_BASE_URL : undefined) ||
      "https://api.venice.ai/api/v1";
  }

  async classify(context: ContextPacket): Promise<ClassificationResult> {
    if (!this.apiKey) {
      // Clean fallback when running tests or in offline mode
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
              content: "Classify this activity transition. Return JSON only.",
            },
          ],
          temperature: this.options.temperature ?? 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[VeniceReasoner] API request failed (${response.status}): ${errText}`);
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
      console.error("[VeniceReasoner] Unexpected classification error:", err);
      return this.runHeuristicClassification(context);
    }
  }

  async reason(context: ContextPacket, prompt: string): Promise<string> {
    if (!this.apiKey) {
      return `[Venice Reasoner Mock] Verified continuity for "${context.goal.title}". Private reasoning preserved.`;
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
                "You are Maana's private reasoning engine. Explain decisions thoroughly and logically.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return "Deep reasoning failed from private provider.";
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch {
      return "Venice deep reasoning temporarily unavailable.";
    }
  }
}
