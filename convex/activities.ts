import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

export const getCurrentActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_identitySubject", (q) =>
        q.eq("identitySubject", identity.subject)
      )
      .first();

    if (!user) return null;

    // Get the most recent activity
    const latest = await ctx.db
      .query("activities")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    return latest ?? null;
  },
});

export const recordActivity = mutation({
  args: {
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
    goalId: v.optional(v.id("goals")),
    nodeId: v.optional(v.id("nodes")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const now = Date.now();

    const duration = args.durationMs ?? (args.endedAt ? args.endedAt - args.startedAt : undefined);

    const activityId = await ctx.db.insert("activities", {
      userId,
      goalId: args.goalId,
      nodeId: args.nodeId,
      app: args.app,
      activityType: args.activityType,
      title: args.title,
      domain: args.domain,
      url: args.url,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      durationMs: duration,
      summary: args.summary,
      createdAt: now,
    });

    return activityId;
  },
});

export const getRecentActivities = query({
  args: {
    limit: v.optional(v.number()),
    goalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_identitySubject", (q) =>
        q.eq("identitySubject", identity.subject)
      )
      .first();

    if (!user) return [];

    const limit = args.limit ?? 20;

    if (args.goalId) {
      return await ctx.db
        .query("activities")
        .withIndex("by_goal_started", (q) => q.eq("goalId", args.goalId))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("activities")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});
