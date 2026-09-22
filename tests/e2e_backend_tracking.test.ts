/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal, api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

describe("E2E Backend Tracking & Data Flow Verification", () => {
  it("verifies end-to-end event tracking, activity aggregation, session rollup, and cognitive decision lifecycle", async () => {
    const t = convexTest(schema, modules);

    // 1. Setup authenticated user
    const authedUser = t.withIdentity({
      subject: "auth_e2e_user_01",
      tokenIdentifier: "auth_e2e_user_01",
      name: "E2E Verification Tester",
    });

    // 2. Create an active high-level goal
    const { goalId, rootNodeId } = await authedUser.mutation(api.goals.createGoal, {
      title: "Learn data structures well enough to solve interview problems",
    });

    const initialGoal = (await t.run(async (ctx) => {
      return await ctx.db.get(goalId);
    })) as Doc<"goals"> | null;

    expect(initialGoal).not.toBeNull();
    expect(initialGoal?.status).toBe("active");
    expect(initialGoal?.currentNodeId).toBe(rootNodeId);

    const userId = initialGoal!.userId;



    // 3. TRACKING TEST 1: First browser event arrives from Chrome extension (YouTube watch)
    const t0 = 1700000000000;
    const event1Result = await authedUser.mutation(internal.events.recordEventInternal, {
      userId,
      goalId,
      nodeId: rootNodeId,
      source: "browser",
      type: "YOUTUBE_WATCH",
      timestamp: t0,
      domain: "youtube.com",
      url: "https://youtube.com/watch?v=mock_video_101",
      title: "Binary Search Boundary Invariants Tutorial",
      tabId: 101,
    });

    expect(event1Result.activityId).toBeDefined();

    // Verify raw event is recorded in 'events' table
    const storedEvents = await t.run(async (ctx) => {
      return await ctx.db
        .query("events")
        .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
        .collect();
    });
    expect(storedEvents.length).toBe(1);
    expect(storedEvents[0].type).toBe("YOUTUBE_WATCH");
    expect(storedEvents[0].payload.domain).toBe("youtube.com");

    // Verify activity is created in 'activities' table
    const activity1 = (await t.run(async (ctx) => {
      return await ctx.db.get(event1Result.activityId);
    })) as Doc<"activities"> | null;

    expect(activity1).not.toBeNull();
    expect(activity1?.activityType).toBe("watch");
    expect(activity1?.app).toBe("YouTube");
    expect(activity1?.title).toBe("Binary Search Boundary Invariants Tutorial");
    expect(activity1?.startedAt).toBe(t0);
    expect(activity1?.endedAt).toBeUndefined(); // currently active!

    // Verify daily session initialized
    const sessionDateKey = new Date(t0).toISOString().split("T")[0];
    const sessionDay1 = (await t.run(async (ctx) => {
      return await ctx.db
        .query("dailySessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", sessionDateKey))
        .first();
    })) as Doc<"dailySessions"> | null;

    expect(sessionDay1).not.toBeNull();
    expect(sessionDay1?.activityCount).toBe(1);

    // 4. TRACKING TEST 2: Second event arrives 45 seconds later (User switches to LeetCode to code)
    const t1 = t0 + 45 * 1000; // 45 seconds later (45,000ms)
    const event2Result = await authedUser.mutation(internal.events.recordEventInternal, {
      userId,
      goalId,
      nodeId: rootNodeId,
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: t1,
      domain: "leetcode.com",
      url: "https://leetcode.com/problems/binary-search",
      title: "LeetCode 704 — Binary Search",
      tabId: 102,
    });

    expect(event2Result.transitionDetected).toBe(true);
    expect(event2Result.transitionType).toBe("topic_shift");

    // Verify previous YouTube activity was closed with exact duration
    const closedActivity1 = (await t.run(async (ctx) => {
      return await ctx.db.get(event1Result.activityId);
    })) as Doc<"activities"> | null;

    expect(closedActivity1?.endedAt).toBe(t1);
    expect(closedActivity1?.durationMs).toBe(45000); // 45s focused watch time!

    // Verify dailySession accumulated the 45 seconds of focused time
    const sessionDay2 = (await t.run(async (ctx) => {
      return await ctx.db
        .query("dailySessions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", sessionDateKey))
        .first();
    })) as Doc<"dailySessions"> | null;

    expect(sessionDay2?.focusedMs).toBe(45000);
    expect(sessionDay2?.activityCount).toBe(2);


    // Verify new activity is created for LeetCode
    const activity2 = (await t.run(async (ctx) => {
      return await ctx.db.get(event2Result.activityId);
    })) as Doc<"activities"> | null;

    expect(activity2?.activityType).toBe("code");
    expect(activity2?.app).toBe("LeetCode");
    expect(activity2?.startedAt).toBe(t1);


    // 5. TRACKING TEST 3: Semantic Transition Reasoner evaluates the transition
    const context = await authedUser.query(internal.reasoning.getContextPacket, {
      userId,
      goalId,
      activityId: event2Result.activityId,
    });

    expect(context).not.toBeNull();
    expect(context?.previousActivity?.title).toContain("Binary Search");
    expect(context?.currentActivity?.title).toContain("LeetCode");

    // Commit a reasoning decision
    const decisionCommit = await authedUser.mutation(internal.reasoning.applyReasoningDecision, {
      userId,
      goalId,
      activityId: event2Result.activityId,
      classification: "continue",
      confidence: 0.94,
      reason: "Transitioning from lecture to coding practice on LeetCode directly advances the goal.",
      model: "heuristic-classifier",
    });

    expect(decisionCommit.decisionId).toBeDefined();
    expect(decisionCommit.classification).toBe("continue");

    // Verify decision audit trail in 'decisions' table
    const storedDecision = (await t.run(async (ctx) => {
      return await ctx.db.get(decisionCommit.decisionId);
    })) as Doc<"decisions"> | null;

    expect(storedDecision).not.toBeNull();
    expect(storedDecision?.classification).toBe("continue");
    expect(storedDecision?.confidence).toBe(0.94);
    expect(storedDecision?.reason).toContain("coding practice");

    // 6. TRACKING TEST 4: Prerequisite discovery leads to dynamic graph branch
    const t2 = t1 + 30 * 1000; // 30 seconds later (30,000ms)
    const event3Result = await authedUser.mutation(internal.events.recordEventInternal, {
      userId,
      goalId,
      nodeId: rootNodeId,
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: t2,
      domain: "docs.python.org",
      url: "https://docs.python.org/3/library/bisect.html",
      title: "bisect — Array bisection algorithm & edge cases",
      tabId: 103,
    });

    const branchDecision = await authedUser.mutation(internal.reasoning.applyReasoningDecision, {
      userId,
      goalId,
      activityId: event3Result.activityId,
      classification: "dependency",
      confidence: 0.97,
      reason: "Discovered bisect left/right boundary edge-cases needed for solving tricky binary search bugs.",
      model: "openai:gpt-4o-mini",
      suggestedNode: "Bisect Left Boundary Invariants",
      suggestedType: "dependency",
    });

    expect(branchDecision.createdNodeId).toBeDefined();

    // Verify the new node exists in 'nodes' table
    const newNode = (await t.run(async (ctx) => {
      return await ctx.db.get(branchDecision.createdNodeId!);
    })) as Doc<"nodes"> | null;

    expect(newNode?.title).toBe("Bisect Left Boundary Invariants");
    expect(newNode?.type).toBe("dependency");
    expect(newNode?.status).toBe("active");

    // Verify parent-child edge in 'nodeEdges'
    const edges = await t.run(async (ctx) => {
      return await ctx.db
        .query("nodeEdges")
        .withIndex("by_goal", (q) => q.eq("goalId", goalId))
        .collect();
    });

    expect(edges.length).toBe(1);
    expect(edges[0].fromNodeId).toBe(rootNodeId);
    expect(edges[0].toNodeId).toBe(branchDecision.createdNodeId);
    expect(edges[0].type).toBe("depends_on");

    // Verify goal currentNode pointer was advanced to this new branch
    const finalGoal = (await t.run(async (ctx) => {
      return await ctx.db.get(goalId);
    })) as Doc<"goals"> | null;

    expect(finalGoal?.currentNodeId).toBe(branchDecision.createdNodeId);

    // 7. TRACKING TEST 5: Idle Event closes activity cleanly
    const t3 = t2 + 20 * 1000; // 20 seconds later (20,000ms)
    await authedUser.mutation(internal.events.recordEventInternal, {
      userId,
      goalId,
      source: "browser",
      type: "IDLE_STARTED",
      timestamp: t3,
    });

    const finalActivity3 = (await t.run(async (ctx) => {
      return await ctx.db.get(event3Result.activityId);
    })) as Doc<"activities"> | null;

    expect(finalActivity3?.endedAt).toBe(t3);
    expect(finalActivity3?.durationMs).toBe(20000); // 20 seconds
  });
});

