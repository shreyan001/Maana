# Hackathon log

- **Project:** Maana
- **What it does:** Maana is an intent-preserving execution agent that observes meaningful work, discovers dependencies and branches, explains decisions, and keeps the user in control.
- **Live app:** not deployed
- **Repo:** https://github.com/shreyan001/Maana
- **Frontend:** not deployed
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions
- **Auth:** Convex Auth
- **AI models:** OpenAI gpt-4o-mini, Venice deepseek-r1-671b
- **Started:** 2026-09-22T06:45:45Z
- **Last updated:** 2026-09-22T09:52:00Z

## Log

### 2026-09-22 - 3768d3d
Created the Maana coordination foundation: product thesis, agent operating contract, Codex build guide, crew prompt library, README, and local agent skills. The repository defines the Convex-first architecture and hackathon build order, but no Convex application code has been implemented yet (`AGENTS.md`, `MAANA_CODEX_BUILD_GUIDE.md`, `MAANA_AGENT_PROMPTS.md`, `README.md`, `.agents/skills/convex-hackathon-skill/SKILL.md`). Convex features: none yet.

### 2026-09-22 - 907617e
Scaffolded React + Vite + TypeScript repository, implemented the Phase 1 Convex backend foundation, built the Chrome extension observation layer with an HTTP ingestion endpoint, and implemented the Phase 4 cognitive reasoner provider abstraction and graph discovery mutation engine. Implemented canonical schema across 13 tables, server-side authentication, deterministic event sessionizing without an LLM, Manifest V3 Chrome extension with debounced capture and local proxy middleware in `vite.config.ts`, and full Tailwind CSS v4 design overhaul in `src/App.tsx`. Built unified `Reasoner` abstraction supporting OpenAI (`gpt-4o-mini`) and Venice (`deepseek-r1-671b`) with 6 canonical semantic classifications (`continue`, `dependency`, `parallel_branch`, `new_objective`, `drift`, `ambiguous`). Added Convex graph mutation actions (`convex/reasoning.ts`) that assemble compact ContextPackets, dynamically spawn branch nodes, link parent-child edges in `nodeEdges`, and generate non-punitive intervention records with the 4 user choices. Added automated test suites covering all layers with 100% pass rate (17/17 tests passing across 4 suites: `tests/foundation.test.ts`, `tests/events.test.ts`, `tests/reasoner.test.ts`, `tests/graph.test.ts`). Convex features: schema, tables, indexes, queries, mutations, actions, HTTP actions.

### 2026-09-22 - b54bf9f
Added end-to-end backend verification test suite proving the full tracking loop: raw event observation (`events`), deterministic session aggregation (`activities`), daily focus rollup (`dailySessions`), semantic transition evaluation (`decisions`), and dynamic branch node discovery with graph edge insertion (`nodes`, `nodeEdges`). Enhanced telemetry field preservation across event ingestion handlers. All 18 automated tests passing across 5 suites (`tests/e2e_backend_tracking.test.ts`, `tests/foundation.test.ts`, `tests/events.test.ts`, `tests/reasoner.test.ts`, `tests/graph.test.ts`). Convex features: schema, tables, indexes, queries, mutations, actions, HTTP actions.

### 2026-09-22 - 3b3631b
Implemented the autonomous hierarchical Work Graph Tree (`src/components/WorkGraphTree.tsx`), interactive 7-stage state-by-state Intent Execution Trail (`src/components/ExecutionTrail.tsx`), and slide-over Node Inspector (`src/components/NodeInspector.tsx`) integrated into `src/App.tsx`. Added `getGoalTreeAndTrail` query in `convex/nodes.ts` returning complete node trees, directed edges (`nodeEdges`), and active linear ancestor trails. Implemented interactive pipeline runner stepping through Raw Observation, Deterministic Aggregation, Transition Trigger, Context Snapshot, Cognitive Reasoning, Graph Mutation (dynamic branch sprouting), and User Continuity. Verified with 18/18 passing Vitest tests and clean `tsc -b && vite build` production compilation. Convex features: schema, tables, indexes, queries, mutations, actions, HTTP actions.

### 2026-09-22 - 94885db
Implemented Firecrawl web research backend (`convex/research.ts`), Obsidian markdown vault projection engine with `[[wikilinks]]` (`convex/obsidian.ts`), and integrated frontend views across 4 dedicated cockpit navigation modes (`src/App.tsx`): Cockpit Workspace, Chronological Timeline & Daily Review (`src/components/TimelineReview.tsx`), Firecrawl Web Research Dossiers (`src/components/ResearchDossier.tsx`), and Obsidian Vault Explorer (`src/components/ObsidianView.tsx`). Added "Research Branch with Firecrawl" action into `<NodeInspector>`. Verified with automated test suite `tests/research_obsidian.test.ts` (19/19 tests passing across 6 suites) and clean `tsc -b && vite build` production compilation. Convex features: schema, tables, indexes, queries, mutations, actions, HTTP actions.


