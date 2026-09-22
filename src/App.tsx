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
} from "lucide-react";


import AuthModal from "./components/AuthModal";

interface MockGoal {
  _id: string;
  title: string;
  status: "active" | "paused" | "completed";
  createdAt: number;
}

interface MockNode {
  _id: string;
  title: string;
  type: "goal" | "branch" | "dependency" | "exploration";
  status: "active" | "waiting" | "done";
  reason?: string;
  confidence?: number;
  timeSpent?: string;
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

const PRESET_GOALS = [
  "Learn data structures well enough to solve interview problems",
  "Debug Convex reactive WebSocket reconnection latency",
  "Design intent-preserving autonomous agent architecture",
];

export default function App() {
  const [goalInput, setGoalInput] = useState("");
  const [userToken, setUserToken] = useState("maana_dev_token_001");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionChoice, setInterventionChoice] = useState<string | null>(null);

  const [activeGoal, setActiveGoal] = useState<MockGoal | null>({
    _id: "goal_01",
    title: "Learn data structures well enough to solve interview problems",
    status: "active",
    createdAt: Date.now() - 3600000,
  });

  const [path, setPath] = useState<MockNode[]>([
    {
      _id: "node_01",
      title: "Learn data structures well enough to solve interview problems",
      type: "goal",
      status: "done",
      timeSpent: "45m",
      confidence: 1.0,
    },
    {
      _id: "node_02",
      title: "Binary Search & Two Pointers Pattern",
      type: "branch",
      status: "done",
      reason: "Observed LeetCode #704 problem and video breakdown",
      timeSpent: "28m",
      confidence: 0.94,
    },
    {
      _id: "node_03",
      title: "Bisect Left vs Right Edge Invariants",
      type: "dependency",
      status: "active",
      reason: "Discovered prerequisite while debugging off-by-one boundary bugs",
      timeSpent: "14m",
      confidence: 0.96,
    },
  ]);

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

