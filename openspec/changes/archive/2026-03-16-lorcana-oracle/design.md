## Context

Disney Lorcana is a TCG published by Ravensburger with ~2,643 cards across 16 sets. LorcanaJSON is an MIT-licensed project that provides static JSON data files sourced from the official Lorcana app. The data includes rich fields: structured abilities, variant cross-references (baseId/epicId/enchantedId), Disney franchise metadata (`story` field), ink costs, lore values, and more.

This server follows the proven oracle pattern used by mtg-oracle, 3dprint-oracle, brewers-almanack, and astronomy-oracle: build-time data ingestion into SQLite with FTS5 for search, bundled in the npm package, zero runtime API dependencies.

## Goals / Non-Goals

**Goals:**
- Ship an MCP server with 7 tools covering card search, set browsing, character versions, franchise browsing, ink curve analysis, lore analysis, and song synergies
- All tools operate exclusively on ground-truth data — no LLM inference or guessing
- Bundle LorcanaJSON data into SQLite at build time for fast, offline queries
- Follow existing oracle patterns for consistency and fast development
- Publish to npm as `lorcana-oracle`

**Non-Goals:**
- Price data (LorcanaJSON doesn't include prices; Lorcast does but would add runtime API dependency)
- Deck import from external formats (future feature)
- Multi-language support in v1 (LorcanaJSON has FR/DE/IT but v1 is English-only)
- Real-time data updates (rebuild + publish for new sets)
- Rules engine or game state simulation

## Decisions

### Data Source: LorcanaJSON (not Lorcast API)

LorcanaJSON provides static JSON files with richer data than Lorcast's REST API:
- `story` field for Disney franchise grouping (Lorcast lacks this)
- Structured ability objects (Lorcast has plain text only)
- Variant cross-references (baseId, epicId, enchantedId, variantIds)
- Errata and clarifications
- MIT-licensed code

Alternative considered: Lorcast API. Rejected because it would add a runtime dependency, has fewer fields, and lacks the `story` field which powers the franchise browsing tool.

### Storage: Build-time SQLite with FTS5

Same pattern as 3dprint-oracle and mtg-oracle. A build script downloads LorcanaJSON data, transforms it, and loads it into a SQLite database that ships with the npm package.

Tables:
- `cards` — all card fields, indexed by id/name/set
- `cards_fts` — FTS5 virtual table on name + text + type + subtypes for full-text search
- `sets` — set metadata (code, name, release date, card count)

Alternative considered: In-memory JSON search. Rejected because SQLite + FTS5 gives better search quality, pagination, and the dataset will grow.

### Tool Count: 7 tools

The MCP stack recommends 3-5 tools. We have 7, but they cover distinct, non-overlapping workflows:
1. `search_cards` — find cards by any criteria
2. `get_set` / `list_sets` — consolidated as `browse_sets` (one tool, optional set code parameter)
3. `character_versions` — all printings of a Disney character
4. `browse_franchise` — cards by Disney franchise (story field)
5. `analyze_ink_curve` — deck ink analysis
6. `analyze_lore` — deck lore tempo analysis
7. `find_song_synergies` — character/song cost matching

Consolidation: sets and franchise could be merged into `browse_cards`, but keeping them separate improves tool descriptions and model accuracy. The 7 tools are distinct enough that consolidation would hurt usability.

### Deck Input Format

For deck analysis tools (ink curve, lore analysis), accept a simple text format:
```
2 Elsa - Snow Queen
3 Mickey Mouse - Brave Little Tailor
```
Parse `<quantity> <card name>` or `<quantity> <card name> - <version>`. Resolve against the database. Return errors for unrecognized cards rather than guessing.

## Risks / Trade-offs

- **[Data freshness]** → New sets require a rebuild and npm publish. Acceptable for a static oracle. Mitigation: document the data version and LorcanaJSON version in the server's metadata.
- **[Dataset size growth]** → ~2,643 cards is small. Even at 10x growth, SQLite handles it trivially. No risk.
- **[Ravensburger Community Code Policy]** → Data cannot be charged for. Mitigation: the server is open source and free. Policy is compatible.
- **[LorcanaJSON availability]** → If the project goes offline, we have the data snapshot in the build. Mitigation: pin a specific version in the build script.
- **[Card name ambiguity]** → Multiple versions of the same character name. Mitigation: search returns all versions; version parameter disambiguates. The `character_versions` tool is specifically designed for this.
