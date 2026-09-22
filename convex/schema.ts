import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Override/extend users table for Maana domain fields
  users: defineTable({
    identitySubject: v.string(),
    tokenIdentifier: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_identitySubject", ["identitySubject"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  // Core goal representation
  goals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived")
    ),
    currentNodeId: v.optional(v.id("nodes")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Discovered work state / branch nodes
  nodes: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    title: v.string(),
    type: v.union(
      v.literal("goal"),
      v.literal("branch"),
      v.literal("dependency"),
      v.literal("exploration"),
      v.literal("objective")
    ),
    parentId: v.optional(v.id("nodes")),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("blocked"),
      v.literal("done"),
      v.literal("abandoned")
    ),
    reason: v.optional(v.string()),
    confidence: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_goal_parent", ["goalId", "parentId"])
    .index("by_user_status", ["userId", "status"]),

  // Rich graph edges for multi-parent / dependency graphs
  nodeEdges: defineTable({
    goalId: v.id("goals"),
    fromNodeId: v.id("nodes"),
    toNodeId: v.id("nodes"),
    type: v.union(
      v.literal("parent"),
      v.literal("depends_on"),
      v.literal("supports"),
      v.literal("explores"),
      v.literal("related")
    ),
    confidence: v.number(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_from", ["fromNodeId"])
    .index("by_to", ["toNodeId"])
    .index("by_goal", ["goalId"]),

  // Raw observation events (fast clock ingestion)
  events: defineTable({
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    source: v.union(
      v.literal("browser"),
      v.literal("frontend"),
      v.literal("github"),
      v.literal("agentmail"),
      v.literal("firecrawl")
    ),
    type: v.string(),
    timestamp: v.number(),
    payload: v.any(),
  })
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_goal_timestamp", ["goalId", "timestamp"]),

  // Normalized periods of work
  activities: defineTable({
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    nodeId: v.optional(v.id("nodes")),
    app: v.string(),
    activityType: v.union(
      v.literal("watch"),
      v.literal("search"),
      v.literal("read"),
      v.literal("write"),
      v.literal("code"),
      v.literal("execute"),
      v.literal("communicate"),
      v.literal("idle"),
      v.literal("browse"),
      v.literal("other")
    ),
    title: v.string(),
    domain: v.optional(v.string()),
    url: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    summary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_goal_started", ["goalId", "startedAt"])
    .index("by_node_started", ["nodeId", "startedAt"]),

  // Inspectable agent decisions trace
  decisions: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    activityId: v.optional(v.id("activities")),
    nodeId: v.optional(v.id("nodes")),
    classification: v.union(
      v.literal("continue"),
      v.literal("dependency"),
      v.literal("parallel_branch"),
      v.literal("new_objective"),
      v.literal("drift"),
      v.literal("ambiguous")
    ),
    confidence: v.number(),
    reason: v.string(),
    model: v.string(),
    inputSnapshot: v.optional(v.any()),
    output: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_goal_created", ["goalId", "createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  // User intervention state (drift recovery, options)
  interventions: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    activityId: v.optional(v.id("activities")),
    level: v.union(v.literal(1), v.literal(2), v.literal(3)),
    type: v.union(
      v.literal("soft_hint"),
      v.literal("overlay"),
      v.literal("break"),
      v.literal("question")
    ),
    message: v.string(),
    options: v.array(v.string()),
    status: v.union(
      v.literal("shown"),
      v.literal("selected"),
      v.literal("dismissed"),
      v.literal("expired")
    ),
    selectedOption: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_goal_status", ["goalId", "status"])
    .index("by_user_status", ["userId", "status"]),

  // Explicit actionable tasks (distinct from graph nodes)
  tasks: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    nodeId: v.optional(v.id("nodes")),
    title: v.string(),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("cancelled")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueAt: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_goal_status", ["goalId", "status"])
    .index("by_user_status", ["userId", "status"]),

  // Daily focus and drift aggregation
  dailySessions: defineTable({
    userId: v.id("users"),
    dateKey: v.string(), // "YYYY-MM-DD"
    focusedMs: v.number(),
    researchMs: v.number(),
    codingMs: v.number(),
    communicationMs: v.number(),
    idleMs: v.number(),
    driftMs: v.number(),
    activityCount: v.number(),
    branchCount: v.number(),
    interventionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_date", ["userId", "dateKey"]),

  // Agent execution audit trail
  agentRuns: defineTable({
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    runType: v.union(
      v.literal("transition"),
      v.literal("drift_check"),
      v.literal("research"),
      v.literal("reconcile"),
      v.literal("daily_review")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("waiting"),
      v.literal("completed"),
      v.literal("failed")
    ),
    model: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  })
    .index("by_goal_started", ["goalId", "startedAt"])
    .index("by_user_status", ["userId", "status"]),

  // Firecrawl research records
  research: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    nodeId: v.optional(v.id("nodes")),
    query: v.string(),
    sourceUrls: v.array(v.string()),
    summaries: v.optional(v.array(v.string())),
    provider: v.literal("firecrawl"),
    status: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_goal", ["goalId"])
    .index("by_user", ["userId"]),

  // Connected external integrations
  integrations: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("github"),
      v.literal("youtube"),
      v.literal("obsidian"),
      v.literal("agentmail"),
      v.literal("browser")
    ),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("error")
    ),
    externalId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_provider", ["userId", "provider"]),
});
