import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

function getTodayDateKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export const getTodaySummary = query({
  args: {
    dateKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_identitySubject", (q) =>
        q.eq("identitySubject", identity.subject)
      )
      .first();

    if (!user) return null;

    const targetDateKey = args.dateKey ?? getTodayDateKey();

    // Look for existing dailySession rollup
    const session = await ctx.db
      .query("dailySessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("dateKey", targetDateKey)
      )
      .first();

    if (session) {
      return session;
    }

    // Default empty daily summary
    return {
      userId: user._id,
      dateKey: targetDateKey,
      focusedMs: 0,
      researchMs: 0,
      codingMs: 0,
      communicationMs: 0,
      idleMs: 0,
      driftMs: 0,
      activityCount: 0,
      branchCount: 0,
      interventionCount: 0,
    };
  },
});

export const updateDailySession = mutation({
  args: {
    dateKey: v.optional(v.string()),
    focusedMs: v.optional(v.number()),
    driftMs: v.optional(v.number()),
    activityDelta: v.optional(v.number()),
    branchDelta: v.optional(v.number()),
    interventionDelta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const dateKey = args.dateKey ?? getTodayDateKey();
    const now = Date.now();

    const existing = await ctx.db
      .query("dailySessions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("dateKey", dateKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        focusedMs: existing.focusedMs + (args.focusedMs ?? 0),
        driftMs: existing.driftMs + (args.driftMs ?? 0),
        activityCount: existing.activityCount + (args.activityDelta ?? 0),
        branchCount: existing.branchCount + (args.branchDelta ?? 0),
        interventionCount: existing.interventionCount + (args.interventionDelta ?? 0),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("dailySessions", {
      userId,
      dateKey,
      focusedMs: args.focusedMs ?? 0,
      researchMs: 0,
      codingMs: 0,
      communicationMs: 0,
      idleMs: 0,
      driftMs: args.driftMs ?? 0,
      activityCount: args.activityDelta ?? 0,
      branchCount: args.branchDelta ?? 0,
      interventionCount: args.interventionDelta ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});
