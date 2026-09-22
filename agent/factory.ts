import { Reasoner } from "./reasoner";
import { OpenAIReasoner } from "./openai";
import { VeniceReasoner } from "./venice";
import { ReasonerOptions } from "./types";

export class HeuristicReasoner extends Reasoner {
  readonly providerName = "heuristic-mock" as const;
  readonly defaultModel = "heuristic-v1";

  async classify(context: any) {
    return this.runHeuristicClassification(context);
  }

  async reason(context: any, prompt: string) {
    return `[Heuristic Reasoner] Intent maintained for "${context.goal.title}". Verified: ${prompt.slice(0, 50)}`;
  }
}


export function getReasoner(
  preferredProvider?: "openai" | "venice" | "heuristic-mock",
  options: ReasonerOptions = {}
): Reasoner {
  const provider =
    preferredProvider ||
    (typeof process !== "undefined" && process.env?.VENICE_API_KEY
      ? "venice"
      : typeof process !== "undefined" && process.env?.OPENAI_API_KEY
      ? "openai"
      : "heuristic-mock");

  switch (provider) {
    case "venice":
      return new VeniceReasoner(options);
    case "openai":
      return new OpenAIReasoner(options);
    case "heuristic-mock":
    default:
      return new HeuristicReasoner(options);
  }
}
