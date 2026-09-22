import React, { useState, useEffect } from "react";
import {
  Compass,
  GitBranch,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  ShieldCheck,
  Activity as ActivityIcon,
  Sparkles,
  Zap,
  FastForward,
  Flame,
  BookOpen,
} from "lucide-react";

import AuthModal from "./components/AuthModal";
import WorkGraphTree, { TreeNodeData } from "./components/WorkGraphTree";
import ExecutionTrail from "./components/ExecutionTrail";
import NodeInspector from "./components/NodeInspector";
import TimelineReview, {
  ActivityTimelineItem,
  DecisionLogItem,
} from "./components/TimelineReview";
import ResearchDossier, { ResearchCard } from "./components/ResearchDossier";
import ObsidianView, { ObsidianFile } from "./components/ObsidianView";

interface MockGoal {
  _id: string;
  title: string;
  status: "active" | "paused" | "completed";
  createdAt: number;
}

interface MockTask {
  _id: string;
  title: string;
  status: "todo" | "done";
  priority: "low" | "medium" | "high";
}

interface LiveEventRecord {
  timestamp: number;
  type: string;
  domain?: string;
  url?: string;
  title?: string;
}

interface DecisionRecord {
  classification: string;
  confidence: number;
  reason: string;
  model: string;
  suggestedNode?: string;
  timestamp?: number;
}

const PRESET_GOALS = [
  "Learn data structures well enough to solve interview problems",
  "Debug Convex reactive WebSocket reconnection latency",
  "Design intent-preserving autonomous agent architecture",
];

const INITIAL_NODES: TreeNodeData[] = [
  {
    _id: "node_root",
    title: "Learn data structures well enough to solve interview problems",
    type: "goal",
    status: "done",
    timeSpent: "1h 45m",
    confidence: 1.0,
  },
  {
    _id: "node_b1",
    parentId: "node_root",
    title: "Binary Search & Two Pointers Pattern",
    type: "branch",
    status: "done",
    reason: "Observed LeetCode #704 problem and video breakdown",
    timeSpent: "38m",
    confidence: 0.94,
  },
  {
    _id: "node_d1",
    parentId: "node_b1",
    title: "Bisect Left vs Right Termination Invariants",
    type: "dependency",
    status: "done",
    reason: "Discovered prerequisite while debugging off-by-one boundary bugs",
    timeSpent: "22m",
    confidence: 0.98,
  },
  {
    _id: "node_d2",
    parentId: "node_b1",
    title: "Range Query Search (LeetCode #34)",
    type: "branch",
    status: "active",
    reason: "Applying bisect invariant to locate first and last boundaries",
    timeSpent: "15m",
    confidence: 0.92,
  },
  {
    _id: "node_e1",
    parentId: "node_d2",
    title: "Rotated Sorted Array Pivot Analysis",
    type: "exploration",
    status: "waiting",
    reason: "Anticipated follow-up problem based on leetcode pattern clustering",
    confidence: 0.88,
  },
];

const INITIAL_TIMELINE: ActivityTimelineItem[] = [
  {
    id: "act_01",
    time: "10:15 AM",
    app: "YouTube",
    activityType: "watch",
    title: "Binary Search Boundary Invariants & Off-by-One Traps",
    domain: "youtube.com",
    duration: "28m",
    associatedNode: "Binary Search & Two Pointers Pattern",
  },
  {
    id: "act_02",
    time: "10:45 AM",
    app: "LeetCode",
    activityType: "code",
    title: "LeetCode 704 — Binary Search Implementation",
    domain: "leetcode.com",
    duration: "20m",
    associatedNode: "Binary Search & Two Pointers Pattern",
  },
  {
    id: "act_03",
    time: "11:08 AM",
    app: "GitHub",
    activityType: "read",
    title: "python/cpython Lib/bisect.py Source Invariants",
    domain: "github.com",
    duration: "14m",
    associatedNode: "Bisect Left vs Right Termination Invariants",
  },
  {
    id: "act_04",
    time: "11:24 AM",
    app: "LeetCode",
    activityType: "code",
    title: "LeetCode 34 — Find First and Last Position",
    domain: "leetcode.com",
    duration: "15m",
    associatedNode: "Range Query Search (LeetCode #34)",
  },
  {
    id: "act_05",
    time: "11:41 AM",
    app: "YouTube",
    activityType: "watch",
    title: "Mechanical Keyboard Typing ASMR",
    domain: "youtube.com",
    duration: "4m",
    isDrift: true,
  },
  {
    id: "act_06",
    time: "11:46 AM",
    app: "LeetCode",
    activityType: "code",
    title: "Returned to LeetCode 33 Rotated Array Pivot",
    domain: "leetcode.com",
    duration: "8m",
    associatedNode: "Rotated Sorted Array Pivot Analysis",
  },
];

