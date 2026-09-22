/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

describe("Maana Graph Mutation & Cognitive Decisions (MAANA-REASONING-02)", () => {

  it("assembles ContextPacket and applies DEPENDENCY graph mutation with edge creation", async () => {
    const t = convexTest(schema, modules);


    // 1. Create a user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        identitySubject: "user_graph_01",
        name: "Test Developer",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // 2. Create an active goal
    const goalId = await t.run(async (ctx) => {
      return await ctx.db.insert("goals", {
        userId,
        title: "Learn data structures well enough to solve interview problems",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // 3. Create initial root node
    const rootNodeId = await t.run(async (ctx) => {
      const nid = await ctx.db.insert("nodes", {
        goalId,
        userId,
        title: "Binary Search",
        type: "branch",
        status: "active",
        confidence: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(goalId, { currentNodeId: nid });
      return nid;
    });

    // 4. Create an activity
    const activityId = await t.run(async (ctx) => {
      return await ctx.db.insert("activities", {
        userId,
        goalId,
        nodeId: rootNodeId,
        app: "LeetCode",
        activityType: "code",
        title: "Bisect Left Edge Invariant Investigation",
        domain: "leetcode.com",
        startedAt: Date.now() - 300000,
        durationMs: 300000,
        createdAt: Date.now(),
      });
    });

    // 5. Query context packet
    const context = await t.query(internal.reasoning.getContextPacket, {
      userId,
      goalId,
      activityId,
    });

    expect(context).not.toBeNull();
    expect(context?.goal.title).toContain("data structures");
    expect(context?.currentPath).toContain("Binary Search");
    expect(context?.currentActivity.domain).toBe("leetcode.com");

    // 6. Apply DEPENDENCY decision mutation
    const decisionResult = await t.mutation(
      internal.reasoning.applyReasoningDecision,
      {
        userId,
        goalId,
        activityId,
        classification: "dependency",
        confidence: 0.95,
        reason: "Discovered bisect left boundary invariant required for binary search.",
        model: "openai:gpt-4o-mini",
        suggestedNode: "Bisect Left Edge Cases",
        suggestedType: "dependency",
      }
    );

    expect(decisionResult.decisionId).toBeDefined();
    expect(decisionResult.createdNodeId).toBeDefined();
    expect(decisionResult.classification).toBe("dependency");

    // 7. Verify the new node was inserted and goal pointer was updated
    const updatedGoal = await t.run(async (ctx) => {
      return await ctx.db.get(goalId);
    });
    expect(updatedGoal?.currentNodeId).toBe(decisionResult.createdNodeId);

    const newNode = await t.run(async (ctx) => {
      return (await ctx.db.get(decisionResult.createdNodeId!)) as Doc<"nodes"> | null;
    });

    expect(newNode?.title).toBe("Bisect Left Edge Cases");
    expect(newNode?.type).toBe("dependency");
    expect(newNode?.parentId).toBe(rootNodeId);

    // 8. Verify the edge was inserted in nodeEdges
    const edges = await t.run(async (ctx) => {
      return await ctx.db
        .query("nodeEdges")
        .withIndex("by_goal", (q) => q.eq("goalId", goalId))
        .collect();
    });
    expect(edges.length).toBe(1);
    expect(edges[0].fromNodeId).toBe(rootNodeId);
    expect(edges[0].toNodeId).toBe(decisionResult.createdNodeId);
    expect(edges[0].type).toBe("depends_on");

    // 9. Verify getGoalTreeAndTrail returns full hierarchy, edges, and linear active trail
    const treeAndTrail = await t
      .withIdentity({ subject: "user_graph_01" })
      .query(api.nodes.getGoalTreeAndTrail, { goalId });

    expect(treeAndTrail).not.toBeNull();
    expect(treeAndTrail?.nodes.length).toBe(2);
    expect(treeAndTrail?.edges.length).toBe(1);
    expect(treeAndTrail?.activeTrail.length).toBe(2);
    expect(treeAndTrail?.activeTrail[0]._id).toBe(rootNodeId);
    expect(treeAndTrail?.activeTrail[1]._id).toBe(decisionResult.createdNodeId);
    expect(treeAndTrail?.currentNodeId).toBe(decisionResult.createdNodeId);

    // 10. Verify updateNodeStatus marks node done
    await t
      .withIdentity({ subject: "user_graph_01" })
      .mutation(api.nodes.updateNodeStatus, {
        nodeId: decisionResult.createdNodeId!,
        status: "done",
      });

    const updatedNode = await t.run(async (ctx) => {
      return (await ctx.db.get(decisionResult.createdNodeId!)) as Doc<"nodes"> | null;
    });
    expect(updatedNode?.status).toBe("done");
    expect(updatedNode?.completedAt).toBeDefined();
  });

  it("triggers non-intrusive intervention record on high-confidence sustained DRIFT", async () => {
    const t = convexTest(schema, modules);


    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        identitySubject: "user_drift_01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const goalId = await t.run(async (ctx) => {
      return await ctx.db.insert("goals", {
        userId,
        title: "Learn data structures well enough to solve interview problems",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const activityId = await t.run(async (ctx) => {
      return await ctx.db.insert("activities", {
        userId,
        goalId,
        app: "Twitch",
        activityType: "watch",
        title: "Gaming Stream Marathon",
        domain: "twitch.tv",
        startedAt: Date.now() - 600000,
        durationMs: 600000,
        createdAt: Date.now(),
      });
    });

    // Apply DRIFT decision with score >= 0.75
    const result = await t.mutation(internal.reasoning.applyReasoningDecision, {
      userId,
      goalId,
      activityId,
      classification: "drift",
      confidence: 0.92,
      reason: "Observed sustained entertainment stream completely unrelated to goal.",
      model: "openai:gpt-4o-mini",
      driftScore: 0.88,
    });

    expect(result.createdInterventionId).toBeDefined();

    // Verify intervention options match the 4 user choices
    const intervention = await t.run(async (ctx) => {
      return (await ctx.db.get(result.createdInterventionId!)) as Doc<"interventions"> | null;
    });


    expect(intervention).not.toBeNull();
    expect(intervention?.level).toBe(2);
    expect(intervention?.type).toBe("overlay");
    expect(intervention?.options.length).toBe(4);
    expect(intervention?.options[0]).toContain("Return");
  });
});
