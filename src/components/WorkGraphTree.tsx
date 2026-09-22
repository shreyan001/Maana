import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Lock,
  Pause,
} from "lucide-react";

export interface TreeNodeData {
  _id: string;
  title: string;
  type: "goal" | "branch" | "dependency" | "exploration" | "objective";
  status: "waiting" | "active" | "paused" | "blocked" | "done" | "abandoned";
  parentId?: string;
  reason?: string;
  confidence?: number;
  timeSpent?: string;
  startedAt?: number;
}

interface WorkGraphTreeProps {
  nodes: TreeNodeData[];
  activeNodeId?: string;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}

export default function WorkGraphTree({
  nodes,
  activeNodeId,
  selectedNodeId,
  onSelectNode,
}: WorkGraphTreeProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree from flat nodes
  const nodeMap = new Map<string, TreeNodeData>();
  const childrenMap = new Map<string, TreeNodeData[]>();

  nodes.forEach((n) => {
    nodeMap.set(n._id, n);
    childrenMap.set(n._id, []);
  });

  const roots: TreeNodeData[] = [];

  nodes.forEach((n) => {
    if (n.parentId && nodeMap.has(n.parentId)) {
      childrenMap.get(n.parentId)?.push(n);
    } else {
      roots.push(n);
    }
  });

  const renderNode = (node: TreeNodeData, depth: number = 0) => {
    const isCurrent = node._id === activeNodeId;
    const isSelected = node._id === selectedNodeId;
    const children = childrenMap.get(node._id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedNodes[node._id];

    return (
      <div key={node._id} className="relative select-none">
        {/* Branch connector line */}
        {depth > 0 && (
          <div
            className="absolute -left-5 top-5 w-4 h-px bg-zinc-700/80"
            style={{ left: `-${20}px` }}
          />
        )}

        <div
          onClick={() => onSelectNode && onSelectNode(node._id)}
          className={`group flex items-start gap-2.5 p-3.5 my-1.5 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-950/40"
              : isCurrent
              ? "bg-zinc-900/90 border-indigo-700/80 shadow-sm"
              : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40"
          }`}
        >
          {/* Collapse/Expand chevron */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleCollapse(node._id, e)}
              className="p-0.5 mt-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
            </div>
          )}

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-medium tracking-tight text-sm truncate ${
                  isCurrent ? "text-white font-semibold" : "text-zinc-200"
                }`}
              >
                {node.title}
              </span>

              {/* Node Type Pill */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase font-medium ${
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

              {/* Status Badge */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  node.status === "active"
                    ? "bg-indigo-950/80 border-indigo-700/80 text-indigo-300 font-semibold"
                    : node.status === "done"
                    ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400"
                    : node.status === "blocked"
                    ? "bg-rose-950/50 border-rose-800/50 text-rose-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                {node.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                )}
                {node.status === "done" && <CheckCircle2 className="w-3 h-3" />}
                {node.status === "blocked" && <Lock className="w-3 h-3" />}
                {node.status === "paused" && <Pause className="w-3 h-3" />}
                {node.status}
              </span>
            </div>

            {/* Inferred Rationale */}
            {node.reason && (
              <div className="mt-1.5 text-xs text-zinc-400 font-mono flex items-start gap-1.5 bg-zinc-900/50 p-1.5 rounded border border-zinc-800/50">
                <Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                <span className="truncate">{node.reason}</span>
              </div>
            )}

            {/* Meta Row: Confidence & Time Spent */}
            <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-mono">
              {node.confidence !== undefined && (
                <span>
                  Confidence:{" "}
                  <strong className="text-zinc-300">
                    {Math.round(node.confidence * 100)}%
                  </strong>
                </span>
              )}
              {node.timeSpent && (
                <span>
                  ⏱ Time:{" "}
                  <strong className="text-zinc-300">{node.timeSpent}</strong>
                </span>
              )}
              {isCurrent && (
                <span className="text-indigo-400 font-semibold">
                  • Currently Focused Node
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recursive Children Sub-tree */}
        {hasChildren && !isCollapsed && (
          <div className="pl-6 border-l border-zinc-800/80 ml-4 relative space-y-1">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {roots.length > 0 ? (
        roots.map((root) => renderNode(root, 0))
      ) : (
        <div className="p-6 text-center text-zinc-500 text-xs font-mono">
          No work graph nodes created yet. Enter a goal to begin.
        </div>
      )}
    </div>
  );
}