const INITIAL_DECISIONS: DecisionLogItem[] = [
  {
    id: "dec_01",
    timestamp: "10:44 AM",
    classification: "BRANCH",
    confidence: 0.94,
    model: "OpenAI gpt-4o-mini",
    reason: "Observed transition from lecture to LeetCode #704. Structured branch created.",
    suggestedNode: "Binary Search & Two Pointers Pattern",
  },
  {
    id: "dec_02",
    timestamp: "11:07 AM",
    classification: "DEPENDENCY",
    confidence: 0.98,
    model: "Venice deepseek-r1-671b",
    reason: "Off-by-one errors require bisect left vs right termination invariant. Legitimate prerequisite.",
    suggestedNode: "Bisect Left vs Right Termination Invariants",
  },
  {
    id: "dec_03",
    timestamp: "11:42 AM",
    classification: "DRIFT",
    confidence: 0.89,
    model: "OpenAI gpt-4o-mini",
    reason: "User navigated to entertainment media stream unrelated to current learning graph.",
  },
  {
    id: "dec_04",
    timestamp: "11:46 AM",
    classification: "CONTINUE",
    confidence: 0.96,
    model: "Deterministic Invariant Check",
    reason: "User clicked 'Return to Active Branch' in intervention prompt. Continuity restored.",
    suggestedNode: "Rotated Sorted Array Pivot Analysis",
  },
];

