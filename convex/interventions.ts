import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

export const getActiveIntervention = query({
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

    const active = await ctx.db
      .query("interventions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "shown")
      )
      .first();

    return active ?? null;
  },
});

export const createIntervention = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    const now = Date.now();
    return await ctx.db.insert("interventions", {
      userId,
      goalId: args.goalId,
      activityId: args.activityId,
      level: args.level,
      type: args.type,
      message: args.message,
      options: args.options,
      status: "shown",
      createdAt: now,
    });
  },
});

export const selectIntervention = mutation({
  args: {
    interventionId: v.id("interventions"),
    selectedOption: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const intervention = await ctx.db.get(args.interventionId);
    if (!intervention || intervention.userId !== userId) {
      throw new Error("Intervention not found or unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(args.interventionId, {
      status: "selected",
      selectedOption: args.selectedOption,
      resolvedAt: now,
    });

    return args.interventionId;
  },
});
