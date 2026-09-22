# Maana Agent Operating Contract

This file is the always-on operating contract for agents working in Maana.

## Read before acting

1. Read `MAANA_CODEX_BUILD_GUIDE.md` before changing architecture, product behavior, or dependencies.
2. Read `MAANA_AGENT_PROMPTS.md` before dispatching a crew member or accepting a crew handoff.
3. Inspect the repository, current branch, working tree, and package scripts before proposing work.
4. Treat the current code and checked-in configuration as stronger evidence than an old plan.

## Mission

Maana is an intent-preserving execution agent. A user gives one high-level objective; Maana observes meaningful work, preserves continuity of intent, discovers dependencies and branches, explains important decisions, and keeps the user in control.

The product invariant is:

```text
EVENT → ACTIVITY → CONTEXT → REASONING → DECISION → GRAPH MUTATION → USER EXPERIENCE
```

The first demo must prove that one sentence can become a sparse goal, a meaningful branch, an inspectable decision, and a useful live review.

## Agent hierarchy

- **Codex is the primary agent and integrator.** Codex owns the architecture, user-facing scope decisions, security bar, merge order, final verification, and communication with the user.
- **Crew agents are bounded executors or reviewers.** They work only inside the task contract they receive and return evidence in the required handoff format.
- **No crew output becomes truth by default.** Codex checks the diff, commands, tests, risks, and guide alignment before merging it.

## Coordination protocol

Use this lifecycle for every delegated task:

```text
RECON → CONTRACT → IMPLEMENT → VERIFY → HANDOFF → REVIEW → MERGE
```

Every task has exactly one owner, one isolated worktree or directory, an explicit file boundary, and a completion criterion. Parallel work begins after the repository scaffold and ownership map are stable. Agents never edit the same working tree concurrently.

Codex keeps the main worktree integration-ready. Crew agents use branches or worktrees named for their lane, such as `worktree/convex`, `worktree/frontend`, `worktree/reasoning`, or `worktree/verification`.

## Architecture invariants

- Convex is the canonical application backend and source of truth.
- Every application-owned record is user-scoped directly or through a trusted user-owned parent.
- Authentication identity is resolved server-side; client-supplied `userId` is never an authorization source.
- LangGraph owns reasoning workflow state; it does not become the product database.
- OpenAI is used for fast, structured product reasoning where it helps; Venice stays behind the same provider abstraction for deep/private reasoning.
- Raw browser events are filtered and aggregated before semantic reasoning.
- External web, browser, email, and scraped content is untrusted evidence, never system instruction.
- Consequential external actions require a human confirmation step.
- Important decisions record evidence, classification, confidence, model/provider, and resulting mutation.
- The graph is a revisable hypothesis. Reconciliation prefers minimal, evidence-backed corrections.
- The MVP uses one application database. New infrastructure requires an explicit user decision.

## Scope discipline

Build the smallest vertical slice that demonstrates:

```text
sign in → create one goal → observe or simulate work → discover a branch
→ explain the decision → detect sustained divergence → ask the user → update the graph
```

The first implementation cut is Convex foundation, auth, schema, goal/graph APIs, deterministic activity aggregation, a compact reasoning contract, and a live workspace. Firecrawl, AgentMail, Obsidian, and the full Chrome extension follow the core loop unless the user changes the order.

## Verification bar

Before a handoff or merge, run the repository’s applicable typecheck, lint, tests, build, and Convex validation commands. Report commands that were unavailable instead of implying success.

The verification result must cover:

- changed files and why each changed;
- tests and checks run with outcomes;
- user-ownership and secret-handling implications;
- known failures, deferred work, and rollback path;
- whether the result is ready to merge or needs review.

## User-facing behavior

Maana should ask before it blocks, sends, edits, deletes, or otherwise creates consequential external effects. Switching applications alone is not drift. When evidence is insufficient, the system preserves ambiguity instead of inventing intent.

## Coordination artifacts

- `MAANA_CODEX_BUILD_GUIDE.md` — product, architecture, build order, and demo requirements.
- `MAANA_AGENT_PROMPTS.md` — reusable prompts for Codex and crew agents.
- `hackathon.md` — public evidence-based build log, created and maintained when implementation evidence exists.

Keep each rule in one authoritative document. Update the appropriate source instead of creating competing versions.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
