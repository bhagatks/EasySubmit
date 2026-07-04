# graphify

- **graphify** (`.claude/skills/graphify/SKILL.md`) — full pipeline and query reference. Trigger: `/graphify`

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

**Always run graphify first** for codebase questions, architecture exploration, and code searches. It returns scoped subgraphs much faster than raw grep/file reads. Use Read/Grep/Glob directly only after graphify has oriented you, or when `graphify-out/graph.json` does not exist yet.

**First-time setup:** `uv tool install graphifyy` (or use `./scripts/graphify`), then `/graphify .` once to build the graph.

**Commands:** (use `./scripts/graphify` instead of `graphify` when the CLI is not on PATH)
- `graphify query "<question>"` — scoped subgraph for your question (e.g., "how does enhance pipeline work?")
- `graphify explain "<concept>"` — deep dive on a single concept (e.g., "ATS keyword gap")
- `graphify path "<A>" "<B>"` — relationships between two entities (e.g., "resume-readiness-score" → "keyword-gap")
- `graphify update .` — refresh the graph after code changes (AST-only, no API cost)

**When to use which:**
- "How does X work?" or "Where is X defined?" → `query`
- Understanding a specific module/concept deeply → `explain`
- Finding connections and dependencies → `path`
- Broad architecture review → read `graphify-out/GRAPH_REPORT.md`
- Navigation reference → check `graphify-out/wiki/index.md` if it exists
