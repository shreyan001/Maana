import React from "react";
import {
  X,
  Sparkles,
  GitBranch,
  Clock,
  CheckCircle2,
  ChevronRight,
  Focus,
} from "lucide-react";
import { TreeNodeData } from "./WorkGraphTree";

interface NodeInspectorProps {
  node: TreeNodeData | null;
  ancestors: TreeNodeData[];
  onClose: () => void;
  onUpdateStatus?: (nodeId: string, status: TreeNodeData["status"]) => void;
  onSetFocused?: (nodeId: string) => void;
}

export default function NodeInspector({
  node,
  ancestors,
  onClose,
  onUpdateStatus,
  onSetFocused,
}: NodeInspectorProps) {
  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/95 border-l border-zinc-800/80 shadow-2xl backdrop-blur-xl p-6 z-50 flex flex-col space-y-6 overflow-y-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-white text-base tracking-tight">
            Node Inspector
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Trail Breadcrumb */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
          Ancestral Path Trail
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
          {ancestors.map((anc) => (
            <React.Fragment key={anc._id}>
              <span className="truncate max-w-[120px] text-zinc-300">
                {anc.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            </React.Fragment>
          ))}
          <span className="font-bold text-white truncate max-w-[140px]">
            {node.title}
          </span>
        </div>
      </div>

      {/* Main Node Card */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md border uppercase font-bold ${
              node.type === "goal"
                ? "bg-purple-950/60 border-purple-800/60 text-purple-300"
                : node.type === "branch"
                ? "bg-cyan-950/60 border-cyan-800/60 text-cyan-300"
                : node.type === "dependency"
                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                : "bg-amber-950/60 border-amber-800/60 text-amber-300"
            }`}
          >
            {node.type}
          </span>
          <span className="text-xs font-mono text-zinc-400">
            Status: <strong className="text-white capitalize">{node.status}</strong>
          </span>
        </div>

        <h4 className="text-lg font-bold text-white tracking-tight">
          {node.title}
        </h4>

        {node.timeSpent && (
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Cumulative Dwell Time:{" "}
              <strong className="text-white">{node.timeSpent}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Inferred Reason & Model Evidence */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Autonomous Inference Rationale
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 text-xs">
          <p className="text-zinc-300 leading-relaxed font-sans">
            {node.reason ||
              "Discovered autonomously when user encountered off-by-one errors while debugging binary search loops."}
          </p>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400 font-mono text-[11px]">
            <span>Reasoner Confidence</span>
            <span className="text-emerald-400 font-bold">
              {node.confidence !== undefined
                ? `${Math.round(node.confidence * 100)}%`
                : "96%"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
          Actions
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            onClick={() => onSetFocused && onSetFocused(node._id)}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5" />
            <span>Set Focused</span>
          </button>
          <button
            onClick={() =>
              onUpdateStatus &&
              onUpdateStatus(
                node._id,
                node.status === "done" ? "active" : "done"
              )
            }
            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border transition cursor-pointer ${
              node.status === "done"
                ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{node.status === "done" ? "Completed ✓" : "Mark Done"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
