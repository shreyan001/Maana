/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

describe("Maana Foundation (Phase 1)", () => {
  it("rejects unauthenticated users attempting to create goals", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.goals.createGoal, {
        title: "Learn data structures well enough to solve interview problems",
      })
    ).rejects.toThrow("Unauthenticated: valid user session required");
  });

  it("provisions user, creates active goal, and generates root node for authenticated user", async () => {
    const t = convexTest(schema, modules);
    const authedUser = t.withIdentity({
      subject: "auth0|user_alpha_123",
      tokenIdentifier: "auth0|user_alpha_123",
      name: "Alpha Builder",
      email: "alpha@example.com",
    });

    const { goalId, rootNodeId } = await authedUser.mutation(
      api.goals.createGoal,
      {
        title: "Learn data structures well enough to solve interview problems",
      }
    );

    expect(goalId).toBeDefined();
    expect(rootNodeId).toBeDefined();

    // Verify getCurrentGoal returns active goal and root node
    const current = await authedUser.query(api.goals.getCurrentGoal, {});
    expect(current).not.toBeNull();
    expect(current?.goal.title).toBe(
      "Learn data structures well enough to solve interview problems"
    );
    expect(current?.goal.status).toBe("active");
    expect(current?.currentNode?._id).toBe(rootNodeId);
    expect(current?.currentNode?.type).toBe("goal");

    // Verify getCurrentPath returns path from root to current node
    const path = await authedUser.query(api.goals.getCurrentPath, {});
    expect(path).toHaveLength(1);
    expect(path[0]._id).toBe(rootNodeId);
  });

  it("enforces strict per-user authorization and rejects cross-user task access", async () => {
    const t = convexTest(schema, modules);

    const userA = t.withIdentity({
      subject: "subject_user_a",
      tokenIdentifier: "subject_user_a",
    });

    const userB = t.withIdentity({
      subject: "subject_user_b",
      tokenIdentifier: "subject_user_b",
    });

    // User A creates a goal and a task
    const { goalId } = await userA.mutation(api.goals.createGoal, {
      title: "User A Objective",
    });

    const taskId = await userA.mutation(api.tasks.createTask, {
      goalId,
      title: "User A Task",
      priority: "high",
    });

    expect(taskId).toBeDefined();

    // User B tries to complete User A's task -> must be rejected
    await expect(
      userB.mutation(api.tasks.completeTask, {
        taskId,
      })
    ).rejects.toThrow("Task not found or unauthorized");

    // User B tries to create a task under User A's goal -> must be rejected
    await expect(
      userB.mutation(api.tasks.createTask, {
        goalId,
        title: "Malicious cross-user task injection",
      })
    ).rejects.toThrow("Goal not found or unauthorized");

    // User A can successfully complete their own task
    const completedTaskId = await userA.mutation(api.tasks.completeTask, {
      taskId,
    });
    expect(completedTaskId).toBe(taskId);

    // User A queries tasks
    const userATasks = await userA.query(api.tasks.getTasks, { goalId });
    expect(userATasks).toHaveLength(1);
    expect(userATasks[0].status).toBe("done");

    // User B queries tasks -> sees empty list (isolated data)
    const userBTasks = await userB.query(api.tasks.getTasks, { goalId });
    expect(userBTasks).toHaveLength(0);
  });

  it("records events and activities isolated by user", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "subject_user_obs",
      tokenIdentifier: "subject_user_obs",
    });

    const eventId = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      payload: { url: "https://youtube.com/watch?v=123", title: "Binary Search" },
    });

    expect(eventId).toBeDefined();

    const recentEvents = await user.query(api.events.getRecentEvents, {
      limit: 10,
    });
    expect(recentEvents).toHaveLength(1);
    expect(recentEvents[0].type).toBe("TAB_ACTIVE");

    // Record activity
    const now = Date.now() + 1000;
    const activityId = await user.mutation(api.activities.recordActivity, {
      app: "YouTube",
      activityType: "watch",
      title: "Binary Search Video",
      url: "https://youtube.com/watch?v=123",
      startedAt: now,
      endedAt: now + 300000,
      durationMs: 300000,
    });

    expect(activityId).toBeDefined();

    const currentActivity = await user.query(
      api.activities.getCurrentActivity,
      {}
    );
    expect(currentActivity).not.toBeNull();
    expect(currentActivity?.title).toBe("Binary Search Video");

    // Query daily summary
    const summary = await user.query(api.sessions.getTodaySummary, {});
    expect(summary).not.toBeNull();
    expect(summary?.driftMs).toBe(0);
  });
});
