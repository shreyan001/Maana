import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./authHelper";
import { getReasoner } from "../agent/factory";
import { ContextPacket, ActivitySummary } from "../agent/types";


/**
 * Internal query to assemble the compact ContextPacket for the Reasoner.
 * Retrieves active goal, node ancestor trail, and recent bounded activities.
 */
export const getContextPacket = internalQuery({
  args: {
    userId: v.id("users"),
    goalId: v.optional(v.id("goals")),
    activityId: v.id("activities"),
  },
  handler: async (ctx, args): Promise<ContextPacket | null> => {
    // 1. Resolve active goal
    let targetGoalId = args.goalId;
    if (!targetGoalId) {
      const activeGoal = await ctx.db
        .query("goals")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", "active")
        )
        .first();
      if (activeGoal) {
        targetGoalId = activeGoal._id;
      }
    }

    if (!targetGoalId) {
      return null;
    }

    const goal = await ctx.db.get(targetGoalId);
    if (!goal || goal.userId !== args.userId) {
      return null;
    }

    // 2. Resolve current node path (traversing backwards to root)
    const currentPath: string[] = [goal.title];
    if (goal.currentNodeId) {
      let currId: Id<"nodes"> | undefined = goal.currentNodeId;
      const pathTitles: string[] = [];
      const visited = new Set<string>();

      while (currId && !visited.has(currId)) {
        visited.add(currId);
        const node: Doc<"nodes"> | null = await ctx.db.get(currId);
        if (!node) break;
        pathTitles.unshift(node.title);
        currId = node.parentId;
      }

      currentPath.push(...pathTitles);
    }

    // 3. Resolve current activity
    const currAct = await ctx.db.get(args.activityId);
    if (!currAct) {
      return null;
    }

    const currentActivity: ActivitySummary = {
      app: currAct.app,
      type: currAct.activityType,
      domain: currAct.domain,
      url: currAct.url,
      title: currAct.title,
      durationSeconds: Math.round((currAct.durationMs ?? 0) / 1000),
      timestamp: currAct.startedAt,
    };

    // 4. Resolve previous and recent activities
    const recentDbActivities = await ctx.db
      .query("activities")
      .withIndex("by_user_started", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(6);

    const filteredRecent = recentDbActivities.filter((a) => a._id !== args.activityId);

    const previousActivity: ActivitySummary | undefined = filteredRecent[0]
      ? {
          app: filteredRecent[0].app,
          type: filteredRecent[0].activityType,
          domain: filteredRecent[0].domain,
          url: filteredRecent[0].url,
          title: filteredRecent[0].title,
          durationSeconds: Math.round((filteredRecent[0].durationMs ?? 0) / 1000),
          timestamp: filteredRecent[0].startedAt,
        }
      : undefined;

    const recentActivities: ActivitySummary[] = filteredRecent.slice(1).map((a) => ({
      app: a.app,
      type: a.activityType,
      domain: a.domain,
      url: a.url,
      title: a.title,
      durationSeconds: Math.round((a.durationMs ?? 0) / 1000),
      timestamp: a.startedAt,
    }));

    return {
      goal: {
        id: goal._id,
        title: goal.title,
        description: goal.description,
      },
      currentPath,
      previousActivity,
      currentActivity,
      recentActivities,
    };
  },
});

/**
 * Transactionally commits a reasoning decision, discovered branch mutations,
 * and optional intervention triggers to Convex.
 */
