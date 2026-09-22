import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

/**
 * Creates or updates a Firecrawl web research record linked to a goal and discovered node.
 */
export const recordResearch = mutation({
  args: {
    goalId: v.id("goals"),
    nodeId: v.optional(v.id("nodes")),
    query: v.string(),
    sourceUrls: v.array(v.string()),
    summaries: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    if (args.nodeId) {
      const node = await ctx.db.get(args.nodeId);
      if (!node || node.goalId !== args.goalId || node.userId !== userId) {
        throw new Error("Invalid node reference");
      }
    }

    const now = Date.now();
    const researchId = await ctx.db.insert("research", {
      userId,
      goalId: args.goalId,
      nodeId: args.nodeId,
      query: args.query,
      sourceUrls: args.sourceUrls,
      summaries: args.summaries,
      provider: "firecrawl",
      status: args.status,
      createdAt: now,
      completedAt: args.status === "complete" ? now : undefined,
    });

    return researchId;
  },
});

/**
 * Returns all research records for a given goal (and optional node filter).
 */
export const getGoalResearch = query({
  args: {
    goalId: v.id("goals"),
    nodeId: v.optional(v.id("nodes")),
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

    const allResearch = await ctx.db
      .query("research")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    if (args.nodeId) {
      return allResearch.filter((r) => r.nodeId === args.nodeId);
    }

    return allResearch;
  },
});
