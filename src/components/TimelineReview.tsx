import {
  Clock,
  Sparkles,
  Layers,
  Code,
  Video,
  BookOpen,
  Search,
} from "lucide-react";

export interface ActivityTimelineItem {
  id: string;
  time: string;
  app: string;
  activityType: string;
  title: string;
  domain?: string;
  duration: string;
  associatedNode?: string;
  isDrift?: boolean;
}

export interface DecisionLogItem {
  id: string;
  timestamp: string;
  classification: string;
  confidence: number;
  model: string;
  reason: string;
  suggestedNode?: string;
}

interface TimelineReviewProps {
  timeline: ActivityTimelineItem[];
  decisions: DecisionLogItem[];
  focusMinutes: number;
  researchMinutes: number;
  codingMinutes: number;
  driftMinutes: number;
  goalTitle: string;
}

export default function TimelineReview({
  timeline,
  decisions,
  focusMinutes = 78,
  researchMinutes = 24,
  codingMinutes = 42,
  driftMinutes = 6,
  goalTitle,
}: TimelineReviewProps) {
  const totalMinutes = focusMinutes + researchMinutes + codingMinutes + driftMinutes;

  const getActivityIcon = (type: string, app: string) => {
    if (app.toLowerCase().includes("youtube")) return Video;
    if (type === "code" || app.toLowerCase().includes("leetcode") || app.toLowerCase().includes("github"))
      return Code;
    if (type === "search") return Search;
    return BookOpen;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Daily Session Meters */}
      <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Daily Execution Review & Timeline
              </h2>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Active Intent: <span className="text-indigo-300 font-semibold">"{goalTitle}"</span>
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 font-medium">
            Session Continuity Preserved
          </span>
        </div>

        {/* Time Allocation Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Total Measured Work: {totalMinutes}m</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">● Focus ({focusMinutes}m)</span>
              <span className="text-cyan-400">● Coding ({codingMinutes}m)</span>
              <span className="text-purple-400">● Research ({researchMinutes}m)</span>
              <span className="text-amber-400">● Drift ({driftMinutes}m)</span>
            </div>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-3 rounded-full bg-zinc-950 overflow-hidden flex border border-zinc-800">
            <div
              style={{ width: `${(focusMinutes / totalMinutes) * 100}%` }}
              className="bg-emerald-500 h-full"
              title={`Focus Time: ${focusMinutes}m`}
            />
            <div
              style={{ width: `${(codingMinutes / totalMinutes) * 100}%` }}
              className="bg-cyan-500 h-full"
              title={`Coding: ${codingMinutes}m`}
            />
            <div
              style={{ width: `${(researchMinutes / totalMinutes) * 100}%` }}
              className="bg-purple-500 h-full"
              title={`Research: ${researchMinutes}m`}
            />
            <div
              style={{ width: `${(driftMinutes / totalMinutes) * 100}%` }}
              className="bg-amber-500 h-full"
              title={`Drift: ${driftMinutes}m`}
            />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-mono text-zinc-500">Autonomous Decisions</span>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{decisions.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-mono text-zinc-500">Timeline Activities</span>
            <p className="text-xl font-bold font-mono text-indigo-300 mt-0.5">{timeline.length}</p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-mono text-zinc-500">Drift Percentage</span>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {Math.round((driftMinutes / totalMinutes) * 100)}% <span className="text-xs text-zinc-500">(Low)</span>
            </p>
          </div>
          <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <span className="text-[11px] font-mono text-zinc-500">Clerical Work Saved</span>
            <p className="text-xl font-bold font-mono text-cyan-400 mt-0.5">100%</p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Chronological Timeline on Left, Decision Audit Ledger on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chronological Activity Feed */}
        <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Chronological Activity Stream
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Today</span>
          </div>

          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
            {timeline.map((item) => {
              const Icon = getActivityIcon(item.activityType, item.app);
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      item.isDrift
                        ? "bg-amber-950 border-amber-500"
                        : "bg-zinc-900 border-indigo-500 group-hover:scale-110 transition"
                    }`}
                  >
                    <span
                      className={`w-1 h-1 rounded-full ${
                        item.isDrift ? "bg-amber-400" : "bg-indigo-400"
                      }`}
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold text-white tracking-tight">{item.title}</span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500">{item.time}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-0.5">
                      <span>
                        {item.app} • <strong>{item.duration}</strong>
                      </span>
                      {item.associatedNode && (
                        <span className="text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40 truncate max-w-[160px]">
                          ↳ {item.associatedNode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Autonomous Decision Trace Ledger */}
        <div className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Cognitive Decision Ledger
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Inspectable AI</span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-indigo-900/60 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border uppercase ${
                      dec.classification === "DEPENDENCY"
                        ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                        : dec.classification === "BRANCH" || dec.classification === "PARALLEL_BRANCH"
                        ? "bg-cyan-950/60 border-cyan-800/60 text-cyan-300"
                        : dec.classification === "DRIFT"
                        ? "bg-amber-950/60 border-amber-800/60 text-amber-300"
                        : "bg-indigo-950/60 border-indigo-800/60 text-indigo-300"
                    }`}
                  >
                    {dec.classification}
                  </span>

                  <span className="font-mono text-[11px] text-zinc-400">
                    Confidence: <strong className="text-white">{Math.round(dec.confidence * 100)}%</strong>
                  </span>
                </div>

                <p className="text-zinc-300 leading-relaxed font-sans">{dec.reason}</p>

                <div className="pt-1.5 border-t border-zinc-800/70 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                  <span>Model: {dec.model}</span>
                  {dec.suggestedNode && (
                    <span className="text-zinc-400 truncate max-w-[160px]">
                      Node: <strong>{dec.suggestedNode}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
