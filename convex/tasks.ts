import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelper";

export const createTask = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    nodeId: v.optional(v.id("nodes")),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    if (args.nodeId) {
      const node = await ctx.db.get(args.nodeId);
      if (!node || node.userId !== userId || node.goalId !== args.goalId) {
        throw new Error("Invalid node reference");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("tasks", {
      userId,
      goalId: args.goalId,
      nodeId: args.nodeId,
      title: args.title,
      status: "todo",
      priority: args.priority ?? "medium",
      dueAt: args.dueAt,
      createdAt: now,
    });
  },
});

export const completeTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "done",
      completedAt: now,
    });

    return args.taskId;
  },
});

export const getTasks = query({
  args: {
    goalId: v.optional(v.id("goals")),
    status: v.optional(
      v.union(
        v.literal("todo"),
        v.literal("in_progress"),
        v.literal("done"),
        v.literal("cancelled")
      )
    ),
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

    if (args.goalId && args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_goal_status", (q) =>
          q.eq("goalId", args.goalId!).eq("status", args.status!)
        )
        .collect();
    }

    if (args.status) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", args.status!)
        )
        .collect();
    }

    // Default: return user tasks
    return await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
  },
});
