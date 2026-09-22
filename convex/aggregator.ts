import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const INACTIVITY_TIMEOUT_MS = 60 * 1000; // 60 seconds inactivity timeout
export const RAPID_TAB_FLIP_THRESHOLD_MS = 3 * 1000; // 3 seconds rapid toggle threshold

export type ActivityType =
  | "watch"
  | "search"
  | "read"
  | "write"
  | "code"
  | "execute"
  | "communicate"
  | "idle"
  | "browse"
  | "other";

export interface NormalizedEvent {
  source: "browser" | "frontend" | "github" | "agentmail" | "firecrawl";
  type: string;
  timestamp: number;
  domain?: string;
  url?: string;
  title?: string;
  tabId?: string | number;
  goalId?: Id<"goals">;
  nodeId?: Id<"nodes">;
}

/**
 * Deterministically infers app name and semantic activity type from domain/url.
 * Zero LLM calls required.
 */
export function inferActivityMetadata(
  domain?: string,
  url?: string,
  eventType?: string
): { app: string; activityType: ActivityType } {
  if (eventType === "IDLE_STARTED") {
    return { app: "System", activityType: "idle" };
  }

  const d = (domain || "").toLowerCase().trim();
  const u = (url || "").toLowerCase().trim();

  // Video / Watch
  if (
    d.includes("youtube.com") ||
    d.includes("youtu.be") ||
    d.includes("vimeo.com") ||
    d.includes("coursera.org")
  ) {
    return { app: "YouTube", activityType: "watch" };
  }

  // Search
  if (
    d.includes("google.") ||
    d.includes("duckduckgo.com") ||
    d.includes("bing.com") ||
    d.includes("kagi.com") ||
    d.includes("search.brave.com")
  ) {
    return { app: "Search", activityType: "search" };
  }

  // Code / Development
  if (
    d.includes("leetcode.com") ||
    d.includes("hackerrank.com") ||
    d.includes("codeforces.com") ||
    d.includes("stackblitz.com") ||
    d.includes("codesandbox.io")
  ) {
    return { app: "LeetCode", activityType: "code" };
  }

  if (d.includes("github.com") || d.includes("gitlab.com")) {
    if (u.includes("/pull/") || u.includes("/issues/") || u.includes("/blob/") || u.includes("/commit/")) {
      return { app: "GitHub", activityType: "code" };
    }
    return { app: "GitHub", activityType: "read" };
  }

  // Read / Docs
  if (
    d.includes("stackoverflow.com") ||
    d.includes("stackexchange.com") ||
    d.includes("developer.mozilla.org") ||
    d.includes("docs.") ||
    d.includes("en.wikipedia.org")
  ) {
    return { app: "Docs", activityType: "read" };
  }

  // Write / Notes
  if (
    d.includes("notion.so") ||
    d.includes("docs.google.com") ||
    d.includes("obsidian")
  ) {
    return { app: "Docs", activityType: "write" };
  }

  // Comms
  if (
    d.includes("mail.google.com") ||
    d.includes("slack.com") ||
    d.includes("discord.com") ||
    d.includes("t.me")
  ) {
    return { app: "Comms", activityType: "communicate" };
  }

  // Default browser fallback
  const cleanApp = d ? d.replace(/^www\./, "").split(".")[0] : "Browser";
  return {
    app: cleanApp.charAt(0).toUpperCase() + cleanApp.slice(1),
    activityType: "browse",
  };
}

function getTodayDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * Deterministically aggregates a single incoming event into bounded activity periods
 * and accumulates time on daily session rollups.
 */
