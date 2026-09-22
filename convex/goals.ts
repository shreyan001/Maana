import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Creates a new high-level objective for the authenticated user.
 * Automatically spawns the root node for continuity of intent.
 */
export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const now = Date.now();

    // Pause any previously active goals for this user
    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
      .collect();

    for (const activeGoal of activeGoals) {
      await ctx.db.patch(activeGoal._id, {
        status: "paused",
        updatedAt: now,
      });
    }

    // Create the new goal
    const goalId = await ctx.db.insert("goals", {
      userId,
      title: args.title,
      description: args.description,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create root node in the work graph
    const rootNodeId = await ctx.db.insert("nodes", {
      goalId,
      userId,
      title: args.title,
      type: "goal",
      status: "active",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
      confidence: 1.0,
      reason: "Root goal objective defined by user",
    });

    // Link root node as current node on the goal
    await ctx.db.patch(goalId, {
      currentNodeId: rootNodeId,
    });

    return { goalId, rootNodeId };
  },
});

/**
 * Fetches the active goal for the authenticated user.
 */
export const getCurrentGoal = query({
  args: {},
  handler: async (ctx) => {
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

    const activeGoal = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .first();

    if (!activeGoal) {
      return null;
    }

    let currentNode = null;
    if (activeGoal.currentNodeId) {
      currentNode = await ctx.db.get(activeGoal.currentNodeId);
    }

    return {
      goal: activeGoal,
      currentNode,
    };
  },
});

/**
 * Traces the path from the root goal down to the current node along parentId links.
 */
export const getCurrentPath = query({
  args: {
    goalId: v.optional(v.id("goals")),
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

    let targetGoalId = args.goalId;
    if (!targetGoalId) {
      const activeGoal = await ctx.db
        .query("goals")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", "active")
        )
        .first();
      if (!activeGoal) return [];
      targetGoalId = activeGoal._id;
    }

    const goal = await ctx.db.get(targetGoalId);
    if (!goal || goal.userId !== user._id) {
      return [];
    }

    if (!goal.currentNodeId) {
      return [];
    }

    // Walk up the tree from currentNodeId to root
    const pathReversed: Doc<"nodes">[] = [];
    let currNodeId: Id<"nodes"> | undefined = goal.currentNodeId;

    const visited = new Set<string>();
    while (currNodeId && !visited.has(currNodeId)) {
      visited.add(currNodeId);
      const node: Doc<"nodes"> | null = await ctx.db.get(currNodeId);
      if (!node || node.userId !== user._id) break;
      pathReversed.push(node);
      currNodeId = node.parentId;
    }

    return pathReversed.reverse();
  },
});
