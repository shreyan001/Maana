/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

describe("Maana Deterministic Event Aggregator (MAANA-EVENTS-01)", () => {
  it("handles same activity continuation without spawning duplicate records", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "user_cont",
      tokenIdentifier: "user_cont",
    });

    const baseTime = 1700000000000;

    // First event on YouTube video
    const res1 = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime,
      domain: "youtube.com",
      url: "https://youtube.com/watch?v=algo_1",
      title: "Binary Search Deep Dive",
    });

    expect(res1.transitionDetected).toBe(true);
    expect(res1.transitionType).toBe("topic_shift");

    // Second event 15s later on same video
    const res2 = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime + 15000,
      domain: "youtube.com",
      url: "https://youtube.com/watch?v=algo_1",
      title: "Binary Search Deep Dive",
    });

    expect(res2.transitionDetected).toBe(false);
    expect(res2.transitionType).toBe("continuation");
    expect(res2.activityId).toBe(res1.activityId);

    // Verify activity duration updated
    const currentActivity = await user.query(
      api.activities.getCurrentActivity,
      {}
    );
    expect(currentActivity?._id).toBe(res1.activityId);
    expect(currentActivity?.durationMs).toBe(15000);
    expect(currentActivity?.activityType).toBe("watch");
  });

  it("detects YouTube video changes as topic shifts", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "user_yt",
      tokenIdentifier: "user_yt",
    });

    const baseTime = 1700000000000;

    // Video A
    const resA = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime,
      domain: "youtube.com",
      url: "https://youtube.com/watch?v=video_A",
      title: "Video A: Arrays",
    });

    // Video B shift 30s later
    const resB = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "VIDEO_CHANGED",
      timestamp: baseTime + 30000,
      domain: "youtube.com",
      url: "https://youtube.com/watch?v=video_B",
      title: "Video B: Linked Lists",
    });

    expect(resB.transitionDetected).toBe(true);
    expect(resB.transitionType).toBe("topic_shift");
    expect(resB.activityId).not.toBe(resA.activityId);

    const activities = await user.query(
      api.activities.getRecentActivities,
      { limit: 10 }
    );
    expect(activities).toHaveLength(2);
    expect(activities[0].title).toBe("Video B: Linked Lists");
    expect(activities[1].title).toBe("Video A: Arrays");
  });

  it("handles tab switching and semantic classification deterministically", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "user_tab",
      tokenIdentifier: "user_tab",
    });

    const baseTime = 1700000000000;

    // Tab 1: Google Search
    const searchRes = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime,
      domain: "google.com",
      url: "https://google.com/search?q=binary+search",
      title: "Google Search: binary search",
    });

    expect(searchRes.transitionDetected).toBe(true);

    // Switch Tab: LeetCode
    const leetcodeRes = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime + 10000,
      domain: "leetcode.com",
      url: "https://leetcode.com/problems/binary-search",
      title: "704. Binary Search - LeetCode",
    });

    expect(leetcodeRes.transitionDetected).toBe(true);
    expect(leetcodeRes.activityId).not.toBe(searchRes.activityId);

    const recent = await user.query(api.activities.getRecentActivities, {
      limit: 2,
    });
    expect(recent[0].activityType).toBe("code");
    expect(recent[1].activityType).toBe("search");
  });

  it("triggers activity timeout when gap exceeds inactivity threshold", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "user_timeout",
      tokenIdentifier: "user_timeout",
    });

    const baseTime = 1700000000000;

    // Event 1
    const res1 = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime,
      domain: "developer.mozilla.org",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      title: "MDN JavaScript Docs",
    });

    // Event 2 occurs 120s later (> 60s timeout threshold)
    const res2 = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime + 120000,
      domain: "developer.mozilla.org",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      title: "MDN JavaScript Docs",
    });

    // Since timeout occurred, previous was closed and a new session starts
    expect(res2.transitionDetected).toBe(true);
    expect(res2.activityId).not.toBe(res1.activityId);
  });

  it("accurately tracks idle start and idle end periods", async () => {
    const t = convexTest(schema, modules);
    const user = t.withIdentity({
      subject: "user_idle",
      tokenIdentifier: "user_idle",
    });

    const baseTime = 1700000000000;

    // Coding activity starts
    await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "TAB_ACTIVE",
      timestamp: baseTime,
      domain: "leetcode.com",
      url: "https://leetcode.com/problems/two-sum",
      title: "Two Sum",
    });

    // IDLE_STARTED after 20s
    const idleStart = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "IDLE_STARTED",
      timestamp: baseTime + 20000,
    });

    expect(idleStart.transitionDetected).toBe(true);
    expect(idleStart.transitionType).toBe("idle_start");

    // IDLE_ENDED after 120s of idle
    const idleEnd = await user.mutation(api.events.recordEvent, {
      source: "browser",
      type: "IDLE_ENDED",
      timestamp: baseTime + 140000,
    });

    expect(idleEnd.transitionDetected).toBe(true);
    expect(idleEnd.transitionType).toBe("idle_end");
    expect(idleEnd.activityId).toBe(idleStart.activityId);

    // Check today summary includes idle time
    const summary = await user.query(api.sessions.getTodaySummary, {
      dateKey: new Date(baseTime).toISOString().slice(0, 10),
    });

    expect(summary?.idleMs).toBe(120000);
    expect(summary?.focusedMs).toBe(20000);
  });
});