const INITIAL_RESEARCH: ResearchCard[] = [
  {
    _id: "res_01",
    query: "python bisect_left vs bisect_right insertion semantics and off-by-one boundary cases",
    sourceUrls: [
      "https://docs.python.org/3/library/bisect.html",
      "https://github.com/python/cpython/blob/main/Lib/bisect.py",
    ],
    summaries: [
      "bisect_left locates insertion point for x in sorted order. If x already exists, insertion point is before any existing entries.",
      "bisect_right returns insertion point after any existing entries, essential for upper bound range queries.",
    ],
    status: "complete",
    provider: "firecrawl",
    createdAt: Date.now() - 1800000,
    nodeTitle: "Bisect Left vs Right Termination Invariants",
  },
  {
    _id: "res_02",
    query: "binary search inflection pivot in rotated sorted array leetcode 33",
    sourceUrls: [
      "https://leetcode.com/problems/search-in-rotated-sorted-array/solutions",
      "https://en.wikipedia.org/wiki/Binary_search_algorithm",
    ],
    summaries: [
      "Array is partitioned into two sorted halves: left partition where nums[mid] >= nums[left], and right partition where nums[mid] < nums[left].",
    ],
    status: "complete",
    provider: "firecrawl",
    createdAt: Date.now() - 900000,
    nodeTitle: "Rotated Sorted Array Pivot Analysis",
  },
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<"cockpit" | "timeline" | "research" | "obsidian">("cockpit");
  const [goalInput, setGoalInput] = useState("");
  const [userToken, setUserToken] = useState("maana_dev_token_001");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionChoice, setInterventionChoice] = useState<string | null>(null);

  // Active Goal State
  const [activeGoal, setActiveGoal] = useState<MockGoal | null>({
    _id: "goal_01",
    title: "Learn data structures well enough to solve interview problems",
    status: "active",
    createdAt: Date.now() - 3600000,
  });

  // Hierarchical Work Graph Nodes
  const [nodes, setNodes] = useState<TreeNodeData[]>(INITIAL_NODES);
  const [activeNodeId, setActiveNodeId] = useState<string>("node_d2");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Timeline & Decisions
  const [timeline] = useState<ActivityTimelineItem[]>(INITIAL_TIMELINE);
  const [decisions, setDecisions] = useState<DecisionLogItem[]>(INITIAL_DECISIONS);
  const [researchList, setResearchList] = useState<ResearchCard[]>(INITIAL_RESEARCH);

  // State-by-State Execution Pipeline
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(7);
  const [isSimulatingPipeline, setIsSimulatingPipeline] = useState<boolean>(false);
  const [recentDecision, setRecentDecision] = useState<DecisionRecord>({
    classification: "DEPENDENCY",
    confidence: 0.96,
    reason:
      "Off-by-one errors in binary search naturally require bisect left vs right termination invariant. Legitimate learning prerequisite; node added to branch.",
    model: "OpenAI gpt-4o-mini (Structured JSON)",
    suggestedNode: "Bisect Left vs Right Termination Invariants",
    timestamp: Date.now() - 900000,
  });

  // Actionable Tasks
  const [tasks, setTasks] = useState<MockTask[]>([
    {
      _id: "task_01",
      title: "Implement template binary search without boundary bugs",
      status: "done",
      priority: "high",
    },
    {
      _id: "task_02",
      title: "Solve LeetCode #34: Find First and Last Position of Element",
      status: "todo",
      priority: "high",
    },
    {
      _id: "task_03",
      title: "Document bisect left termination invariant in Obsidian",
      status: "todo",
      priority: "medium",
    },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Live Telemetry Event Stream
  const [recentEvents, setRecentEvents] = useState<LiveEventRecord[]>([
    {
      timestamp: Date.now() - 120000,
      type: "YOUTUBE_WATCH",
      domain: "youtube.com",
      title: "Binary Search Boundary Invariants Explained",
      url: "https://youtube.com/watch?v=mock_video_01",
    },
    {
      timestamp: Date.now() - 45000,
      type: "TAB_ACTIVE",
      domain: "leetcode.com",
      title: "LeetCode 34 — Find First and Last Position",
      url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array",
    },
  ]);

  // Poll local dev ingestion endpoint if running in Vite prototype mode
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dev/recent-events");
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            setRecentEvents(data.events.slice(0, 10));
          }
        }
      } catch {
        // local polling fallback
      }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Compute ancestors list for selected node (for the Node Inspector)
  const getAncestors = (nodeId: string): TreeNodeData[] => {
    const nodeMap = new Map(nodes.map((n) => [n._id, n]));
    const ancestors: TreeNodeData[] = [];
    let curr = nodeMap.get(nodeId);
    const visited = new Set<string>();

    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      const parent = nodeMap.get(curr.parentId);
      if (parent) {
        ancestors.unshift(parent);
        curr = parent;
      } else {
        break;
      }
    }
    return ancestors;
  };

  // Generate Obsidian files dynamically
  const generateObsidianFiles = (): ObsidianFile[] => {
    const goalTitle = activeGoal?.title || "Learn data structures";
    const files: ObsidianFile[] = [];

    // 1. Goal file
    const goalFilename = goalTitle.slice(0, 30).replace(/[/\\?%*:|"<>]/g, "-");
    files.push({
      path: `Goals/${goalFilename}.md`,
      filename: `${goalFilename}.md`,
      content: `# ${goalTitle}

Status: active
Created: ${new Date(activeGoal?.createdAt || Date.now()).toISOString()}

## Intent Description
Autonomous intent preservation for: "${goalTitle}"

## Discovered Work Graph & Branches
${nodes.map((n) => `- [[${n.title}]] (${n.type}) — *${n.status}*`).join("\n")}

## Decisions Ledger
${decisions.map((d) => `- [[Decision - ${d.classification}]] (${d.model}): ${d.reason}`).join("\n")}
`,
    });

    // 2. Branch files
    const nodeMap = new Map(nodes.map((n) => [n._id, n]));
    for (const node of nodes) {
      const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
      const parentLink = parent ? `[[${parent.title}]]` : `[[${goalFilename}]]`;
      const research = researchList.filter((r) => r.nodeTitle === node.title);

      files.push({
        path: `Branches/${node.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`,
        filename: `${node.title}.md`,
        content: `# ${node.title}

Parent: ${parentLink}
Type: ${node.type}
Status: ${node.status}

## Why this branch exists
${node.reason || "Autonomous inference generated by Maana cognitive reasoning engine."}

## Agent Confidence
${node.confidence !== undefined ? `${node.confidence}` : "1.0"}

## External Firecrawl Research
${
  research.length > 0
    ? research.map((r) => `- **Query:** "${r.query}"\n  - Sources: ${r.sourceUrls.join(", ")}`).join("\n")
    : "- *No external Firecrawl research needed.*"
}
`,
      });
    }

    // 3. Daily file
    const today = new Date().toISOString().split("T")[0];
    files.push({
      path: `Daily/${today}.md`,
      filename: `${today}.md`,
      content: `# ${today} — Daily Work Session Review

## Active Intent
[[${goalFilename}]]

## Focused Node
→ [[${nodes.find((n) => n._id === activeNodeId)?.title || "None"}]]

## Discovered Branches Today
${nodes.map((n) => `- [[${n.title}]]`).join("\n")}

## Time Breakdown
- Focused: 78m
- Coding: 42m
- Research: 24m
- Drift: 6m

## Decisions Summary
${decisions.slice(0, 4).map((d) => `- **${d.classification}**: ${d.reason}`).join("\n")}
`,
    });

    return files;
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    const newGoalId = "goal_" + Date.now();
    const rootNodeId = "node_" + Date.now();
    setActiveGoal({
      _id: newGoalId,
      title: goalInput.trim(),
      status: "active",
      createdAt: Date.now(),
    });
    setNodes([
      {
        _id: rootNodeId,
        title: goalInput.trim(),
        type: "goal",
        status: "active",
        confidence: 1.0,
        timeSpent: "Just started",
      },
    ]);
    setActiveNodeId(rootNodeId);
    setSelectedNodeId(rootNodeId);
    setGoalInput("");
  };

  const handleSelectPreset = (preset: string) => {
    const newGoalId = "goal_" + Date.now();
    const rootNodeId = "node_" + Date.now();
    setActiveGoal({
      _id: newGoalId,
      title: preset,
      status: "active",
      createdAt: Date.now(),
    });
    setNodes([
      {
        _id: rootNodeId,
        title: preset,
        type: "goal",
        status: "active",
        confidence: 1.0,
        timeSpent: "Just started",
      },
    ]);
    setActiveNodeId(rootNodeId);
    setSelectedNodeId(rootNodeId);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t
      )
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        _id: "task_" + Date.now(),
        title: newTaskTitle.trim(),
        status: "todo",
        priority: "medium",
      },
    ]);
    setNewTaskTitle("");
  };

  // Node Status Update from NodeInspector
  const handleUpdateNodeStatus = (nodeId: string, newStatus: TreeNodeData["status"]) => {
    setNodes((prev) =>
      prev.map((n) => (n._id === nodeId ? { ...n, status: newStatus } : n))
    );
  };

  // Set Focused Node from NodeInspector
  const handleSetFocusedNode = (nodeId: string) => {
    setActiveNodeId(nodeId);
  };

  // Trigger Firecrawl Web Research from NodeInspector or Research tab
  const handleTriggerResearch = (queryOrTitle: string) => {
    const newResearch: ResearchCard = {
      _id: "res_" + Date.now(),
      query: `Documentation and reference sources for "${queryOrTitle}"`,
      sourceUrls: [
        `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(queryOrTitle)}`,
        `https://en.wikipedia.org/wiki/${encodeURIComponent(queryOrTitle.replace(/\s+/g, "_"))}`,
      ],
      summaries: [
        `Extracted primary reference documentation for ${queryOrTitle}. Synthesized architectural and implementation invariants into knowledge store.`,
      ],
      status: "complete",
      provider: "firecrawl",
      createdAt: Date.now(),
      nodeTitle: queryOrTitle,
    };
    setResearchList((prev) => [newResearch, ...prev]);
    setCurrentTab("research");
  };

  // State-by-State Execution Runner (Simulates 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7)
  const runStatePipeline = () => {
    if (isSimulatingPipeline) return;
    setIsSimulatingPipeline(true);
    setCurrentStepIndex(1);

    const mockCandidates = [
      {
        event: {
          timestamp: Date.now(),
          type: "TAB_ACTIVE",
          domain: "leetcode.com",
          title: "LeetCode 33 — Search in Rotated Sorted Array",
          url: "https://leetcode.com/problems/search-in-rotated-sorted-array",
        },
        nodeTitle: "Pivot Inflection Point Identification",
        type: "dependency" as const,
        reason:
          "Encountered rotated array search; requires locating inflection pivot index before binary partition.",
        classification: "DEPENDENCY",
        confidence: 0.95,
      },
      {
        event: {
          timestamp: Date.now(),
          type: "GITHUB_DOC",
          domain: "github.com",
          title: "Bisect Module Invariants Documentation",
          url: "https://github.com/python/cpython/blob/main/Lib/bisect.py",
        },
        nodeTitle: "Python bisect_left Insertion Semantics",
        type: "branch" as const,
        reason:
          "Observed study of stdlib bisect source to understand left-vs-right insertion indices.",
        classification: "BRANCH",
        confidence: 0.93,
      },
      {
        event: {
          timestamp: Date.now(),
          type: "YOUTUBE_WATCH",
          domain: "youtube.com",
          title: "Two Pointers Fast & Slow Convergence Pattern",
          url: "https://youtube.com/watch?v=fast_slow_01",
        },
        nodeTitle: "Floyd Cycle Detection & Array Duplicates",
        type: "exploration" as const,
        reason:
          "Watched video connecting two-pointer binary search with cycle detection.",
        classification: "EXPLORATION",
        confidence: 0.89,
      },
    ];

    const candidate = mockCandidates[Math.floor(Math.random() * mockCandidates.length)];

    // State 1: Observation
    setRecentEvents((prev) => [candidate.event, ...prev.slice(0, 9)]);

    const stepDelays = [600, 1200, 1800, 2400, 3000, 3600];

    // State 2: Aggregation
    setTimeout(() => setCurrentStepIndex(2), stepDelays[0]);

    // State 3: Transition Trigger
    setTimeout(() => setCurrentStepIndex(3), stepDelays[1]);

    // State 4: Context Snapshot
    setTimeout(() => setCurrentStepIndex(4), stepDelays[2]);

    // State 5: Cognitive Reasoning
    setTimeout(() => {
      setCurrentStepIndex(5);
      const dec: DecisionRecord = {
        classification: candidate.classification,
        confidence: candidate.confidence,
        reason: candidate.reason,
        model: "OpenAI gpt-4o-mini (Structured JSON)",
        suggestedNode: candidate.nodeTitle,
        timestamp: Date.now(),
      };
      setRecentDecision(dec);
      setDecisions((prev) => [
        {
          id: "dec_" + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          classification: candidate.classification,
          confidence: candidate.confidence,
          model: "OpenAI gpt-4o-mini",
          reason: candidate.reason,
          suggestedNode: candidate.nodeTitle,
        },
        ...prev,
      ]);
    }, stepDelays[3]);

    // State 6: Graph Mutation (Add node to tree under active node)
    setTimeout(() => {
      setCurrentStepIndex(6);
      const newNodeId = "node_" + Date.now();
      const parentId = activeNodeId || "node_root";

      const newNode: TreeNodeData = {
        _id: newNodeId,
        parentId,
        title: candidate.nodeTitle,
        type: candidate.type,
        status: "active",
        reason: candidate.reason,
        confidence: candidate.confidence,
        timeSpent: "Just added",
      };

      setNodes((prev) => [...prev, newNode]);
      setActiveNodeId(newNodeId);
      setSelectedNodeId(newNodeId);
    }, stepDelays[4]);

    // State 7: User Continuity Completed
    setTimeout(() => {
      setCurrentStepIndex(7);
      setIsSimulatingPipeline(false);
    }, stepDelays[5]);
  };

  // Manual Step Forward
  const handleStepForward = () => {
    setCurrentStepIndex((prev) => (prev < 7 ? prev + 1 : 1));
  };

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n._id === selectedNodeId) || null
    : null;

  return (
    <div className="min-h-screen bg-[#070709] text-[#fafafa] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentToken={userToken}
        onUpdateToken={setUserToken}
      />

      {/* Node Inspector Drawer */}
      <NodeInspector
        node={selectedNode}
        ancestors={selectedNode ? getAncestors(selectedNode._id) : []}
        onClose={() => setSelectedNodeId(null)}
        onUpdateStatus={handleUpdateNodeStatus}
        onSetFocused={handleSetFocusedNode}
        onTriggerResearch={handleTriggerResearch}
      />

      {/* Top Ambient Light Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[160px] bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                MAANA
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shadow-sm">
                v0.5.0-vertical-slice
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Fast Clock Ready
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Autonomous Intent-Preserving Execution Agent
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="hidden md:flex items-center bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-1 text-xs font-mono">
          <button
            onClick={() => setCurrentTab("cockpit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === "cockpit"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cockpit</span>
          </button>
          <button
            onClick={() => setCurrentTab("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === "timeline"
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline & Review</span>
          </button>
          <button
            onClick={() => setCurrentTab("research")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === "research"
                ? "bg-orange-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Web Research</span>
          </button>
          <button
            onClick={() => setCurrentTab("obsidian")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === "obsidian"
                ? "bg-purple-600 text-white font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Obsidian Vault</span>
          </button>
        </nav>

        <div className="flex items-center gap-3 text-xs">
          {/* Step Pipeline Controls */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={runStatePipeline}
              disabled={isSimulatingPipeline}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                isSimulatingPipeline
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-indigo-950 hover:bg-indigo-900 text-indigo-200"
              }`}
              title="Run 7-stage state pipeline automatically"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>{isSimulatingPipeline ? `State ${currentStepIndex}/7...` : "Run Pipeline"}</span>
            </button>
            <button
              onClick={handleStepForward}
              className="px-2.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition text-xs font-mono"
              title="Manually advance to next state"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Extension Status Button */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition cursor-pointer shadow-sm text-xs font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Extension Connect</span>
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {/* TAB 1: COCKPIT & WORK GRAPH */}
        {currentTab === "cockpit" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Goal, Discovered Work Graph Tree, Execution Trail & Tasks */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Goal Surface */}
              <section className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-zinc-800/90 shadow-2xl backdrop-blur-md">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    Active Intent
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
                      Continuity Locked
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">ID: #goal_01</span>
                  </div>
                </div>

                {activeGoal ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-snug">
                      "{activeGoal.title}"
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Observing Work Automatically
                      </span>
                      <span>•</span>
                      <span>{nodes.length} Discovered Nodes in Hierarchy</span>
                      <span>•</span>
                      <button
                        onClick={() => setActiveGoal(null)}
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer transition"
                      >
                        Change Objective
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <form onSubmit={handleCreateGoal} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter one high-level sentence (e.g. Learn data structures well enough to solve interview problems)..."
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" /> Set Intent
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-zinc-500 font-mono">Try preset:</span>
                      {PRESET_GOALS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectPreset(preset)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition cursor-pointer"
                        >
                          {preset.slice(0, 35)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Autonomous Hierarchical Work Graph Tree */}
              <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      Autonomous Work Graph Hierarchy & Discovered Branches
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                      {nodes.length} Nodes in Tree
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                      Click any node to inspect
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  The tree is dynamically generated from real activities and cognitive inferences. Branches sprout when sub-problems are detected, maintaining intent without forcing manual organization.
                </p>

                <div className="mt-3">
                  <WorkGraphTree
                    nodes={nodes}
                    activeNodeId={activeNodeId}
                    selectedNodeId={selectedNodeId || undefined}
                    onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                  />
                </div>
              </section>

              {/* State-by-State Intent Execution Trail */}
              <section>
                <ExecutionTrail
                  currentStepIndex={currentStepIndex}
                  recentDecision={recentDecision}
                  latestActivityTitle={recentEvents[0]?.title || "LeetCode 34 — Range Query"}
                  goalTitle={activeGoal?.title || "Learn data structures"}
                />
              </section>

              {/* Actionable Contextual Tasks */}
              <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      Current Actionable Tasks
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    {tasks.filter((t) => t.status === "done").length}/{tasks.length} Completed
                  </span>
                </div>

                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => handleToggleTask(task._id)}
                      className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                            task.status === "done"
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "border-zinc-700 group-hover:border-zinc-500 bg-zinc-900"
                          }`}
                        >
                          {task.status === "done" && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span
                          className={`text-sm ${
                            task.status === "done" ? "line-through text-zinc-500" : "text-zinc-200"
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                          task.priority === "high"
                            ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddTask} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add contextual action item..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Add Task
                  </button>
                </form>
              </section>
            </div>

            {/* Right 1 Col: Live Telemetry, Focus Rollups & Drift Engine */}
            <div className="space-y-6">
              {/* Live Sensor Activity Card */}
              <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      Live Sensor Telemetry
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Observing
                  </span>
                </div>

                {recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-800/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-indigo-300 font-semibold uppercase">
                          {recentEvents[0].domain || "Active Tab"}
                        </span>
                        <span className="text-zinc-400 text-[11px]">Just now</span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">
                        {recentEvents[0].title || "Unknown Page Title"}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono truncate">
                        {recentEvents[0].url || "about:blank"}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                        Recent Event Stream ({recentEvents.length})
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {recentEvents.slice(1, 5).map((ev, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-zinc-300 text-[11px]">
                              {ev.title || ev.domain}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                              {ev.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-500 font-mono text-center">
                    Waiting for Chrome extension observation events...
                  </div>
                )}
              </section>

              {/* Daily Session Rollup */}
              <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      Today's Session Rollup
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">Fast Clock</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Focus Time</span>
                    <p className="text-xl font-mono font-bold text-emerald-400">1h 45m</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Drift Score</span>
                    <p className="text-xl font-mono font-bold text-indigo-400">
                      0.14 <span className="text-xs text-emerald-400">(Focused)</span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Tree Nodes</span>
                    <p className="text-xl font-mono font-bold text-cyan-400">{nodes.length} Discovered</p>
                  </div>
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                    <span className="text-[11px] text-zinc-400 font-mono">Interventions</span>
                    <p className="text-xl font-mono font-bold text-neutral-300">0 Needed</p>
                  </div>
                </div>
              </section>

              {/* Drift & Intervention Simulation Channel */}
              <section className="rounded-2xl p-6 bg-gradient-to-br from-amber-950/20 to-zinc-900/60 border border-amber-800/50 shadow-xl backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-mono uppercase font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Intervention State Channel
                  </div>
                  <button
                    onClick={() => setShowIntervention(!showIntervention)}
                    className="text-[10px] font-mono text-amber-300 bg-amber-900/40 hover:bg-amber-900/60 px-2.5 py-1 rounded border border-amber-700/60 cursor-pointer transition"
                  >
                    {showIntervention ? "Dismiss Prompt" : "Simulate Drift Trigger"}
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  When sustained divergence occurs (&gt;4 min, score &ge; 0.75), Maana intervenes with non-punitive options:
                </p>

                {showIntervention ? (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-3 animate-fadeIn">
                    <div className="text-xs font-bold text-amber-200">
                      Divergence detected: You've spent 8 minutes on off-topic media.
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <button
                        onClick={() => {
                          setInterventionChoice("Returned to active branch.");
                          setShowIntervention(false);
                        }}
                        className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left text-white cursor-pointer transition"
                      >
                        1. Return to active node
                      </button>
                      <button
                        onClick={() => {
                          setInterventionChoice("Break started for 15 minutes.");
                          setShowIntervention(false);
                        }}
                        className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left text-white cursor-pointer transition"
                      >
                        2. Take a planned break
                      </button>
                      <button
                        onClick={() => {
                          setInterventionChoice("Added exploration node to work graph.");
                          setShowIntervention(false);
                        }}
                        className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left text-white cursor-pointer transition"
                      >
                        3. Keep exploring (branch)
                      </button>
                      <button
                        onClick={() => {
                          setInterventionChoice("Pivoted to new objective.");
                          setShowIntervention(false);
                        }}
                        className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left text-white cursor-pointer transition"
                      >
                        4. New objective
                      </button>
                    </div>
                  </div>
                ) : interventionChoice ? (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs font-mono text-emerald-300">
                    Action taken: {interventionChoice}
                  </div>
                ) : null}
              </section>

              {/* Inspectable Decision Trace */}
              <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                      Cognitive Reasoning Trace
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    OpenAI + Venice
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Classification:</span>
                    <span className="text-emerald-400 font-bold uppercase">
                      {recentDecision.classification}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Confidence:</span>
                    <span className="text-zinc-200">
                      {Math.round(recentDecision.confidence * 100)}% (High)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Reasoning Model:</span>
                    <span className="text-zinc-400">{recentDecision.model}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed font-sans">
                    "{recentDecision.reason}"
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE & DAILY REVIEW */}
        {currentTab === "timeline" && (
          <TimelineReview
            timeline={timeline}
            decisions={decisions}
            focusMinutes={78}
            researchMinutes={24}
            codingMinutes={42}
            driftMinutes={6}
            goalTitle={activeGoal?.title || "Learn data structures"}
          />
        )}

        {/* TAB 3: WEBRESEARCH (FIRECRAWL) */}
        {currentTab === "research" && (
          <ResearchDossier
            researchList={researchList}
            onTriggerResearch={handleTriggerResearch}
            goalTitle={activeGoal?.title || "Learn data structures"}
          />
        )}

        {/* TAB 4: OBSIDIAN VAULT PROJECTION */}
        {currentTab === "obsidian" && (
          <ObsidianView
            files={generateObsidianFiles()}
            goalTitle={activeGoal?.title || "Learn data structures"}
          />
        )}
      </main>
    </div>
  );
}
