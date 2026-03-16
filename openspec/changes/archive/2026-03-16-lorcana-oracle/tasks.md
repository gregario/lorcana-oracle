## 1. Project Setup

- [x] 1.1 Initialize package.json with name `lorcana-oracle`, type module, bin field, scripts (build, start, dev, test, inspect)
- [x] 1.2 Add dependencies: @modelcontextprotocol/sdk, zod, better-sqlite3
- [x] 1.3 Add devDependencies: @types/node, @types/better-sqlite3, tsx, typescript, vitest
- [x] 1.4 Create tsconfig.json (ES2022 target, NodeNext module, strict mode)
- [x] 1.5 Update .gitignore for node_modules, dist, *.db files
- [x] 1.6 Create src/index.ts entry point with shebang, McpServer creation, stdio transport

## 2. Data Ingestion

- [x] 2.1 Create build script (scripts/build-db.ts) that downloads LorcanaJSON data files
- [x] 2.2 Define SQLite schema: cards table with all LorcanaJSON fields (name, version, ink, cost, inkwell, type, subtypes, strength, willpower, lore, rarity, text, keywords, story, set_code, set_name, collector_number, classifications)
- [x] 2.3 Define SQLite schema: sets table (code, name, release_date, card_count)
- [x] 2.4 Create FTS5 virtual table (cards_fts) on name, text, type, subtypes, keywords
- [x] 2.5 Transform and load LorcanaJSON data into SQLite tables
- [x] 2.6 Add build-db script to package.json scripts, ensure db file is included in npm files
- [x] 2.7 Write tests for data ingestion: correct card count, field mapping, FTS indexing

## 3. Database Layer

- [x] 3.1 Create src/db.ts — database connection singleton, loads bundled SQLite db
- [x] 3.2 Create src/types.ts — TypeScript types for Card, Set, DeckEntry, SearchFilters
- [x] 3.3 Write query helpers: searchCards (FTS + filters + pagination), getCardByName, getSet, listSets
- [x] 3.4 Write query helpers: getCardsByCharacterName, getCardsByFranchise, listFranchises
- [x] 3.5 Write query helpers: getSongCards, getCharactersByMinCost
- [x] 3.6 Write tests for all query helpers with edge cases

## 4. Tool: search_cards

- [x] 4.1 Register search_cards tool with input schema: query (string), ink (optional), cost_min/cost_max (optional), type (optional), rarity (optional), set (optional), limit (optional, default 20), cursor (optional)
- [x] 4.2 Implement handler: FTS5 search with filter composition, cursor-based pagination
- [x] 4.3 Format results: name, version, ink, cost, inkwell, type, subtypes, strength, willpower, lore, rarity, text, keywords, set, collector_number
- [x] 4.4 Write tests: name search, text search, filter combinations, pagination, empty results

## 5. Tool: browse_sets

- [x] 5.1 Register browse_sets tool with input schema: set_code (optional string)
- [x] 5.2 Implement handler: without set_code returns all sets; with set_code returns set metadata + cards
- [x] 5.3 Write tests: list all sets, browse specific set, invalid set code error

## 6. Tool: character_versions

- [x] 6.1 Register character_versions tool with input schema: character_name (string)
- [x] 6.2 Implement handler: query cards by base name (ignoring version suffix), group by version, return comparison-friendly format
- [x] 6.3 Write tests: character with multiple versions, single version, not found with suggestions

## 7. Tool: browse_franchise

- [x] 7.1 Register browse_franchise tool with input schema: franchise (optional string)
- [x] 7.2 Implement handler: without franchise returns all franchises + counts; with franchise returns cards + summary stats (ink distribution, type breakdown, rarity distribution)
- [x] 7.3 Write tests: list franchises, browse specific franchise, franchise not found with suggestions, summary stats accuracy

## 8. Tool: analyze_ink_curve

- [x] 8.1 Create src/lib/deck-parser.ts — parse deck list text format ("2 Elsa - Snow Queen") into card name + quantity pairs, resolve against database
- [x] 8.2 Register analyze_ink_curve tool with input schema: deck_list (string)
- [x] 8.3 Implement handler: parse deck, compute ink cost histogram, inkable/non-inkable ratio, ink color distribution, average cost, flag unusual ratios
- [x] 8.4 Write tests: valid deck, multi-color deck, unrecognized cards flagged, version disambiguation, edge cases (empty deck, single card)

## 9. Tool: analyze_lore

- [x] 9.1 Register analyze_lore tool with input schema: deck_list (optional string), ink (optional string), cost_min/cost_max (optional), limit (optional)
- [x] 9.2 Implement handler for deck mode: parse deck, compute total lore potential, average lore per character, lore-per-cost efficiency ranking, top generators
- [x] 9.3 Implement handler for query mode: return top lore generators filtered by ink/cost, ranked by lore or lore-per-cost
- [x] 9.4 Write tests: deck analysis, query mode, non-character cards excluded, unrecognized cards

## 10. Tool: find_song_synergies

- [x] 10.1 Register find_song_synergies tool with input schema: card_name (optional string), ink (optional string)
- [x] 10.2 Implement handler for song query: find characters with cost >= song cost, group by ink
- [x] 10.3 Implement handler for character query: find songs with cost <= character cost
- [x] 10.4 Implement handler for browse mode: list all songs with singer counts
- [x] 10.5 Write tests: song lookup, character lookup, browse mode, ink filter, not found errors

## 11. Integration & Polish

- [x] 11.1 Wire all tool registrations in src/index.ts
- [x] 11.2 Write integration tests: server startup, tool listing, end-to-end tool calls via in-memory transport
- [x] 11.3 Update README.md with project description, badge pills, install instructions, tool documentation, data source attribution, license
- [x] 11.4 Create status.json for publishing pipeline tracking
- [x] 11.5 Run full test suite, verify all passing
- [x] 11.6 Build and test npx execution locally
