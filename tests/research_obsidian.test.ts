/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.{ts,js}");

describe("Maana Research & Obsidian Vault Projections (Sections 8, 30, 48)", () => {
  it("records Firecrawl web research and generates an Obsidian vault with [[wikilinks]]", async () => {
    const t = convexTest(schema, modules);

    // 1. Create a user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        identitySubject: "user_obsidian_01",
        name: "Test Researcher",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // 2. Create a goal
    const goalId = await t.run(async (ctx) => {
      return await ctx.db.insert("goals", {
        userId,
        title: "Learn data structures well enough to solve interview problems",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // 3. Create a root branch node
    const rootNodeId = await t.run(async (ctx) => {
      return await ctx.db.insert("nodes", {
        goalId,
        userId,
        title: "Binary Search",
        type: "branch",
        status: "active",
        confidence: 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // 4. Create a child dependency node
    const childNodeId = await t.run(async (ctx) => {
      const nid = await ctx.db.insert("nodes", {
        goalId,
        userId,
        parentId: rootNodeId,
        title: "Bisect Left Invariant",
        type: "dependency",
        status: "active",
        reason: "Prerequisite for boundary termination",
        confidence: 0.98,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.patch(goalId, { currentNodeId: nid });
      return nid;
    });

    // 5. Create an activity
    await t.run(async (ctx) => {
      return await ctx.db.insert("activities", {
        userId,
        goalId,
        nodeId: childNodeId,
        app: "LeetCode",
        activityType: "code",
        title: "LeetCode 704 Binary Search Implementation",
        domain: "leetcode.com",
        startedAt: Date.now() - 600000,
        durationMs: 600000,
        createdAt: Date.now(),
      });
    });

    // 6. Record Firecrawl web research
    const researchId = await t
      .withIdentity({ subject: "user_obsidian_01" })
      .mutation(api.research.recordResearch, {
        goalId,
        nodeId: childNodeId,
        query: "python bisect_left insertion semantics and invariants",
        sourceUrls: [
          "https://docs.python.org/3/library/bisect.html",
          "https://github.com/python/cpython/blob/main/Lib/bisect.py",
        ],
        summaries: [
          "bisect_left locates insertion point for x in sorted order to maintain sort.",
        ],
        status: "complete",
      });

    expect(researchId).toBeDefined();

    // 7. Query research by goal
    const researchList = await t
      .withIdentity({ subject: "user_obsidian_01" })
      .query(api.research.getGoalResearch, { goalId });

    expect(researchList.length).toBe(1);
    expect(researchList[0].query).toContain("bisect_left");
    expect(researchList[0].sourceUrls.length).toBe(2);

    // 8. Generate Obsidian Vault
    const vault = await t
      .withIdentity({ subject: "user_obsidian_01" })
      .query(api.obsidian.generateGoalVault, { goalId });

    expect(vault).not.toBeNull();
    expect(vault?.fileCount).toBeGreaterThanOrEqual(3);

    // Verify Goal file has [[wikilinks]]
    const goalFile = vault?.files.find((f: { path: string }) => f.path.startsWith("Goals/"));
    expect(goalFile).toBeDefined();
    expect(goalFile?.content).toContain("# Learn data structures");
    expect(goalFile?.content).toContain("[[Binary Search]]");
    expect(goalFile?.content).toContain("[[Bisect Left Invariant]]");

    // Verify Branch file has parent wikilink
    const branchFile = vault?.files.find(
      (f: { path: string }) => f.path === "Branches/Bisect Left Invariant.md"
    );
    expect(branchFile).toBeDefined();
    expect(branchFile?.content).toContain("Parent: [[Binary Search]]");
    expect(branchFile?.content).toContain("Type: dependency");
    expect(branchFile?.content).toContain("0.98");
    expect(branchFile?.content).toContain("[https://docs.python.org/3/library/bisect.html]");

    // Verify Daily Review file
    const dailyFile = vault?.files.find((f: { path: string }) => f.path.startsWith("Daily/"));
    expect(dailyFile).toBeDefined();
    expect(dailyFile?.content).toContain("Daily Work Session Review");
    expect(dailyFile?.content).toContain("[[Bisect Left Invariant]]");
  });
});