export const applyReasoningDecision = internalMutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    activityId: v.optional(v.id("activities")),
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
    suggestedNode: v.optional(v.string()),
    suggestedType: v.optional(
      v.union(
        v.literal("branch"),
        v.literal("dependency"),
        v.literal("exploration"),
        v.literal("objective")
      )
    ),
    driftScore: v.optional(v.number()),
    inputSnapshot: v.optional(v.any()),
    output: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error("Goal unauthorized or not found.");
    }

    let createdNodeId: Id<"nodes"> | undefined = undefined;

    // 1. If DEPENDENCY or PARALLEL_BRANCH, mutate the work graph!
    if (args.classification === "dependency" || args.classification === "parallel_branch") {
      const nodeTitle = args.suggestedNode || "Discovered Sub-problem";
      const nodeType =
        args.classification === "dependency"
          ? ("dependency" as const)
          : ("branch" as const);

      const parentId = goal.currentNodeId;

      createdNodeId = await ctx.db.insert("nodes", {
        goalId: args.goalId,
        userId: args.userId,
        title: nodeTitle,
        type: nodeType,
        parentId,
        status: "active",
        reason: args.reason,
        confidence: args.confidence,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Insert edge into nodeEdges if a parent exists
      if (parentId) {
        await ctx.db.insert("nodeEdges", {
          goalId: args.goalId,
          fromNodeId: parentId,
          toNodeId: createdNodeId,
          type: args.classification === "dependency" ? "depends_on" : "explores",
          confidence: args.confidence,
          reason: args.reason,
          createdAt: now,
        });
      }

      // Update goal currentNode pointer
      await ctx.db.patch(args.goalId, {
        currentNodeId: createdNodeId,
        updatedAt: now,
      });

      // Update current activity to reference this new node
      if (args.activityId) {
        await ctx.db.patch(args.activityId, {
          nodeId: createdNodeId,
          goalId: args.goalId,
        });
      }
    }

    // 2. If DRIFT cross threshold, trigger non-intrusive intervention record
    let createdInterventionId: Id<"interventions"> | undefined = undefined;
    if (args.classification === "drift" && (args.driftScore ?? 0.8) >= 0.7) {
      createdInterventionId = await ctx.db.insert("interventions", {
        userId: args.userId,
        goalId: args.goalId,
        activityId: args.activityId,
        level: 2,
        type: "overlay",
        message: `Maana observed sustained activity that appears unrelated to "${goal.title}".`,
        options: [
          "Return to active branch",
          "Take a planned break",
          "Keep exploring (add as branch)",
          "Pivot to new objective",
        ],
        status: "shown",
        createdAt: now,
      });
    }

    // 3. Insert into decisions table (audit trail)
    const decisionId = await ctx.db.insert("decisions", {
      userId: args.userId,
      goalId: args.goalId,
      activityId: args.activityId,
      nodeId: createdNodeId ?? goal.currentNodeId,
      classification: args.classification,
      confidence: args.confidence,
      reason: args.reason,
      model: args.model,
      inputSnapshot: args.inputSnapshot,
      output: args.output,
      createdAt: now,
    });

    return {
      decisionId,
      createdNodeId,
      createdInterventionId,
      classification: args.classification,
    };
  },
});

/**
 * Action to evaluate a transition with Reasoner (fast OpenAI or Venice)
 * and transactionally commit the decision into Convex.
 */
export const classifyActivityTransition = action({
  args: {
    activityId: v.id("activities"),
    goalId: v.optional(v.id("goals")),
    preferredProvider: v.optional(
      v.union(v.literal("openai"), v.literal("venice"), v.literal("heuristic-mock"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByIdentity, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      throw new Error("User record not found");
    }

    // 1. Fetch compact context packet
    const context = await ctx.runQuery(internal.reasoning.getContextPacket, {
      userId: user._id,
      goalId: args.goalId,
      activityId: args.activityId,
    });

    if (!context) {
      return { skipped: true, reason: "No active goal or activity context found." };
    }

    // 2. Invoke Reasoner
    const reasoner = getReasoner(args.preferredProvider);
    const classificationResult = await reasoner.classify(context);

    // 3. Transactionally commit decision and graph mutation
    const mutationResult = await ctx.runMutation(
      internal.reasoning.applyReasoningDecision,
      {
        userId: user._id,
        goalId: context.goal.id as Id<"goals">,
        activityId: args.activityId,
        classification: classificationResult.classification,
        confidence: classificationResult.confidence,
        reason: classificationResult.reason,
        model: `${classificationResult.provider}:${classificationResult.model}`,
        suggestedNode: classificationResult.suggestedNode,
        suggestedType: classificationResult.suggestedType,
        driftScore: classificationResult.driftScore,
        inputSnapshot: context,
        output: classificationResult,
      }
    );

    return {
      success: true,
      decisionId: mutationResult.decisionId,
      classification: classificationResult.classification,
      createdNodeId: mutationResult.createdNodeId,
      confidence: classificationResult.confidence,
      reason: classificationResult.reason,
    };
  },
});

/**
 * Public query for frontend cockpit to view the latest decision.
 */
export const getLatestDecision = query({
  args: {
    goalId: v.id("goals"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const decision = await ctx.db
      .query("decisions")
      .withIndex("by_goal_created", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .first();

    if (!decision || decision.userId !== userId) {
      return null;
    }

    return decision;
  },
});

/**
 * Public query for frontend cockpit to get complete decision history for an objective.
 */
export const getDecisionsByGoal = query({
  args: {
    goalId: v.id("goals"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const decisions = await ctx.db
      .query("decisions")
      .withIndex("by_goal_created", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .take(args.limit ?? 20);

    return decisions.filter((d) => d.userId === userId);
  },
});