export async function processEventAggregation(
  ctx: MutationCtx,
  userId: Id<"users">,
  event: NormalizedEvent
): Promise<{
  activityId: Id<"activities">;
  transitionDetected: boolean;
  transitionType?: "continuation" | "topic_shift" | "idle_start" | "idle_end" | "timeout";
}> {
  const now = event.timestamp;
  const todayKey = getTodayDateKey(now);

  // Inferred metadata
  const { app, activityType } = inferActivityMetadata(
    event.domain,
    event.url,
    event.type
  );

  const title = event.title || event.domain || `${app} Activity`;

  // Fetch user's most recent activity
  const latestActivity: Doc<"activities"> | null = await ctx.db
    .query("activities")
    .withIndex("by_user_started", (q) => q.eq("userId", userId))
    .order("desc")
    .first();

  // Case 1: Handle Idle End transition
  if (event.type === "IDLE_ENDED") {
    if (latestActivity && latestActivity.activityType === "idle" && !latestActivity.endedAt) {
      const idleDuration = Math.max(0, now - latestActivity.startedAt);
      await ctx.db.patch(latestActivity._id, {
        endedAt: now,
        durationMs: idleDuration,
      });
      await accumulateSessionTime(ctx, userId, todayKey, { idleMs: idleDuration });
      return {
        activityId: latestActivity._id,
        transitionDetected: true,
        transitionType: "idle_end",
      };
    }
  }

  // Case 2: Handle Idle Start transition
  if (event.type === "IDLE_STARTED") {
    if (latestActivity) {
      const lastActive = latestActivity.endedAt ?? latestActivity.startedAt;
      const unrecorded = Math.max(0, now - lastActive);
      const totalDur = Math.max(0, now - latestActivity.startedAt);

      await ctx.db.patch(latestActivity._id, {
        endedAt: now,
        durationMs: totalDur,
      });

      if (unrecorded > 0 && latestActivity.activityType !== "idle") {
        await accumulateSessionTime(ctx, userId, todayKey, {
          focusedMs: unrecorded,
        });
      }
    }

    const idleActivityId = await ctx.db.insert("activities", {
      userId,
      goalId: event.goalId,
      nodeId: event.nodeId,
      app: "System",
      activityType: "idle",
      title: "User Idle Period",
      startedAt: now,
      createdAt: now,
    });

    return {
      activityId: idleActivityId,
      transitionDetected: true,
      transitionType: "idle_start",
    };
  }

  // Check if we can continue the existing open activity
  if (latestActivity && latestActivity.activityType !== "idle") {
    const lastActiveTime = latestActivity.endedAt ?? latestActivity.startedAt;
    const timeSinceLastEvent = now - lastActiveTime;

    // Is it within the timeout threshold?
    const isWithinTimeout = timeSinceLastEvent <= INACTIVITY_TIMEOUT_MS;

    // Check same context (same URL or same app and domain)
    const isSameContext =
      latestActivity.app === app &&
      (latestActivity.url === event.url ||
        (!latestActivity.url && latestActivity.domain === event.domain));

    if (isWithinTimeout && isSameContext) {
      // Continuation: Update existing activity duration
      const duration = Math.max(0, now - latestActivity.startedAt);
      const delta = latestActivity.endedAt ? now - latestActivity.endedAt : duration;

      await ctx.db.patch(latestActivity._id, {
        endedAt: now,
        durationMs: duration,
        title: event.title ?? latestActivity.title,
      });

      if (delta > 0) {
        await accumulateSessionTime(ctx, userId, todayKey, {
          focusedMs: delta,
          codingMs: activityType === "code" ? delta : 0,
          researchMs: activityType === "read" || activityType === "search" ? delta : 0,
        });
      }

      return {
        activityId: latestActivity._id,
        transitionDetected: false,
        transitionType: "continuation",
      };
    }

    // Context changed or timeout occurred -> close previous activity
    if (latestActivity) {
      const lastActive = latestActivity.endedAt ?? latestActivity.startedAt;
      const unrecorded = isWithinTimeout ? Math.max(0, now - lastActive) : 0;
      const closedDuration = Math.max(0, (isWithinTimeout ? now : lastActive) - latestActivity.startedAt);
      await ctx.db.patch(latestActivity._id, {
        endedAt: isWithinTimeout ? now : lastActive,
        durationMs: closedDuration,
      });
      if (unrecorded > 0) {
        await accumulateSessionTime(ctx, userId, todayKey, {
          focusedMs: unrecorded,
        });
      }
    }
  }

  // Create brand new activity record for the new context
  const newActivityId = await ctx.db.insert("activities", {
    userId,
    goalId: event.goalId,
    nodeId: event.nodeId,
    app,
    activityType,
    title,
    domain: event.domain,
    url: event.url,
    startedAt: now,
    durationMs: 0,
    createdAt: now,
  });

  await accumulateSessionTime(ctx, userId, todayKey, {
    activityDelta: 1,
  });

  return {
    activityId: newActivityId,
    transitionDetected: true,
    transitionType: "topic_shift",
  };
}

/**
 * Helper to update daily session aggregates deterministically.
 */
async function accumulateSessionTime(
  ctx: MutationCtx,
  userId: Id<"users">,
  dateKey: string,
  delta: {
    focusedMs?: number;
    idleMs?: number;
    codingMs?: number;
    researchMs?: number;
    activityDelta?: number;
    branchDelta?: number;
    interventionDelta?: number;
  }
) {
  const existing = await ctx.db
    .query("dailySessions")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).eq("dateKey", dateKey)
    )
    .first();

  const now = Date.now();

  if (existing) {
    await ctx.db.patch(existing._id, {
      focusedMs: existing.focusedMs + (delta.focusedMs ?? 0),
      idleMs: existing.idleMs + (delta.idleMs ?? 0),
      codingMs: existing.codingMs + (delta.codingMs ?? 0),
      researchMs: existing.researchMs + (delta.researchMs ?? 0),
      activityCount: existing.activityCount + (delta.activityDelta ?? 0),
      branchCount: existing.branchCount + (delta.branchDelta ?? 0),
      interventionCount: existing.interventionCount + (delta.interventionDelta ?? 0),
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("dailySessions", {
      userId,
      dateKey,
      focusedMs: delta.focusedMs ?? 0,
      idleMs: delta.idleMs ?? 0,
      codingMs: delta.codingMs ?? 0,
      researchMs: delta.researchMs ?? 0,
      communicationMs: 0,
      driftMs: 0,
      activityCount: delta.activityDelta ?? 1,
      branchCount: delta.branchDelta ?? 0,
      interventionCount: delta.interventionDelta ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }
}
