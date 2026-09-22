import React, { useState } from "react";
import {
  Radio,
  Layers,
  CheckCircle,
  Clock,
  Database,
  Cpu,
  Eye,
  GitBranch,
} from "lucide-react";

export interface TrailStep {
  stateNumber: number;
  name: string;
  subtext: string;
  icon: React.ElementType;
  badge: string;
  detail: string;
  status: "completed" | "in_progress" | "waiting";
}

interface ExecutionTrailProps {
  currentStepIndex?: number;
  recentDecision?: {
    classification: string;
    confidence: number;
    reason: string;
    model: string;
    suggestedNode?: string;
    timestamp?: number;
  };
  latestActivityTitle?: string;
  goalTitle?: string;
}

export default function ExecutionTrail({
  currentStepIndex = 7,
  recentDecision,
  latestActivityTitle = "Binary Search Boundary Invariants",
  goalTitle = "Learn data structures well enough to solve interview problems",
}: ExecutionTrailProps) {
  const [selectedStep, setSelectedStep] = useState<number>(5);

  const steps: TrailStep[] = [
    {
      stateNumber: 1,
      name: "Raw Observation",
      subtext: "Chrome MV3 Extension",
      icon: Eye,
      badge: "Fast Clock",
      detail: `Captured tab navigation event: "${latestActivityTitle}" on leetcode.com. Sanitized URL tokens.`,
      status: currentStepIndex >= 1 ? "completed" : "waiting",
    },
    {
      stateNumber: 2,
      name: "Deterministic Aggregation",
      subtext: "Convex Ingestion Engine",
      icon: Layers,
      badge: "Zero LLM",
      detail: `Sessionized into continuous activity (type: 'code', app: 'LeetCode'). Accumulated 14m focus time into dailySessions.`,
      status: currentStepIndex >= 2 ? "completed" : "waiting",
    },
    {
      stateNumber: 3,
      name: "Transition Trigger",
      subtext: "Deterministic Boundary Check",
      icon: Clock,
      badge: "Tripwire",
      detail: `Detected topic shift: user navigated from conceptual lecture to boundary bug debugging on documentation.`,
      status: currentStepIndex >= 3 ? "completed" : "waiting",
    },
    {
      stateNumber: 4,
      name: "Context Snapshot",
      subtext: "Ancestral Trail Assembly",
      icon: Database,
      badge: "Bounded Packet",
      detail: `Assembled Goal: "${goalTitle}" + 3 recent ancestral nodes + 2 previous bounded activities.`,
      status: currentStepIndex >= 4 ? "completed" : "waiting",
    },
    {
      stateNumber: 5,
      name: "Cognitive Reasoning",
      subtext: recentDecision?.model || "OpenAI / Venice",
      icon: Cpu,
      badge: recentDecision?.classification?.toUpperCase() || "DEPENDENCY",
      detail:
        recentDecision?.reason ||
        "Discovered bisect left boundary invariant required for binary search.",
      status: currentStepIndex >= 5 ? "completed" : "waiting",
    },
    {
      stateNumber: 6,
      name: "Graph Mutation",
      subtext: "ACID Transaction",
      icon: GitBranch,
      badge: "Discovered Node",
      detail: `Spawned node "${recentDecision?.suggestedNode || "Bisect Boundary Invariants"}" and linked 'depends_on' edge.`,
      status: currentStepIndex >= 6 ? "completed" : "waiting",
    },
    {
      stateNumber: 7,
      name: "User Continuity",
      subtext: "Reactive Cockpit Push",
      icon: CheckCircle,
      badge: "Realtime Sync",
      detail: `Advanced active focus pointer. Updated action items and live telemetry across WebSocket channels.`,
      status: currentStepIndex >= 7 ? "completed" : "waiting",
    },
  ];

  return (
    <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              State-by-State Intent Execution Trail
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
            Full 7-stage lifecycle of how Maana discovers branches and maintains continuity
          </p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
          State 7/7 Invariant Active
        </span>
      </div>

      {/* Interactive Horizontal Lifecycle Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isSelected = selectedStep === step.stateNumber;
          return (
            <button
              key={step.stateNumber}
              onClick={() => setSelectedStep(step.stateNumber)}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 font-semibold">
                  0{step.stateNumber}
                </span>
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-indigo-400" : "text-zinc-400"
                  }`}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-white tracking-tight leading-tight">
                  {step.name}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                  {step.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected State Inspector Card */}
      {selectedStep && (
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-indigo-900/50 space-y-2 font-mono text-xs animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400 font-bold uppercase">
              State {selectedStep}: {steps[selectedStep - 1].name}
            </span>
            <span className="text-zinc-500 text-[11px]">
              {steps[selectedStep - 1].subtext}
            </span>
          </div>
          <p className="text-zinc-300 font-sans text-xs leading-relaxed">
            {steps[selectedStep - 1].detail}
          </p>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              Invariant Step:{" "}
              <strong className="text-white">
                {selectedStep < 7
                  ? `${steps[selectedStep - 1].name} → ${steps[selectedStep].name}`
                  : "Continuous Cycle Completed"}
              </strong>
            </span>
            <span className="text-emerald-400">✓ Verified & Inspectable</span>
          </div>
        </div>
      )}
    </div>
  );
}
