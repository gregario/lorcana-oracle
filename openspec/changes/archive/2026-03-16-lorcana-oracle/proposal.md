## Why

There is no MCP server for Disney Lorcana, a rapidly growing trading card game with a passionate community. Lorcana has unique mechanics (ink system, lore racing, songs, Disney franchise crossover) that differentiate it from other TCGs. AI assistants currently have no grounded way to look up card data, analyze decks, or explore the game's mechanics without hallucinating. LorcanaJSON provides a comprehensive, MIT-licensed static dataset (~2,643 cards across 16 sets) with rich fields including structured abilities, variant cross-references, and Disney franchise metadata — making this a high-value, low-effort oracle that can ship quickly as part of the MCP-60 initiative.

## What Changes

- New MCP server: `lorcana-oracle` providing 7 tools for Disney Lorcana TCG data
- Bundled static dataset from LorcanaJSON (MIT-licensed code, Ravensburger Community Code data policy)
- Build-time data ingestion with SQLite + FTS5 for fast search (same pattern as 3dprint-oracle, mtg-oracle)
- 7 tools covering card search, set browsing, character version exploration, Disney franchise browsing, ink curve analysis, lore tempo metrics, and song synergy finding
- All tools operate on ground-truth data fields — zero LLM inference

## Capabilities

### New Capabilities
- `card-search`: Full-text search across card name, text, type, ink color, cost, rarity, and keywords with flexible filtering and pagination
- `set-browsing`: Browse and list all Lorcana sets with card counts, release dates, and drill-down to set contents
- `character-versions`: Explore all versions of a Disney character across sets using variant cross-reference fields (baseId, epicId, enchantedId, variantIds)
- `franchise-browsing`: Browse cards by Disney franchise using the `story` field (e.g., "Frozen", "The Little Mermaid", "Tangled")
- `ink-curve-analysis`: Analyze a deck list's ink distribution — inkable vs non-inkable ratio, ink cost curve, color balance
- `lore-analysis`: Analyze cards and deck lists by lore generation potential — lore value per cost, quest efficiency rankings
- `song-synergies`: Find which characters can sing which songs for free (deterministic: character cost >= song cost), build around song combos

### Modified Capabilities

(none — new project)

## Impact

- New npm package: `lorcana-oracle`
- Dependencies: `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3` (runtime), LorcanaJSON data files (build-time)
- No external API dependencies at runtime — fully self-contained with bundled SQLite database
- Distribution: stdio transport, npx-compatible
