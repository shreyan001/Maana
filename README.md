# Maana

Maana is an intent-preserving execution agent: the user gives one high-level objective, Maana observes meaningful work, discovers dependencies and branches, explains important decisions, and keeps the user in control.

## Coordination layer

- [MAANA_CODEX_BUILD_GUIDE.md](MAANA_CODEX_BUILD_GUIDE.md) — product thesis, architecture, build order, security model, and demo target.
- [AGENTS.md](AGENTS.md) — always-on operating contract for Codex and crew agents.
- [MAANA_AGENT_PROMPTS.md](MAANA_AGENT_PROMPTS.md) — reusable dispatch, implementation, review, benchmark, and handoff prompts.

## Current phase

Planning and repository foundation. Codex is the primary integrator. Parallel agents work only in isolated, explicitly assigned boundaries and return evidence before merge.

## Core invariant

```text
EVENT → ACTIVITY → CONTEXT → REASONING → DECISION → GRAPH MUTATION → USER EXPERIENCE
```

The first implementation target is the smallest vertical slice that proves continuity of intent before adding Firecrawl, AgentMail, Obsidian, or the full browser extension.
