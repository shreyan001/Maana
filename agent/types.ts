// Maana Cognitive Context & Reasoner Types (Section 17, 42, 44 of Build Guide)

export type ActivityClassification =
  | "continue"
  | "dependency"
  | "parallel_branch"
  | "new_objective"
  | "drift"
  | "ambiguous";

export interface ActivitySummary {
  app?: string;
  type: string;
  domain?: string;
  title: string;
  url?: string;
  durationSeconds?: number;
  timestamp?: number;
}

export interface ContextPacket {
  goal: {
    id?: string;
    title: string;
    description?: string;
  };
  currentPath: string[]; // e.g. ["Data Structures", "Binary Search"]
  previousActivity?: ActivitySummary;
  currentActivity: ActivitySummary;
  recentActivities: ActivitySummary[];
}

export interface ClassificationResult {
  classification: ActivityClassification;
  confidence: number;
  reason: string;
  suggestedNode?: string;
  suggestedType?: "branch" | "dependency" | "exploration" | "objective";
  driftScore?: number;
  model: string;
  provider: "openai" | "venice" | "heuristic-mock";
  rawOutput?: string;
}

export interface ReasonerOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
}