  // Live telemetry state
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
      title: "LeetCode 704 — Binary Search",
      url: "https://leetcode.com/problems/binary-search",
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

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setActiveGoal({
      _id: "goal_" + Date.now(),
      title: goalInput.trim(),
      status: "active",
      createdAt: Date.now(),
    });
    setPath([
      {
        _id: "node_" + Date.now(),
        title: goalInput.trim(),
        type: "goal",
        status: "active",
        confidence: 1.0,
        timeSpent: "Just started",
      },
    ]);
    setGoalInput("");
  };

  const handleSelectPreset = (preset: string) => {
    setActiveGoal({
      _id: "goal_" + Date.now(),
      title: preset,
      status: "active",
      createdAt: Date.now(),
    });
    setPath([
      {
        _id: "node_" + Date.now(),
        title: preset,
        type: "goal",
        status: "active",
        confidence: 1.0,
        timeSpent: "Just started",
      },
    ]);
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

  const handleSimulateEvent = () => {
    const mockEvents: LiveEventRecord[] = [
      {
        timestamp: Date.now(),
        type: "TAB_ACTIVE",
        domain: "github.com",
        title: "shreyan001/Maana — Intent-Preserving Agent",
        url: "https://github.com/shreyan001/Maana",
      },
      {
        timestamp: Date.now(),
        type: "YOUTUBE_WATCH",
        domain: "youtube.com",
        title: "Mitigating Off-By-One Errors with Two Pointers",
        url: "https://youtube.com/watch?v=adv_pointer_02",
      },
      {
        timestamp: Date.now(),
        type: "TAB_ACTIVE",
        domain: "leetcode.com",
        title: "LeetCode 34 — Find First and Last Position",
        url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array",
      },
    ];
    const picked = mockEvents[Math.floor(Math.random() * mockEvents.length)];
    setRecentEvents((prev) => [picked, ...prev.slice(0, 9)]);

    // Propose an inferred branch
    if (path.length < 5 && Math.random() > 0.4) {
      setPath((prev) => [
        ...prev,
        {
          _id: "node_" + Date.now(),
          title: "Two Pointers Convergence Condition",
          type: "branch",
          status: "active",
          reason: `Discovered from recent activity on ${picked.domain}`,
          confidence: 0.92,
          timeSpent: "1m",
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#fafafa] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentToken={userToken}
        onUpdateToken={setUserToken}
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
                v0.3.0-live
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

        <div className="flex items-center gap-3 text-xs">
          {/* Simulation Trigger Button */}
          <button
            onClick={handleSimulateEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition cursor-pointer shadow-sm text-xs"
            title="Simulate a real browser tab switch event"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span>Simulate Event</span>
          </button>

          {/* Extension Status Button */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 hover:text-white border border-indigo-700/50 transition cursor-pointer shadow-sm text-xs font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Extension Connect</span>
          </button>
        </div>
      </header>

      {/* Main Cockpit Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Goal, Discovered Work Graph & Tasks */}
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
                <span className="text-[11px] font-mono text-zinc-500">
                  ID: #goal_01
                </span>
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
                  <span>0 clerical subtasks required</span>
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

                {/* Quick Presets */}
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

          {/* Discovered Work Graph & Branches */}
          <section className="rounded-2xl p-6 bg-zinc-900/40 border border-zinc-800/80 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Autonomous Work Graph & Discovered Path
                </h2>
              </div>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                {path.length} Discovered Nodes
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              The graph is discovered from actual work. When you watch tutorials, search docs, or debug boundary bugs, Maana automatically branches and records inferred dependencies.
            </p>

            {/* Visual Node Tree */}
            <div className="space-y-3 relative before:content-[''] before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-cyan-500 before:to-transparent">
              {path.map((node, index) => {
                const isCurrent = index === path.length - 1;
                return (
                  <div
                    key={node._id}
                    className={`relative pl-10 transition duration-200 group`}
                  >
                    {/* Node Bullet Marker */}
                    <div
                      className={`absolute left-3.5 top-4 w-3.5 h-3.5 rounded-full border-2 -translate-x-1/2 flex items-center justify-center transition ${
                        isCurrent
                          ? "bg-indigo-500 border-white shadow-lg shadow-indigo-500/50"
                          : "bg-zinc-900 border-cyan-500/60"
                      }`}
                    >
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-xl border text-sm transition ${
                        isCurrent
                          ? "bg-indigo-950/20 border-indigo-700/80 shadow-md shadow-indigo-950/30"
                          : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white tracking-tight">
                            {node.title}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border font-medium ${
                              node.type === "goal"
                                ? "bg-purple-950/60 border-purple-800/60 text-purple-300"
                                : node.type === "branch"
                                ? "bg-cyan-950/60 border-cyan-800/60 text-cyan-300"
                                : "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                            }`}
                          >
                            {node.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          {node.timeSpent && (
                            <span className="text-zinc-400">
                              ⏱ {node.timeSpent}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-600 text-white font-medium shadow-sm">
                              Active Focus
                            </span>
                          )}
                        </div>
                      </div>

                      {node.reason && (
                        <div className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                          <span>Inferred: {node.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                        task.status === "done"
                          ? "line-through text-zinc-500"
                          : "text-zinc-200"
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
              <span className="text-[11px] font-mono text-zinc-400">
                Fast Clock
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono">Focus Time</span>
                <p className="text-xl font-mono font-bold text-emerald-400">
                  1h 27m
                </p>
              </div>
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono">Drift Score</span>
                <p className="text-xl font-mono font-bold text-indigo-400">
                  0.18 <span className="text-xs text-emerald-400">(Focused)</span>
                </p>
              </div>
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono">Discovered</span>
                <p className="text-xl font-mono font-bold text-cyan-400">
                  3 Nodes
                </p>
              </div>
              <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-mono">Interventions</span>
                <p className="text-xl font-mono font-bold text-neutral-300">
                  0 Needed
                </p>
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
                <span className="text-emerald-400 font-bold">DEPENDENCY</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Confidence:</span>
                <span className="text-zinc-200">0.96 (High)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Reasoning Model:</span>
                <span className="text-zinc-400">gpt-4o-mini / structured JSON</span>
              </div>
              <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed font-sans">
                "Off-by-one errors in binary search naturally require bisect left vs right termination invariant. Legitimate learning prerequisite; node added to branch."
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
