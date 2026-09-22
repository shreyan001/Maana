import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";
import { processEventAggregation } from "./aggregator";

/**
 * Fast clock ingestion for observation events.
 * Aggregation into activities happens deterministically without LLM calls.
 */
export const recordEvent = mutation({
  args: {
    source: v.union(
      v.literal("browser"),
      v.literal("frontend"),
      v.literal("github"),
      v.literal("agentmail"),
      v.literal("firecrawl")
    ),
    type: v.string(),
    timestamp: v.optional(v.number()),
    payload: v.optional(v.any()),
    domain: v.optional(v.string()),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    tabId: v.optional(v.union(v.string(), v.number())),
    goalId: v.optional(v.id("goals")),
    nodeId: v.optional(v.id("nodes")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const eventTime = args.timestamp ?? Date.now();

    const payload = args.payload || {};
    const domain = args.domain ?? payload.domain;
    const url = args.url ?? payload.url;
    const title = args.title ?? payload.title;
    const tabId = args.tabId ?? payload.tabId;

    const fullPayload = {
      ...payload,
      ...(domain ? { domain } : {}),
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(tabId !== undefined ? { tabId } : {}),
    };

    // 1. Ingest raw observation event
    const eventId = await ctx.db.insert("events", {
      userId,
      goalId: args.goalId,
      source: args.source,
      type: args.type,
      timestamp: eventTime,
      payload: fullPayload,
    });

    // 2. Deterministically aggregate into activities and daily sessions (fast clock)

    const aggregation = await processEventAggregation(ctx, userId, {
      source: args.source,
      type: args.type,
      timestamp: eventTime,
      domain,
      url,
      title,
      tabId,
      goalId: args.goalId,
      nodeId: args.nodeId,
    });

    return {
      eventId,
      activityId: aggregation.activityId,
      transitionDetected: aggregation.transitionDetected,
      transitionType: aggregation.transitionType,
    };
  },
});

export const recordEventInternal = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.union(
      v.literal("browser"),
      v.literal("frontend"),
      v.literal("github"),
      v.literal("agentmail"),
      v.literal("firecrawl")
    ),
    type: v.string(),
    timestamp: v.optional(v.number()),
    payload: v.optional(v.any()),
    domain: v.optional(v.string()),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    tabId: v.optional(v.union(v.string(), v.number())),
    goalId: v.optional(v.id("goals")),
    nodeId: v.optional(v.id("nodes")),
  },
  handler: async (ctx, args) => {
    const eventTime = args.timestamp ?? Date.now();

    const payload = args.payload || {};
    const domain = args.domain ?? payload.domain;
    const url = args.url ?? payload.url;
    const title = args.title ?? payload.title;
    const tabId = args.tabId ?? payload.tabId;

    const fullPayload = {
      ...payload,
      ...(domain ? { domain } : {}),
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(tabId !== undefined ? { tabId } : {}),
    };

    const eventId = await ctx.db.insert("events", {
      userId: args.userId,
      goalId: args.goalId,
      source: args.source,
      type: args.type,
      timestamp: eventTime,
      payload: fullPayload,
    });


    const aggregation = await processEventAggregation(ctx, args.userId, {
      source: args.source,
      type: args.type,
      timestamp: eventTime,
      domain,
      url,
      title,
      tabId,
      goalId: args.goalId,
      nodeId: args.nodeId,
    });

    return {
      eventId,
      activityId: aggregation.activityId,
      transitionDetected: aggregation.transitionDetected,
      transitionType: aggregation.transitionType,
    };
  },
});

export const getRecentEvents = query({
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

    const limit = args.limit ?? 50;

    if (args.goalId) {
      return await ctx.db
        .query("events")
        .withIndex("by_goal_timestamp", (q) => q.eq("goalId", args.goalId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("events")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});
