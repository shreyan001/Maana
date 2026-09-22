import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

export const createNode = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    type: v.union(
      v.literal("goal"),
      v.literal("branch"),
      v.literal("dependency"),
      v.literal("exploration"),
      v.literal("objective")
    ),
    parentId: v.optional(v.id("nodes")),
    reason: v.optional(v.string()),
    confidence: v.optional(v.number()),
    makeCurrent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.goalId !== args.goalId || parent.userId !== userId) {
        throw new Error("Invalid parent node reference");
      }
    }

    const now = Date.now();
    const nodeId = await ctx.db.insert("nodes", {
      goalId: args.goalId,
      userId,
      title: args.title,
      type: args.type,
      parentId: args.parentId,
      status: "active",
      reason: args.reason,
      confidence: args.confidence ?? 1.0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Optionally set as currentNodeId on the goal
    if (args.makeCurrent ?? true) {
      await ctx.db.patch(args.goalId, {
        currentNodeId: nodeId,
        updatedAt: now,
      });
    }

    return nodeId;
  },
});

export const updateNodeStatus = mutation({
  args: {
    nodeId: v.id("nodes"),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("blocked"),
      v.literal("done"),
      v.literal("abandoned")
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const node = await ctx.db.get(args.nodeId);
    if (!node || node.userId !== userId) {
      throw new Error("Node not found or unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(args.nodeId, {
      status: args.status,
      completedAt: args.status === "done" ? now : node.completedAt,
      updatedAt: now,
    });

    return args.nodeId;
  },
});

export const getGoalNodes = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_identitySubject", (q) =>
        q.eq("identitySubject", identity.subject)
      )
      .first();

    if (!user) {
      return [];
    }

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("nodes")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();
  },
});

/**
 * Returns the complete work graph hierarchy, edges, and active execution trail.
 */
export const getGoalTreeAndTrail = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_identitySubject", (q) =>
        q.eq("identitySubject", identity.subject)
      )
      .first();

    if (!user) {
      return null;
    }

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== user._id) {
      return null;
    }

    const allNodes = await ctx.db
      .query("nodes")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    const allEdges = await ctx.db
      .query("nodeEdges")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    const nodeMap = new Map(allNodes.map((n) => [n._id, n]));

    // Construct active trail from root to currentNodeId
    const activeTrail: typeof allNodes = [];
    if (goal.currentNodeId) {
      let curr = nodeMap.get(goal.currentNodeId);
      const visited = new Set<string>();
      while (curr && !visited.has(curr._id)) {
        visited.add(curr._id);
        activeTrail.unshift(curr);
        curr = curr.parentId ? nodeMap.get(curr.parentId) : undefined;
      }
    }

    return {
      goal,
      nodes: allNodes,
      edges: allEdges,
      activeTrail,
      currentNodeId: goal.currentNodeId,
    };
  },
});

