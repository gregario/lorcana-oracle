# Lorcana Oracle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that provides 7 tools for Disney Lorcana TCG card data, all powered by ground-truth data from LorcanaJSON.

**Architecture:** Build-time data ingestion from LorcanaJSON (static JSON files) into SQLite with FTS5. Server factory pattern with injectable db for testing. Same architecture as 3dprint-oracle: `createServer(options?)` → register tools → stdio transport.

**Tech Stack:** TypeScript (ESM), @modelcontextprotocol/sdk, better-sqlite3, zod, vitest

**Reference implementation:** `projects/3dprint-oracle/` — follow its patterns exactly for server structure, tool registration, test infrastructure.

**Data source:** LorcanaJSON (`https://lorcanajson.org/files/current/en/allCards.json`) — MIT license, ~2,710 cards, 13 sets. Cards have: id (number), name, fullName, simpleName, version, type, color, cost, inkwell, rarity, number, setCode, fullText, subtypes, story (Disney franchise), strength, willpower, lore, keywordAbilities, abilities (structured), baseId/enchantedId/epicId/iconicId (variant refs).

---

### Task 1: Project Infrastructure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Modify: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "lorcana-oracle",
  "version": "0.1.0",
  "description": "Disney Lorcana TCG MCP server — card search, deck analysis, and franchise browsing powered by LorcanaJSON",
  "type": "module",
  "main": "dist/server.js",
  "bin": {
    "lorcana-oracle": "dist/server.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc && cp src/data/schema.sql dist/data/ && cp src/data/lorcana.sqlite dist/data/ && chmod +x dist/server.js",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch-data": "tsx scripts/fetch-data.ts",
    "inspect": "npx @modelcontextprotocol/inspector node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "better-sqlite3": "^11.9.1",
    "zod": "^3.25.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.15.3",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.3"
  },
  "keywords": ["mcp", "lorcana", "disney", "tcg", "trading-card-game", "oracle"],
  "license": "MIT",
  "mcpName": "io.github.gregario/lorcana-oracle"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests", "scripts"]
}
```

**Step 3: Update .gitignore**

Add:
```
node_modules/
dist/
*.sqlite
*.db
.DS_Store
```

**Step 4: Install dependencies**

Run: `npm install`

**Step 5: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "feat: initialize project with dependencies and build config"
```

---

### Task 2: SQLite Schema & Database Layer

**Files:**
- Create: `src/data/schema.sql`
- Create: `src/data/db.ts`
- Create: `src/types.ts`
- Create: `tests/helpers/test-db.ts`
- Create: `tests/db.test.ts`

**Step 1: Create the SQLite schema**

File: `src/data/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS sets (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  release_date TEXT,
  prerelease_date TEXT,
  card_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  simple_name TEXT NOT NULL,
  version TEXT,
  type TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  cost INTEGER NOT NULL DEFAULT 0,
  inkwell INTEGER NOT NULL DEFAULT 0,
  strength INTEGER,
  willpower INTEGER,
  lore INTEGER,
  move_cost INTEGER,
  rarity TEXT NOT NULL,
  number INTEGER NOT NULL,
  set_code TEXT NOT NULL REFERENCES sets(code),
  full_text TEXT NOT NULL DEFAULT '',
  subtypes TEXT NOT NULL DEFAULT '',
  subtypes_text TEXT NOT NULL DEFAULT '',
  story TEXT,
  keyword_abilities TEXT NOT NULL DEFAULT '',
  flavor_text TEXT,
  artists TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  base_id INTEGER,
  enchanted_id INTEGER,
  epic_id INTEGER,
  iconic_id INTEGER,
  reprinted_as_ids TEXT,
  reprint_of_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_simple_name ON cards(simple_name);
CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
CREATE INDEX IF NOT EXISTS idx_cards_color ON cards(color);
CREATE INDEX IF NOT EXISTS idx_cards_story ON cards(story);
CREATE INDEX IF NOT EXISTS idx_cards_cost ON cards(cost);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);

CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  name,
  full_name,
  full_text,
  subtypes_text,
  keyword_abilities,
  story,
  content='cards',
  content_rowid='id',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid, name, full_name, full_text, subtypes_text, keyword_abilities, story)
  VALUES (new.id, new.name, new.full_name, new.full_text, new.subtypes_text, new.keyword_abilities, new.story);
END;
```

**Step 2: Create types**

File: `src/types.ts`

```typescript
export interface CardRow {
  id: number;
  name: string;
  full_name: string;
  simple_name: string;
  version: string | null;
  type: string;
  color: string;
  cost: number;
  inkwell: number; // 0 or 1
  strength: number | null;
  willpower: number | null;
  lore: number | null;
  move_cost: number | null;
  rarity: string;
  number: number;
  set_code: string;
  full_text: string;
  subtypes: string; // JSON array as string
  subtypes_text: string;
  story: string | null;
  keyword_abilities: string; // JSON array as string
  flavor_text: string | null;
  artists: string;
  image_url: string | null;
  base_id: number | null;
  enchanted_id: number | null;
  epic_id: number | null;
  iconic_id: number | null;
  reprinted_as_ids: string | null; // JSON array as string
  reprint_of_id: number | null;
}

export interface SetRow {
  code: string;
  name: string;
  type: string;
  release_date: string | null;
  prerelease_date: string | null;
  card_count: number;
}

export interface SearchFilters {
  query?: string;
  ink?: string;
  type?: string;
  rarity?: string;
  set?: string;
  costMin?: number;
  costMax?: number;
  limit?: number;
  cursor?: number;
}

export interface DeckEntry {
  quantity: number;
  cardName: string;
  version?: string;
}
```

**Step 3: Create database layer**

File: `src/data/db.ts`

```typescript
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CardRow, SetRow, SearchFilters } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getDatabase(dataDir?: string): Database.Database {
  const dir = dataDir ?? __dirname;
  const dbPath = join(dir, "lorcana.sqlite");

  let db: Database.Database;
  if (dataDir === ":memory:") {
    db = new Database(":memory:");
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    db.exec(schema);
  } else {
    db = new Database(dbPath, { readonly: true });
  }

  db.pragma("journal_mode = WAL");
  return db;
}

export function sanitizeFtsQuery(query: string): string {
  // Escape FTS5 special characters, wrap each token in quotes
  return query
    .replace(/['"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token}"`)
    .join(" ");
}

export function searchCards(db: Database.Database, filters: SearchFilters): { cards: CardRow[]; nextCursor: number | null } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = filters.cursor ?? 0;

  if (filters.query) {
    const sanitized = sanitizeFtsQuery(filters.query);
    conditions.push("c.id IN (SELECT rowid FROM cards_fts WHERE cards_fts MATCH @query)");
    params.query = sanitized;
  }

  if (filters.ink) {
    conditions.push("c.color = @ink");
    params.ink = filters.ink;
  }

  if (filters.type) {
    conditions.push("(c.type = @type OR c.subtypes_text LIKE @typePattern)");
    params.type = filters.type;
    params.typePattern = `%${filters.type}%`;
  }

  if (filters.rarity) {
    conditions.push("c.rarity = @rarity");
    params.rarity = filters.rarity;
  }

  if (filters.set) {
    conditions.push("c.set_code = @set");
    params.set = filters.set;
  }

  if (filters.costMin !== undefined) {
    conditions.push("c.cost >= @costMin");
    params.costMin = filters.costMin;
  }

  if (filters.costMax !== undefined) {
    conditions.push("c.cost <= @costMax");
    params.costMax = filters.costMax;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT c.* FROM cards c ${where} ORDER BY c.set_code, c.number LIMIT @limit OFFSET @offset`;

  const rows = db.prepare(sql).all({ ...params, limit: limit + 1, offset }) as CardRow[];
  const hasMore = rows.length > limit;
  const cards = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? offset + limit : null;

  return { cards, nextCursor };
}

export function getCardByName(db: Database.Database, name: string, version?: string): CardRow | undefined {
  if (version) {
    return db.prepare("SELECT * FROM cards WHERE name = @name AND version = @version LIMIT 1")
      .get({ name, version }) as CardRow | undefined;
  }
  return db.prepare("SELECT * FROM cards WHERE name = @name LIMIT 1")
    .get({ name }) as CardRow | undefined;
}

export function getCardsByCharacterName(db: Database.Database, name: string): CardRow[] {
  return db.prepare("SELECT * FROM cards WHERE name LIKE @pattern ORDER BY set_code, number")
    .all({ pattern: `%${name}%` }) as CardRow[];
}

export function listSets(db: Database.Database): SetRow[] {
  return db.prepare("SELECT * FROM sets ORDER BY release_date").all() as SetRow[];
}

export function getSet(db: Database.Database, code: string): SetRow | undefined {
  return db.prepare("SELECT * FROM sets WHERE code = @code").get({ code }) as SetRow | undefined;
}

export function getCardsBySet(db: Database.Database, setCode: string): CardRow[] {
  return db.prepare("SELECT * FROM cards WHERE set_code = @setCode ORDER BY number")
    .all({ setCode }) as CardRow[];
}

export function listFranchises(db: Database.Database): { story: string; count: number }[] {
  return db.prepare(
    "SELECT story, COUNT(*) as count FROM cards WHERE story IS NOT NULL AND story != '' GROUP BY story ORDER BY count DESC"
  ).all() as { story: string; count: number }[];
}

export function getCardsByFranchise(db: Database.Database, franchise: string): CardRow[] {
  return db.prepare("SELECT * FROM cards WHERE story = @franchise ORDER BY set_code, number")
    .all({ franchise }) as CardRow[];
}

export function getSongCards(db: Database.Database): CardRow[] {
  return db.prepare("SELECT * FROM cards WHERE subtypes_text LIKE '%Song%' ORDER BY cost, name")
    .all() as CardRow[];
}

export function getCharactersByMinCost(db: Database.Database, minCost: number, ink?: string): CardRow[] {
  if (ink) {
    return db.prepare("SELECT * FROM cards WHERE type = 'Character' AND cost >= @minCost AND color = @ink ORDER BY cost, name")
      .all({ minCost, ink }) as CardRow[];
  }
  return db.prepare("SELECT * FROM cards WHERE type = 'Character' AND cost >= @minCost ORDER BY cost, name")
    .all({ minCost }) as CardRow[];
}

export function getSongsByMaxCost(db: Database.Database, maxCost: number, ink?: string): CardRow[] {
  if (ink) {
    return db.prepare("SELECT * FROM cards WHERE subtypes_text LIKE '%Song%' AND cost <= @maxCost AND color = @ink ORDER BY cost, name")
      .all({ maxCost, ink }) as CardRow[];
  }
  return db.prepare("SELECT * FROM cards WHERE subtypes_text LIKE '%Song%' AND cost <= @maxCost ORDER BY cost, name")
    .all({ maxCost }) as CardRow[];
}

export function getTopLoreGenerators(db: Database.Database, filters: { ink?: string; costMin?: number; costMax?: number; limit?: number }): CardRow[] {
  const conditions = ["type = 'Character'", "lore IS NOT NULL", "lore > 0"];
  const params: Record<string, unknown> = {};

  if (filters.ink) {
    conditions.push("color = @ink");
    params.ink = filters.ink;
  }
  if (filters.costMin !== undefined) {
    conditions.push("cost >= @costMin");
    params.costMin = filters.costMin;
  }
  if (filters.costMax !== undefined) {
    conditions.push("cost <= @costMax");
    params.costMax = filters.costMax;
  }

  const limit = filters.limit ?? 20;
  return db.prepare(
    `SELECT * FROM cards WHERE ${conditions.join(" AND ")} ORDER BY lore DESC, cost ASC LIMIT @limit`
  ).all({ ...params, limit }) as CardRow[];
}
```

**Step 4: Create test helper**

File: `tests/helpers/test-db.ts`

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type Database from "better-sqlite3";
import { createServer } from "../../src/server.js";

export function seedTestData(db: Database.Database): void {
  // Insert test sets
  const insertSet = db.prepare(
    "INSERT INTO sets (code, name, type, release_date, prerelease_date, card_count) VALUES (@code, @name, @type, @releaseDate, @prereleaseDate, @cardCount)"
  );

  insertSet.run({ code: "1", name: "The First Chapter", type: "expansion", releaseDate: "2023-09-01", prereleaseDate: "2023-08-18", cardCount: 204 });
  insertSet.run({ code: "2", name: "Rise of the Floodborn", type: "expansion", releaseDate: "2023-12-01", prereleaseDate: "2023-11-17", cardCount: 204 });

  // Insert test cards
  const insertCard = db.prepare(`
    INSERT INTO cards (id, name, full_name, simple_name, version, type, color, cost, inkwell, strength, willpower, lore, move_cost, rarity, number, set_code, full_text, subtypes, subtypes_text, story, keyword_abilities, flavor_text, artists, image_url, base_id, enchanted_id, epic_id, iconic_id, reprinted_as_ids, reprint_of_id)
    VALUES (@id, @name, @fullName, @simpleName, @version, @type, @color, @cost, @inkwell, @strength, @willpower, @lore, @moveCost, @rarity, @number, @setCode, @fullText, @subtypes, @subtypesText, @story, @keywordAbilities, @flavorText, @artists, @imageUrl, @baseId, @enchantedId, @epicId, @iconicId, @reprintedAsIds, @reprintOfId)
  `);

  // Elsa - Snow Queen (Amethyst character, set 1)
  insertCard.run({
    id: 1, name: "Elsa", fullName: "Elsa - Snow Queen", simpleName: "elsa snow queen", version: "Snow Queen",
    type: "Character", color: "Amethyst", cost: 4, inkwell: 0, strength: 3, willpower: 4, lore: 2, moveCost: null,
    rarity: "Legendary", number: 42, setCode: "1", fullText: "FREEZE Whenever this character quests, each opponent chooses one of their characters and exerts them.",
    subtypes: '["Storyborn","Hero","Queen"]', subtypesText: "Storyborn · Hero · Queen",
    story: "Frozen", keywordAbilities: '[]', flavorText: "The cold never bothered me anyway.", artists: "Artist A",
    imageUrl: null, baseId: null, enchantedId: 2, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Elsa - Snow Queen (Enchanted version)
  insertCard.run({
    id: 2, name: "Elsa", fullName: "Elsa - Snow Queen", simpleName: "elsa snow queen", version: "Snow Queen",
    type: "Character", color: "Amethyst", cost: 4, inkwell: 0, strength: 3, willpower: 4, lore: 2, moveCost: null,
    rarity: "Enchanted", number: 205, setCode: "1", fullText: "FREEZE Whenever this character quests, each opponent chooses one of their characters and exerts them.",
    subtypes: '["Storyborn","Hero","Queen"]', subtypesText: "Storyborn · Hero · Queen",
    story: "Frozen", keywordAbilities: '[]', flavorText: "The cold never bothered me anyway.", artists: "Artist A",
    imageUrl: null, baseId: 1, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Elsa - Spirit of Winter (set 2, different version)
  insertCard.run({
    id: 3, name: "Elsa", fullName: "Elsa - Spirit of Winter", simpleName: "elsa spirit of winter", version: "Spirit of Winter",
    type: "Character", color: "Amethyst", cost: 6, inkwell: 1, strength: 4, willpower: 6, lore: 3, moveCost: null,
    rarity: "Super Rare", number: 50, setCode: "2", fullText: "DEEP FREEZE When you play this character, exert all opposing characters.",
    subtypes: '["Floodborn","Hero","Queen"]', subtypesText: "Floodborn · Hero · Queen",
    story: "Frozen", keywordAbilities: '["Shift"]', flavorText: null, artists: "Artist B",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Mickey Mouse - Brave Little Tailor (Amber character, set 1)
  insertCard.run({
    id: 4, name: "Mickey Mouse", fullName: "Mickey Mouse - Brave Little Tailor", simpleName: "mickey mouse brave little tailor", version: "Brave Little Tailor",
    type: "Character", color: "Amber", cost: 3, inkwell: 1, strength: 3, willpower: 3, lore: 1, moveCost: null,
    rarity: "Common", number: 10, setCode: "1", fullText: "SHARP WIT Whenever this character quests, you may draw a card.",
    subtypes: '["Storyborn","Hero"]', subtypesText: "Storyborn · Hero",
    story: "Brave Little Tailor", keywordAbilities: '[]', flavorText: null, artists: "Artist C",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // A Whole New World (Amber song, set 1)
  insertCard.run({
    id: 5, name: "A Whole New World", fullName: "A Whole New World", simpleName: "a whole new world", version: null,
    type: "Action", color: "Amber", cost: 5, inkwell: 0, strength: null, willpower: null, lore: null, moveCost: null,
    rarity: "Super Rare", number: 1, setCode: "1", fullText: "(A character with cost 5 or more can sing this song for free.) Each player draws 7 cards.",
    subtypes: '["Song"]', subtypesText: "Song",
    story: "Aladdin", keywordAbilities: '[]', flavorText: null, artists: "Artist D",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Let It Go (Amethyst song, set 1)
  insertCard.run({
    id: 6, name: "Let It Go", fullName: "Let It Go", simpleName: "let it go", version: null,
    type: "Action", color: "Amethyst", cost: 3, inkwell: 0, strength: null, willpower: null, lore: null, moveCost: null,
    rarity: "Uncommon", number: 43, setCode: "1", fullText: "(A character with cost 3 or more can sing this song for free.) Deal 3 damage to chosen character.",
    subtypes: '["Song"]', subtypesText: "Song",
    story: "Frozen", keywordAbilities: '[]', flavorText: null, artists: "Artist E",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Ariel - On Human Legs (Emerald character, set 1)
  insertCard.run({
    id: 7, name: "Ariel", fullName: "Ariel - On Human Legs", simpleName: "ariel on human legs", version: "On Human Legs",
    type: "Character", color: "Emerald", cost: 2, inkwell: 1, strength: 2, willpower: 3, lore: 1, moveCost: null,
    rarity: "Common", number: 60, setCode: "1", fullText: "CURIOSITY Whenever this character quests, look at the top card of your deck.",
    subtypes: '["Storyborn","Hero","Princess"]', subtypesText: "Storyborn · Hero · Princess",
    story: "The Little Mermaid", keywordAbilities: '[]', flavorText: null, artists: "Artist F",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Hades - King of Olympus (Ruby character, set 1)
  insertCard.run({
    id: 8, name: "Hades", fullName: "Hades - King of Olympus", simpleName: "hades king of olympus", version: "King of Olympus",
    type: "Character", color: "Ruby", cost: 7, inkwell: 1, strength: 6, willpower: 5, lore: 2, moveCost: null,
    rarity: "Legendary", number: 100, setCode: "1", fullText: "SINISTER PLOT When you play this character, deal 2 damage to each opposing character.",
    subtypes: '["Storyborn","Villain","Deity"]', subtypesText: "Storyborn · Villain · Deity",
    story: "Hercules", keywordAbilities: '[]', flavorText: null, artists: "Artist G",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Maui's Fish Hook (item, set 1)
  insertCard.run({
    id: 9, name: "Maui's Fish Hook", fullName: "Maui's Fish Hook", simpleName: "mauis fish hook", version: null,
    type: "Item", color: "Sapphire", cost: 3, inkwell: 1, strength: null, willpower: null, lore: null, moveCost: null,
    rarity: "Rare", number: 150, setCode: "1", fullText: "SHAPESHIFT Banish this item - chosen character gets +2 strength this turn.",
    subtypes: '[]', subtypesText: "",
    story: "Moana", keywordAbilities: '[]', flavorText: null, artists: "Artist H",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });

  // Motunui (location, set 2)
  insertCard.run({
    id: 10, name: "Motunui", fullName: "Motunui - Island Paradise", simpleName: "motunui island paradise", version: "Island Paradise",
    type: "Location", color: "Sapphire", cost: 4, inkwell: 0, strength: null, willpower: 6, lore: 1, moveCost: 2,
    rarity: "Rare", number: 170, setCode: "2", fullText: "WELCOME HOME Characters here get +1 lore.",
    subtypes: '[]', subtypesText: "",
    story: "Moana", keywordAbilities: '[]', flavorText: null, artists: "Artist I",
    imageUrl: null, baseId: null, enchantedId: null, epicId: null, iconicId: null, reprintedAsIds: null, reprintOfId: null
  });
}

export async function createTestClient(): Promise<{ client: Client; db: Database.Database }> {
  const { server, db } = createServer({ dataDir: ":memory:" });
  seedTestData(db);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, db };
}
```

**Step 5: Write failing test for database layer**

File: `tests/db.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { searchCards, listSets, getSet, getCardsBySet, getCardByName, getCardsByCharacterName, listFranchises, getCardsByFranchise, getSongCards, getCharactersByMinCost, getSongsByMaxCost, getTopLoreGenerators } from "../src/data/db.js";
import { seedTestData } from "./helpers/test-db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("database layer", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(":memory:");
    const schema = readFileSync(join(__dirname, "../src/data/schema.sql"), "utf-8");
    db.exec(schema);
    seedTestData(db);
  });

  describe("searchCards", () => {
    it("searches by name via FTS", () => {
      const { cards } = searchCards(db, { query: "Elsa" });
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.every((c) => c.name === "Elsa")).toBe(true);
    });

    it("searches by rules text", () => {
      const { cards } = searchCards(db, { query: "draw a card" });
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by ink color", () => {
      const { cards } = searchCards(db, { ink: "Amethyst" });
      expect(cards.every((c) => c.color === "Amethyst")).toBe(true);
    });

    it("filters by cost range", () => {
      const { cards } = searchCards(db, { costMin: 5 });
      expect(cards.every((c) => c.cost >= 5)).toBe(true);
    });

    it("filters by type", () => {
      const { cards } = searchCards(db, { type: "Song" });
      expect(cards.every((c) => c.subtypes_text.includes("Song"))).toBe(true);
    });

    it("filters by rarity", () => {
      const { cards } = searchCards(db, { rarity: "Legendary" });
      expect(cards.every((c) => c.rarity === "Legendary")).toBe(true);
    });

    it("filters by set", () => {
      const { cards } = searchCards(db, { set: "1" });
      expect(cards.every((c) => c.set_code === "1")).toBe(true);
    });

    it("paginates results", () => {
      const { cards, nextCursor } = searchCards(db, { limit: 2 });
      expect(cards.length).toBeLessThanOrEqual(2);
      if (nextCursor !== null) {
        const page2 = searchCards(db, { limit: 2, cursor: nextCursor });
        expect(page2.cards[0].id).not.toBe(cards[0].id);
      }
    });

    it("returns empty for no matches", () => {
      const { cards } = searchCards(db, { query: "xyznonexistent" });
      expect(cards).toHaveLength(0);
    });
  });

  describe("listSets", () => {
    it("returns all sets ordered by release date", () => {
      const sets = listSets(db);
      expect(sets).toHaveLength(2);
      expect(sets[0].code).toBe("1");
    });
  });

  describe("getSet", () => {
    it("returns a specific set", () => {
      const set = getSet(db, "1");
      expect(set?.name).toBe("The First Chapter");
    });

    it("returns undefined for non-existent set", () => {
      expect(getSet(db, "99")).toBeUndefined();
    });
  });

  describe("getCardsBySet", () => {
    it("returns cards in a set ordered by number", () => {
      const cards = getCardsBySet(db, "1");
      expect(cards.length).toBeGreaterThan(0);
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].number).toBeGreaterThanOrEqual(cards[i - 1].number);
      }
    });
  });

  describe("getCardByName", () => {
    it("finds a card by name", () => {
      const card = getCardByName(db, "Elsa");
      expect(card).toBeDefined();
      expect(card!.name).toBe("Elsa");
    });

    it("finds a card by name and version", () => {
      const card = getCardByName(db, "Elsa", "Spirit of Winter");
      expect(card).toBeDefined();
      expect(card!.version).toBe("Spirit of Winter");
    });
  });

  describe("getCardsByCharacterName", () => {
    it("returns all versions of a character", () => {
      const cards = getCardsByCharacterName(db, "Elsa");
      expect(cards.length).toBeGreaterThanOrEqual(3); // Snow Queen x2 + Spirit of Winter
    });
  });

  describe("franchise queries", () => {
    it("lists all franchises with counts", () => {
      const franchises = listFranchises(db);
      expect(franchises.length).toBeGreaterThan(0);
      expect(franchises.find((f) => f.story === "Frozen")).toBeDefined();
    });

    it("gets cards by franchise", () => {
      const cards = getCardsByFranchise(db, "Frozen");
      expect(cards.every((c) => c.story === "Frozen")).toBe(true);
    });
  });

  describe("song queries", () => {
    it("returns all songs", () => {
      const songs = getSongCards(db);
      expect(songs.length).toBe(2);
      expect(songs.every((c) => c.subtypes_text.includes("Song"))).toBe(true);
    });

    it("returns characters by min cost", () => {
      const chars = getCharactersByMinCost(db, 5);
      expect(chars.every((c) => c.cost >= 5)).toBe(true);
    });

    it("filters characters by ink", () => {
      const chars = getCharactersByMinCost(db, 3, "Amethyst");
      expect(chars.every((c) => c.color === "Amethyst" && c.cost >= 3)).toBe(true);
    });

    it("returns songs by max cost", () => {
      const songs = getSongsByMaxCost(db, 4);
      expect(songs.every((c) => c.cost <= 4)).toBe(true);
    });
  });

  describe("lore queries", () => {
    it("returns top lore generators", () => {
      const top = getTopLoreGenerators(db, { limit: 5 });
      expect(top.length).toBeGreaterThan(0);
      for (let i = 1; i < top.length; i++) {
        expect(top[i].lore).toBeLessThanOrEqual(top[i - 1].lore!);
      }
    });

    it("filters top lore by ink", () => {
      const top = getTopLoreGenerators(db, { ink: "Amethyst" });
      expect(top.every((c) => c.color === "Amethyst")).toBe(true);
    });
  });
});
```

**Step 6: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — src/data/db.ts and src/server.ts don't exist yet (we wrote the code above but haven't placed it).

Actually, we wrote all files in step 3-4. So:

Run: `npm test`
Expected: Should fail because `src/server.ts` doesn't exist yet (imported by test-db.ts).

**Step 7: Commit**

```bash
git add src/data/schema.sql src/data/db.ts src/types.ts tests/helpers/test-db.ts tests/db.test.ts
git commit -m "feat: add SQLite schema, database layer, types, and db tests"
```

---

### Task 3: Server Factory & Data Ingestion Script

**Files:**
- Create: `src/server.ts`
- Create: `scripts/fetch-data.ts`

**Step 1: Create server factory**

File: `src/server.ts`

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { getDatabase } from "./data/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export function createServer(options?: { db?: Database.Database; dataDir?: string }): { server: McpServer; db: Database.Database } {
  const version = getVersion();
  const db = options?.db ?? getDatabase(options?.dataDir);
  const server = new McpServer({ name: "lorcana-oracle", version });

  // Tool registrations will be added here as they are implemented
  // registerSearchCards(server, db);
  // registerBrowseSets(server, db);
  // etc.

  return { server, db };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""));

if (isMain) {
  const { server } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}
```

**Step 2: Create data fetch script**

File: `scripts/fetch-data.ts`

```typescript
import Database from "better-sqlite3";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "src", "data");
const DB_PATH = join(DATA_DIR, "lorcana.sqlite");
const SCHEMA_PATH = join(DATA_DIR, "schema.sql");

const ALL_CARDS_URL = "https://lorcanajson.org/files/current/en/allCards.json";

interface LorcanaCard {
  id: number;
  name: string;
  fullName: string;
  simpleName: string;
  version?: string;
  type: string;
  color: string;
  cost: number;
  inkwell: boolean;
  strength?: number;
  willpower?: number;
  lore?: number;
  moveCost?: number;
  rarity: string;
  number: number;
  setCode: string;
  fullText: string;
  subtypes: string[];
  subtypesText: string;
  story?: string;
  keywordAbilities?: string[];
  flavorText?: string;
  artists: string[];
  artistsText: string;
  images: { full?: string; thumbnail?: string };
  baseId?: number;
  enchantedId?: number;
  epicId?: number;
  iconicId?: number;
  reprintedAsIds?: number[];
  reprintOfId?: number;
}

interface LorcanaSet {
  code: string;
  name: string;
  type: string;
  releaseDate?: string;
  prereleaseDate?: string;
}

interface AllCardsResponse {
  metadata: { formatVersion: string; generatedOn: string; language: string };
  sets: Record<string, LorcanaSet & { cards?: LorcanaCard[] }>;
  cards: LorcanaCard[];
}

export function transformCard(card: LorcanaCard): Record<string, unknown> {
  return {
    id: card.id,
    name: card.name,
    fullName: card.fullName,
    simpleName: card.simpleName,
    version: card.version ?? null,
    type: card.type,
    color: card.color ?? "",
    cost: card.cost ?? 0,
    inkwell: card.inkwell ? 1 : 0,
    strength: card.strength ?? null,
    willpower: card.willpower ?? null,
    lore: card.lore ?? null,
    moveCost: card.moveCost ?? null,
    rarity: card.rarity,
    number: card.number,
    setCode: card.setCode,
    fullText: card.fullText ?? "",
    subtypes: JSON.stringify(card.subtypes ?? []),
    subtypesText: card.subtypesText ?? "",
    story: card.story ?? null,
    keywordAbilities: JSON.stringify(card.keywordAbilities ?? []),
    flavorText: card.flavorText ?? null,
    artists: card.artistsText ?? (card.artists ?? []).join(", "),
    imageUrl: card.images?.full ?? null,
    baseId: card.baseId ?? null,
    enchantedId: card.enchantedId ?? null,
    epicId: card.epicId ?? null,
    iconicId: card.iconicId ?? null,
    reprintedAsIds: card.reprintedAsIds ? JSON.stringify(card.reprintedAsIds) : null,
    reprintOfId: card.reprintOfId ?? null,
  };
}

async function fetchData(): Promise<void> {
  console.log("Fetching LorcanaJSON data...");
  const response = await fetch(ALL_CARDS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AllCardsResponse;
  console.log(`Got ${data.cards.length} cards across ${Object.keys(data.sets).length} sets`);
  console.log(`Format version: ${data.metadata.formatVersion}, generated: ${data.metadata.generatedOn}`);

  // Remove existing database
  if (existsSync(DB_PATH)) {
    const { unlinkSync } = await import("node:fs");
    unlinkSync(DB_PATH);
  }

  // Create fresh database
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const db = new Database(DB_PATH);
  db.exec(schema);
  db.pragma("journal_mode = WAL");

  // Insert sets
  const insertSet = db.prepare(
    "INSERT OR REPLACE INTO sets (code, name, type, release_date, prerelease_date, card_count) VALUES (@code, @name, @type, @releaseDate, @prereleaseDate, @cardCount)"
  );

  const insertSets = db.transaction((sets: Record<string, LorcanaSet & { cards?: LorcanaCard[] }>) => {
    for (const [code, set] of Object.entries(sets)) {
      const cardCount = data.cards.filter((c) => c.setCode === code).length;
      insertSet.run({
        code,
        name: set.name,
        type: set.type,
        releaseDate: set.releaseDate ?? null,
        prereleaseDate: set.prereleaseDate ?? null,
        cardCount,
      });
    }
  });
  insertSets(data.sets);
  console.log(`Inserted ${Object.keys(data.sets).length} sets`);

  // Insert cards
  const insertCard = db.prepare(`
    INSERT OR REPLACE INTO cards (id, name, full_name, simple_name, version, type, color, cost, inkwell, strength, willpower, lore, move_cost, rarity, number, set_code, full_text, subtypes, subtypes_text, story, keyword_abilities, flavor_text, artists, image_url, base_id, enchanted_id, epic_id, iconic_id, reprinted_as_ids, reprint_of_id)
    VALUES (@id, @name, @fullName, @simpleName, @version, @type, @color, @cost, @inkwell, @strength, @willpower, @lore, @moveCost, @rarity, @number, @setCode, @fullText, @subtypes, @subtypesText, @story, @keywordAbilities, @flavorText, @artists, @imageUrl, @baseId, @enchantedId, @epicId, @iconicId, @reprintedAsIds, @reprintOfId)
  `);

  const insertCards = db.transaction((cards: LorcanaCard[]) => {
    for (const card of cards) {
      insertCard.run(transformCard(card));
    }
  });
  insertCards(data.cards);
  console.log(`Inserted ${data.cards.length} cards`);

  db.close();
  console.log(`Database written to ${DB_PATH}`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ""));
if (isMain) {
  fetchData().catch((err) => {
    console.error("Failed to fetch data:", err);
    process.exit(1);
  });
}
```

**Step 3: Run tests**

Run: `npm test`
Expected: PASS — db tests should pass now with server.ts and db.ts in place.

**Step 4: Commit**

```bash
git add src/server.ts scripts/fetch-data.ts
git commit -m "feat: add server factory and data ingestion script"
```

---

### Task 4: Tool — search_cards

**Files:**
- Create: `src/tools/search-cards.ts`
- Create: `tests/tools/search-cards.test.ts`

**Step 1: Write the tool**

File: `src/tools/search-cards.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { searchCards } from "../data/db.js";
import type { CardRow } from "../types.js";

function formatCard(card: CardRow): string {
  const parts = [card.full_name];
  parts.push(`  Ink: ${card.color || "None"} | Cost: ${card.cost} | Inkwell: ${card.inkwell ? "Yes" : "No"}`);
  parts.push(`  Type: ${card.type}${card.subtypes_text ? ` · ${card.subtypes_text}` : ""}`);

  if (card.strength !== null) parts.push(`  Strength: ${card.strength} | Willpower: ${card.willpower} | Lore: ${card.lore}`);
  if (card.move_cost !== null) parts.push(`  Willpower: ${card.willpower} | Lore: ${card.lore} | Move Cost: ${card.move_cost}`);

  parts.push(`  Rarity: ${card.rarity} | Set: ${card.set_code} #${card.number}`);
  if (card.full_text) parts.push(`  Text: ${card.full_text}`);
  if (card.story) parts.push(`  Franchise: ${card.story}`);

  return parts.join("\n");
}

export function registerSearchCards(server: McpServer, db: Database.Database): void {
  server.registerTool("search_cards", {
    title: "Search Cards",
    description: "Search Disney Lorcana cards by name, rules text, or filters. Returns matching cards with stats, abilities, and set info. Use this when looking for specific cards or cards matching criteria.",
    inputSchema: {
      query: z.string().optional().describe("Search text — matches card name, rules text, subtypes, keywords, and franchise"),
      ink: z.string().optional().describe("Filter by ink color: Amber, Amethyst, Emerald, Ruby, Sapphire, or Steel"),
      type: z.string().optional().describe("Filter by card type: Character, Action, Song, Item, or Location"),
      rarity: z.string().optional().describe("Filter by rarity: Common, Uncommon, Rare, Super Rare, Legendary, Enchanted"),
      set: z.string().optional().describe("Filter by set code (e.g., '1' for The First Chapter)"),
      cost_min: z.number().optional().describe("Minimum ink cost"),
      cost_max: z.number().optional().describe("Maximum ink cost"),
      limit: z.number().optional().default(20).describe("Max results per page (1-100, default 20)"),
      cursor: z.number().optional().describe("Pagination cursor from previous response"),
    },
  }, async ({ query, ink, type, rarity, set, cost_min, cost_max, limit, cursor }) => {
    const { cards, nextCursor } = searchCards(db, {
      query, ink, type, rarity, set,
      costMin: cost_min, costMax: cost_max,
      limit, cursor,
    });

    if (cards.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No cards found matching your search criteria." }],
      };
    }

    const formatted = cards.map(formatCard).join("\n\n---\n\n");
    const footer = nextCursor !== null ? `\n\n[${cards.length} results shown. More available — use cursor: ${nextCursor}]` : `\n\n[${cards.length} results]`;

    return {
      content: [{ type: "text" as const, text: formatted + footer }],
    };
  });
}
```

**Step 2: Register in server.ts**

Add import and call `registerSearchCards(server, db)` in the `createServer` function.

**Step 3: Write tests**

File: `tests/tools/search-cards.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("search_cards tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("searches by card name", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { query: "Elsa" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Elsa");
    expect(result.isError).toBeFalsy();
  });

  it("searches by rules text", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { query: "draw a card" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Mickey Mouse");
  });

  it("filters by ink color", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { ink: "Amethyst" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Amethyst");
    expect(text).not.toContain("Ink: Amber");
  });

  it("filters by type Song", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { type: "Song" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Song");
  });

  it("filters by cost range", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { cost_min: 5 } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).not.toContain("Cost: 2");
    expect(text).not.toContain("Cost: 3");
  });

  it("paginates results", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { limit: 2 } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("2 results");
  });

  it("returns no results message for unmatched query", async () => {
    const result = await client.callTool({ name: "search_cards", arguments: { query: "xyznonexistent" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("No cards found");
  });
});
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/search-cards.ts tests/tools/search-cards.test.ts src/server.ts
git commit -m "feat: add search_cards tool with FTS5 search and filters"
```

---

### Task 5: Tool — browse_sets

**Files:**
- Create: `src/tools/browse-sets.ts`
- Create: `tests/tools/browse-sets.test.ts`

**Step 1: Write the tool**

File: `src/tools/browse-sets.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { listSets, getSet, getCardsBySet } from "../data/db.js";
import type { CardRow, SetRow } from "../types.js";

function formatSetSummary(set: SetRow): string {
  return `${set.code}: ${set.name} (${set.type}) — ${set.card_count} cards${set.release_date ? `, released ${set.release_date}` : ""}`;
}

function formatCardBrief(card: CardRow): string {
  const stats = card.strength !== null ? ` | ${card.strength}/${card.willpower}/${card.lore}` : "";
  return `  #${card.number} ${card.full_name} [${card.color} ${card.type}${card.subtypes_text ? ` · ${card.subtypes_text}` : ""}, Cost ${card.cost}${stats}, ${card.rarity}]`;
}

export function registerBrowseSets(server: McpServer, db: Database.Database): void {
  server.registerTool("browse_sets", {
    title: "Browse Sets",
    description: "List all Disney Lorcana sets, or browse cards within a specific set. Without a set_code, returns all sets with release dates and card counts. With a set_code, returns that set's cards.",
    inputSchema: {
      set_code: z.string().optional().describe("Set code to browse (e.g., '1' for The First Chapter). Omit to list all sets."),
    },
  }, async ({ set_code }) => {
    if (!set_code) {
      const sets = listSets(db);
      const text = "Disney Lorcana Sets:\n\n" + sets.map(formatSetSummary).join("\n");
      return { content: [{ type: "text" as const, text }] };
    }

    const set = getSet(db, set_code);
    if (!set) {
      const sets = listSets(db);
      const available = sets.map((s) => s.code).join(", ");
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Set "${set_code}" not found. Available sets: ${available}` }],
      };
    }

    const cards = getCardsBySet(db, set_code);
    const header = formatSetSummary(set);
    const cardList = cards.map(formatCardBrief).join("\n");
    return {
      content: [{ type: "text" as const, text: `${header}\n\n${cardList}` }],
    };
  });
}
```

**Step 2: Register in server.ts**

Add import and call `registerBrowseSets(server, db)`.

**Step 3: Write tests**

File: `tests/tools/browse-sets.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("browse_sets tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("lists all sets", async () => {
    const result = await client.callTool({ name: "browse_sets", arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("The First Chapter");
    expect(text).toContain("Rise of the Floodborn");
  });

  it("browses a specific set", async () => {
    const result = await client.callTool({ name: "browse_sets", arguments: { set_code: "1" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("The First Chapter");
    expect(text).toContain("Elsa");
  });

  it("returns error for invalid set code", async () => {
    const result = await client.callTool({ name: "browse_sets", arguments: { set_code: "99" } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("not found");
    expect(text).toContain("Available sets");
  });
});
```

**Step 4: Run tests, commit**

Run: `npm test`

```bash
git add src/tools/browse-sets.ts tests/tools/browse-sets.test.ts src/server.ts
git commit -m "feat: add browse_sets tool for set listing and browsing"
```

---

### Task 6: Tool — character_versions

**Files:**
- Create: `src/tools/character-versions.ts`
- Create: `tests/tools/character-versions.test.ts`

**Step 1: Write the tool**

File: `src/tools/character-versions.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { getCardsByCharacterName } from "../data/db.js";
import type { CardRow } from "../types.js";

function formatVersion(card: CardRow): string {
  const parts = [`  ${card.full_name} [${card.rarity}, Set ${card.set_code} #${card.number}]`];
  parts.push(`    Ink: ${card.color} | Cost: ${card.cost} | Inkwell: ${card.inkwell ? "Yes" : "No"}`);
  if (card.strength !== null) {
    parts.push(`    Strength: ${card.strength} | Willpower: ${card.willpower} | Lore: ${card.lore}`);
  }
  if (card.full_text) parts.push(`    Text: ${card.full_text}`);
  return parts.join("\n");
}

export function registerCharacterVersions(server: McpServer, db: Database.Database): void {
  server.registerTool("character_versions", {
    title: "Character Versions",
    description: "Show all printings and versions of a Disney character across all Lorcana sets. Use this to compare different versions of the same character (e.g., all Elsa cards, all Mickey Mouse cards).",
    inputSchema: {
      character_name: z.string().describe("Character name to look up (e.g., 'Elsa', 'Mickey Mouse', 'Ariel')"),
    },
  }, async ({ character_name }) => {
    const cards = getCardsByCharacterName(db, character_name);

    if (cards.length === 0) {
      // Try partial match suggestions
      const suggestions = db.prepare(
        "SELECT DISTINCT name FROM cards WHERE name LIKE @pattern ORDER BY name LIMIT 5"
      ).all({ pattern: `%${character_name}%` }) as { name: string }[];

      const suggest = suggestions.length > 0
        ? ` Did you mean: ${suggestions.map((s) => s.name).join(", ")}?`
        : "";
      return {
        isError: true,
        content: [{ type: "text" as const, text: `No character found matching "${character_name}".${suggest}` }],
      };
    }

    // Group by version
    const byVersion = new Map<string, CardRow[]>();
    for (const card of cards) {
      const key = card.version ?? "(base)";
      if (!byVersion.has(key)) byVersion.set(key, []);
      byVersion.get(key)!.push(card);
    }

    const header = `${cards[0].name} — ${byVersion.size} version(s), ${cards.length} total printing(s)\n`;
    const sections: string[] = [];

    for (const [version, versionCards] of byVersion) {
      sections.push(`Version: ${version}\n${versionCards.map(formatVersion).join("\n\n")}`);
    }

    return {
      content: [{ type: "text" as const, text: header + "\n" + sections.join("\n\n---\n\n") }],
    };
  });
}
```

**Step 2: Register in server.ts**

Add import and call `registerCharacterVersions(server, db)`.

**Step 3: Write tests**

File: `tests/tools/character-versions.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("character_versions tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("shows all versions of a character", async () => {
    const result = await client.callTool({ name: "character_versions", arguments: { character_name: "Elsa" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Snow Queen");
    expect(text).toContain("Spirit of Winter");
    expect(text).toContain("version(s)");
  });

  it("shows a character with one version", async () => {
    const result = await client.callTool({ name: "character_versions", arguments: { character_name: "Ariel" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Ariel");
    expect(text).toContain("On Human Legs");
  });

  it("returns error with suggestions for not found", async () => {
    const result = await client.callTool({ name: "character_versions", arguments: { character_name: "Rapunzel" } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("No character found");
  });
});
```

**Step 4: Run tests, commit**

```bash
git add src/tools/character-versions.ts tests/tools/character-versions.test.ts src/server.ts
git commit -m "feat: add character_versions tool for comparing character printings"
```

---

### Task 7: Tool — browse_franchise

**Files:**
- Create: `src/tools/browse-franchise.ts`
- Create: `tests/tools/browse-franchise.test.ts`

**Step 1: Write the tool**

File: `src/tools/browse-franchise.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { listFranchises, getCardsByFranchise } from "../data/db.js";
import type { CardRow } from "../types.js";

function computeFranchiseStats(cards: CardRow[]): string {
  const colors: Record<string, number> = {};
  const types: Record<string, number> = {};
  const rarities: Record<string, number> = {};
  const sets = new Set<string>();

  for (const card of cards) {
    colors[card.color || "None"] = (colors[card.color || "None"] || 0) + 1;
    types[card.type] = (types[card.type] || 0) + 1;
    rarities[card.rarity] = (rarities[card.rarity] || 0) + 1;
    sets.add(card.set_code);
  }

  const lines = [
    `Total cards: ${cards.length}`,
    `Ink colors: ${Object.entries(colors).map(([k, v]) => `${k} (${v})`).join(", ")}`,
    `Types: ${Object.entries(types).map(([k, v]) => `${k} (${v})`).join(", ")}`,
    `Rarities: ${Object.entries(rarities).map(([k, v]) => `${k} (${v})`).join(", ")}`,
    `Appears in sets: ${[...sets].sort().join(", ")}`,
  ];
  return lines.join("\n");
}

export function registerBrowseFranchise(server: McpServer, db: Database.Database): void {
  server.registerTool("browse_franchise", {
    title: "Browse Franchise",
    description: "Browse Disney Lorcana cards by Disney franchise (e.g., Frozen, The Little Mermaid, Hercules). Without a franchise name, lists all franchises with card counts. With a franchise name, shows all cards from that franchise plus summary statistics.",
    inputSchema: {
      franchise: z.string().optional().describe("Disney franchise name (e.g., 'Frozen', 'Moana'). Omit to list all franchises."),
    },
  }, async ({ franchise }) => {
    if (!franchise) {
      const franchises = listFranchises(db);
      const text = "Disney Franchises in Lorcana:\n\n" +
        franchises.map((f) => `  ${f.story} (${f.count} cards)`).join("\n");
      return { content: [{ type: "text" as const, text }] };
    }

    const cards = getCardsByFranchise(db, franchise);

    if (cards.length === 0) {
      // Partial match suggestions
      const all = listFranchises(db);
      const suggestions = all
        .filter((f) => f.story.toLowerCase().includes(franchise.toLowerCase()))
        .slice(0, 5);

      const suggest = suggestions.length > 0
        ? ` Did you mean: ${suggestions.map((s) => s.story).join(", ")}?`
        : ` Use browse_franchise without a name to see all available franchises.`;

      return {
        isError: true,
        content: [{ type: "text" as const, text: `No franchise matching "${franchise}" found.${suggest}` }],
      };
    }

    const stats = computeFranchiseStats(cards);
    const cardList = cards.map((c) => {
      const stats = c.strength !== null ? ` | ${c.strength}/${c.willpower}/${c.lore}` : "";
      return `  ${c.full_name} [${c.color} ${c.type}, Cost ${c.cost}${stats}, ${c.rarity}]`;
    }).join("\n");

    return {
      content: [{ type: "text" as const, text: `Franchise: ${franchise}\n\n${stats}\n\nCards:\n${cardList}` }],
    };
  });
}
```

**Step 2: Register in server.ts**

**Step 3: Write tests**

File: `tests/tools/browse-franchise.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("browse_franchise tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("lists all franchises", async () => {
    const result = await client.callTool({ name: "browse_franchise", arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Frozen");
    expect(text).toContain("Moana");
    expect(text).toContain("cards)");
  });

  it("browses a specific franchise", async () => {
    const result = await client.callTool({ name: "browse_franchise", arguments: { franchise: "Frozen" } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Franchise: Frozen");
    expect(text).toContain("Elsa");
    expect(text).toContain("Total cards:");
    expect(text).toContain("Ink colors:");
  });

  it("returns error with suggestions for unknown franchise", async () => {
    const result = await client.callTool({ name: "browse_franchise", arguments: { franchise: "Cars" } });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("not found");
  });

  it("suggests partial matches", async () => {
    const result = await client.callTool({ name: "browse_franchise", arguments: { franchise: "Little" } });
    // Should suggest "The Little Mermaid" or return its results
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Little Mermaid");
  });
});
```

**Step 4: Run tests, commit**

```bash
git add src/tools/browse-franchise.ts tests/tools/browse-franchise.test.ts src/server.ts
git commit -m "feat: add browse_franchise tool for Disney franchise browsing"
```

---

### Task 8: Deck Parser & analyze_ink_curve Tool

**Files:**
- Create: `src/lib/deck-parser.ts`
- Create: `src/tools/analyze-ink-curve.ts`
- Create: `tests/lib/deck-parser.test.ts`
- Create: `tests/tools/analyze-ink-curve.test.ts`

**Step 1: Write deck parser**

File: `src/lib/deck-parser.ts`

```typescript
import type Database from "better-sqlite3";
import { getCardByName } from "../data/db.js";
import type { CardRow, DeckEntry } from "../types.js";

export interface ResolvedDeckEntry {
  quantity: number;
  card: CardRow;
}

export interface DeckParseResult {
  entries: ResolvedDeckEntry[];
  unrecognized: string[];
}

export function parseDeckList(text: string): DeckEntry[] {
  const entries: DeckEntry[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Match: "2 Elsa - Snow Queen" or "2x Elsa - Snow Queen" or "2 Elsa"
    const match = line.match(/^(\d+)x?\s+(.+?)(?:\s*-\s*(.+))?$/);
    if (match) {
      entries.push({
        quantity: parseInt(match[1], 10),
        cardName: match[2].trim(),
        version: match[3]?.trim(),
      });
    }
  }

  return entries;
}

export function resolveDeck(db: Database.Database, entries: DeckEntry[]): DeckParseResult {
  const resolved: ResolvedDeckEntry[] = [];
  const unrecognized: string[] = [];

  for (const entry of entries) {
    const card = getCardByName(db, entry.cardName, entry.version);
    if (card) {
      resolved.push({ quantity: entry.quantity, card });
    } else {
      const display = entry.version ? `${entry.cardName} - ${entry.version}` : entry.cardName;
      unrecognized.push(display);
    }
  }

  return { entries: resolved, unrecognized };
}
```

**Step 2: Write deck parser tests**

File: `tests/lib/deck-parser.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeckList, resolveDeck } from "../../src/lib/deck-parser.js";
import { seedTestData } from "../helpers/test-db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("deck parser", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(":memory:");
    const schema = readFileSync(join(__dirname, "../../src/data/schema.sql"), "utf-8");
    db.exec(schema);
    seedTestData(db);
  });

  describe("parseDeckList", () => {
    it("parses standard format", () => {
      const entries = parseDeckList("2 Elsa - Snow Queen\n3 Mickey Mouse - Brave Little Tailor");
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ quantity: 2, cardName: "Elsa", version: "Snow Queen" });
      expect(entries[1]).toEqual({ quantity: 3, cardName: "Mickey Mouse", version: "Brave Little Tailor" });
    });

    it("parses without version", () => {
      const entries = parseDeckList("4 A Whole New World");
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({ quantity: 4, cardName: "A Whole New World", version: undefined });
    });

    it("handles 'x' quantity format", () => {
      const entries = parseDeckList("2x Elsa - Snow Queen");
      expect(entries[0].quantity).toBe(2);
    });

    it("skips empty lines", () => {
      const entries = parseDeckList("2 Elsa - Snow Queen\n\n3 Ariel - On Human Legs");
      expect(entries).toHaveLength(2);
    });
  });

  describe("resolveDeck", () => {
    it("resolves known cards", () => {
      const entries = parseDeckList("2 Elsa - Snow Queen\n1 Mickey Mouse - Brave Little Tailor");
      const { entries: resolved, unrecognized } = resolveDeck(db, entries);
      expect(resolved).toHaveLength(2);
      expect(unrecognized).toHaveLength(0);
    });

    it("flags unrecognized cards", () => {
      const entries = parseDeckList("2 Elsa - Snow Queen\n1 Nonexistent Card");
      const { entries: resolved, unrecognized } = resolveDeck(db, entries);
      expect(resolved).toHaveLength(1);
      expect(unrecognized).toContain("Nonexistent Card");
    });
  });
});
```

**Step 3: Write analyze_ink_curve tool**

File: `src/tools/analyze-ink-curve.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { parseDeckList, resolveDeck } from "../lib/deck-parser.js";

export function registerAnalyzeInkCurve(server: McpServer, db: Database.Database): void {
  server.registerTool("analyze_ink_curve", {
    title: "Analyze Ink Curve",
    description: "Analyze a Lorcana deck list's ink distribution. Shows ink cost histogram, inkable vs non-inkable ratio, ink color distribution, and average cost. Flags unusual ink ratios. Provide deck as text with format '2 Card Name - Version' per line.",
    inputSchema: {
      deck_list: z.string().describe("Deck list in text format, one card per line: '2 Elsa - Snow Queen'"),
    },
  }, async ({ deck_list }) => {
    const entries = parseDeckList(deck_list);
    if (entries.length === 0) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "Could not parse any cards from the deck list. Use format: '2 Card Name - Version' per line." }],
      };
    }

    const { entries: resolved, unrecognized } = resolveDeck(db, entries);

    if (resolved.length === 0) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `No recognized cards found. Unrecognized: ${unrecognized.join(", ")}` }],
      };
    }

    // Compute stats
    let totalCards = 0;
    let inkableCount = 0;
    let nonInkableCount = 0;
    let totalCost = 0;
    const costHistogram: Record<number, number> = {};
    const colorDistribution: Record<string, number> = {};

    for (const { quantity, card } of resolved) {
      totalCards += quantity;
      if (card.inkwell) {
        inkableCount += quantity;
      } else {
        nonInkableCount += quantity;
      }
      totalCost += card.cost * quantity;
      costHistogram[card.cost] = (costHistogram[card.cost] || 0) + quantity;
      const color = card.color || "None";
      colorDistribution[color] = (colorDistribution[color] || 0) + quantity;
    }

    const avgCost = totalCost / totalCards;
    const inkablePercent = Math.round((inkableCount / totalCards) * 100);

    // Build output
    const lines: string[] = [`Ink Curve Analysis (${totalCards} cards, ${resolved.length} unique)`];
    lines.push("");

    // Cost histogram
    const maxCost = Math.max(...Object.keys(costHistogram).map(Number));
    lines.push("Cost Distribution:");
    for (let i = 0; i <= maxCost; i++) {
      const count = costHistogram[i] || 0;
      if (count > 0) {
        const bar = "█".repeat(count);
        lines.push(`  ${i}: ${bar} (${count})`);
      }
    }
    lines.push(`  Average cost: ${avgCost.toFixed(1)}`);
    lines.push("");

    // Inkwell ratio
    lines.push(`Inkwell Ratio: ${inkableCount} inkable (${inkablePercent}%) / ${nonInkableCount} non-inkable (${100 - inkablePercent}%)`);
    if (inkablePercent < 40) {
      lines.push("  ⚠ Low inkable ratio — may struggle to play ink consistently.");
    } else if (inkablePercent > 70) {
      lines.push("  ⚠ High inkable ratio — few cards are protected from being inked.");
    }
    lines.push("");

    // Color distribution
    lines.push("Ink Colors:");
    for (const [color, count] of Object.entries(colorDistribution).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${color}: ${count} cards (${Math.round((count / totalCards) * 100)}%)`);
    }
    const colorCount = Object.keys(colorDistribution).length;
    if (colorCount > 2) {
      lines.push(`  ⚠ ${colorCount} ink colors — Lorcana decks typically use 1-2 colors.`);
    }

    // Unrecognized
    if (unrecognized.length > 0) {
      lines.push("");
      lines.push(`Unrecognized cards (not analyzed): ${unrecognized.join(", ")}`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  });
}
```

**Step 4: Write tests**

File: `tests/tools/analyze-ink-curve.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("analyze_ink_curve tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("analyzes a valid deck list", async () => {
    const result = await client.callTool({
      name: "analyze_ink_curve",
      arguments: { deck_list: "2 Elsa - Snow Queen\n3 Mickey Mouse - Brave Little Tailor\n2 A Whole New World" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Ink Curve Analysis");
    expect(text).toContain("Cost Distribution:");
    expect(text).toContain("Inkwell Ratio:");
    expect(text).toContain("Ink Colors:");
  });

  it("flags unrecognized cards", async () => {
    const result = await client.callTool({
      name: "analyze_ink_curve",
      arguments: { deck_list: "2 Elsa - Snow Queen\n1 Unknown Card" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Unrecognized cards");
    expect(text).toContain("Unknown Card");
  });

  it("shows multi-color distribution", async () => {
    const result = await client.callTool({
      name: "analyze_ink_curve",
      arguments: { deck_list: "2 Elsa - Snow Queen\n2 Mickey Mouse - Brave Little Tailor\n2 Ariel - On Human Legs" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Amethyst");
    expect(text).toContain("Amber");
    expect(text).toContain("Emerald");
    expect(text).toContain("3 ink colors");
  });

  it("returns error for empty deck", async () => {
    const result = await client.callTool({
      name: "analyze_ink_curve",
      arguments: { deck_list: "" },
    });
    expect(result.isError).toBe(true);
  });
});
```

**Step 5: Register in server.ts, run tests, commit**

```bash
git add src/lib/deck-parser.ts src/tools/analyze-ink-curve.ts tests/lib/deck-parser.test.ts tests/tools/analyze-ink-curve.test.ts src/server.ts
git commit -m "feat: add deck parser and analyze_ink_curve tool"
```

---

### Task 9: Tool — analyze_lore

**Files:**
- Create: `src/tools/analyze-lore.ts`
- Create: `tests/tools/analyze-lore.test.ts`

**Step 1: Write the tool**

File: `src/tools/analyze-lore.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { parseDeckList, resolveDeck } from "../lib/deck-parser.js";
import { getTopLoreGenerators } from "../data/db.js";

export function registerAnalyzeLore(server: McpServer, db: Database.Database): void {
  server.registerTool("analyze_lore", {
    title: "Analyze Lore",
    description: "Analyze lore generation potential. Two modes: (1) Provide a deck_list to analyze deck's lore output — total potential, per-character efficiency, top generators. (2) Without a deck_list, query top lore generators from the database filtered by ink color or cost range.",
    inputSchema: {
      deck_list: z.string().optional().describe("Deck list to analyze (format: '2 Card Name - Version' per line). Omit to query top lore generators."),
      ink: z.string().optional().describe("Filter by ink color when querying top generators"),
      cost_min: z.number().optional().describe("Min cost filter for top generators query"),
      cost_max: z.number().optional().describe("Max cost filter for top generators query"),
      limit: z.number().optional().default(20).describe("Max results for top generators query"),
    },
  }, async ({ deck_list, ink, cost_min, cost_max, limit }) => {
    // Query mode — top lore generators
    if (!deck_list) {
      const top = getTopLoreGenerators(db, { ink, costMin: cost_min, costMax: cost_max, limit });

      if (top.length === 0) {
        return { content: [{ type: "text" as const, text: "No characters found matching filters." }] };
      }

      const lines = ["Top Lore Generators:", ""];
      for (const card of top) {
        const efficiency = card.cost > 0 ? (card.lore! / card.cost).toFixed(2) : "∞";
        lines.push(`  ${card.full_name} — Lore: ${card.lore}, Cost: ${card.cost}, Efficiency: ${efficiency} lore/cost [${card.color}, ${card.rarity}]`);
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }

    // Deck mode
    const entries = parseDeckList(deck_list);
    if (entries.length === 0) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "Could not parse deck list." }],
      };
    }

    const { entries: resolved, unrecognized } = resolveDeck(db, entries);

    let totalLore = 0;
    let characterCount = 0;
    const loreEntries: { name: string; lore: number; cost: number; quantity: number; efficiency: number }[] = [];

    for (const { quantity, card } of resolved) {
      if (card.type === "Character" && card.lore !== null && card.lore > 0) {
        totalLore += card.lore * quantity;
        characterCount += quantity;
        const efficiency = card.cost > 0 ? card.lore / card.cost : Infinity;
        loreEntries.push({ name: card.full_name, lore: card.lore, cost: card.cost, quantity, efficiency });
      }
    }

    loreEntries.sort((a, b) => b.efficiency - a.efficiency);

    const lines = [`Lore Analysis (${resolved.reduce((sum, e) => sum + e.quantity, 0)} cards)`, ""];
    lines.push(`Total lore potential: ${totalLore} (from ${characterCount} characters)`);
    lines.push(`Average lore per character: ${characterCount > 0 ? (totalLore / characterCount).toFixed(1) : "0"}`);
    lines.push("");
    lines.push("Characters by Lore Efficiency (lore/cost):");
    for (const entry of loreEntries) {
      lines.push(`  ${entry.name} — Lore: ${entry.lore}, Cost: ${entry.cost}, Efficiency: ${entry.efficiency.toFixed(2)}, Qty: ${entry.quantity}`);
    }

    const nonCharacters = resolved.filter((e) => e.card.type !== "Character").reduce((sum, e) => sum + e.quantity, 0);
    if (nonCharacters > 0) {
      lines.push("");
      lines.push(`(${nonCharacters} non-character cards excluded from lore calculations)`);
    }

    if (unrecognized.length > 0) {
      lines.push("");
      lines.push(`Unrecognized cards: ${unrecognized.join(", ")}`);
    }

    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  });
}
```

**Step 2: Write tests**

File: `tests/tools/analyze-lore.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("analyze_lore tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("analyzes deck lore potential", async () => {
    const result = await client.callTool({
      name: "analyze_lore",
      arguments: { deck_list: "2 Elsa - Snow Queen\n2 Elsa - Spirit of Winter\n2 Mickey Mouse - Brave Little Tailor" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Lore Analysis");
    expect(text).toContain("Total lore potential:");
    expect(text).toContain("Efficiency");
  });

  it("excludes non-character cards from lore calculations", async () => {
    const result = await client.callTool({
      name: "analyze_lore",
      arguments: { deck_list: "2 Elsa - Snow Queen\n2 A Whole New World" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("non-character cards excluded");
  });

  it("queries top lore generators without deck", async () => {
    const result = await client.callTool({
      name: "analyze_lore",
      arguments: { limit: 5 },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Top Lore Generators");
  });

  it("filters top generators by ink", async () => {
    const result = await client.callTool({
      name: "analyze_lore",
      arguments: { ink: "Amethyst", limit: 5 },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Amethyst");
  });
});
```

**Step 3: Register in server.ts, run tests, commit**

```bash
git add src/tools/analyze-lore.ts tests/tools/analyze-lore.test.ts src/server.ts
git commit -m "feat: add analyze_lore tool for deck and query lore analysis"
```

---

### Task 10: Tool — find_song_synergies

**Files:**
- Create: `src/tools/find-song-synergies.ts`
- Create: `tests/tools/find-song-synergies.test.ts`

**Step 1: Write the tool**

File: `src/tools/find-song-synergies.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Database from "better-sqlite3";
import { z } from "zod";
import { getSongCards, getCharactersByMinCost, getSongsByMaxCost, getCardByName } from "../data/db.js";
import type { CardRow } from "../types.js";

export function registerFindSongSynergies(server: McpServer, db: Database.Database): void {
  server.registerTool("find_song_synergies", {
    title: "Find Song Synergies",
    description: "Find Lorcana song/character synergies. A character can sing a song for free if the character's ink cost >= the song's ink cost. Three modes: (1) Provide a song name to find which characters can sing it. (2) Provide a character name to find which songs they can sing. (3) Omit card_name to browse all songs with singer counts.",
    inputSchema: {
      card_name: z.string().optional().describe("Card name — a Song name to find singers, or a Character name to find singable songs. Omit to browse all songs."),
      ink: z.string().optional().describe("Filter results by ink color"),
    },
  }, async ({ card_name, ink }) => {
    // Browse mode — list all songs
    if (!card_name) {
      const songs = getSongCards(db);
      const lines = ["All Lorcana Songs:", ""];
      for (const song of songs) {
        const singerCount = getCharactersByMinCost(db, song.cost, ink).length;
        lines.push(`  ${song.full_name} [${song.color}, Cost ${song.cost}] — ${singerCount} characters can sing this${ink ? ` (${ink} only)` : ""}`);
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }

    // Check if it's a song or character
    const card = getCardByName(db, card_name);

    if (!card) {
      // Try partial match
      const suggestions = db.prepare(
        "SELECT DISTINCT full_name FROM cards WHERE name LIKE @pattern OR full_name LIKE @pattern ORDER BY name LIMIT 5"
      ).all({ pattern: `%${card_name}%` }) as { full_name: string }[];

      const suggest = suggestions.length > 0
        ? ` Did you mean: ${suggestions.map((s) => s.full_name).join(", ")}?`
        : "";
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Card "${card_name}" not found.${suggest}` }],
      };
    }

    const isSong = card.subtypes_text.includes("Song");

    if (isSong) {
      // Song mode — find characters that can sing it
      const singers = getCharactersByMinCost(db, card.cost, ink);
      const lines = [`Song: ${card.full_name} [${card.color}, Cost ${card.cost}]`, ""];
      lines.push(`Text: ${card.full_text}`);
      lines.push("");
      lines.push(`Characters that can sing this for free (cost >= ${card.cost})${ink ? ` [${ink} only]` : ""}:`);

      if (singers.length === 0) {
        lines.push("  (none found matching filters)");
      } else {
        // Group by color
        const byColor = new Map<string, CardRow[]>();
        for (const s of singers) {
          if (!byColor.has(s.color)) byColor.set(s.color, []);
          byColor.get(s.color)!.push(s);
        }
        for (const [color, chars] of byColor) {
          lines.push(`\n  ${color} (${chars.length}):`);
          for (const c of chars.slice(0, 10)) {
            lines.push(`    ${c.full_name} [Cost ${c.cost}, ${c.strength}/${c.willpower}/${c.lore}]`);
          }
          if (chars.length > 10) lines.push(`    ... and ${chars.length - 10} more`);
        }
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }

    if (card.type === "Character") {
      // Character mode — find songs they can sing
      const songs = getSongsByMaxCost(db, card.cost, ink);
      const lines = [`Character: ${card.full_name} [${card.color}, Cost ${card.cost}]`, ""];
      lines.push(`Songs this character can sing for free (song cost <= ${card.cost})${ink ? ` [${ink} only]` : ""}:`);

      if (songs.length === 0) {
        lines.push("  (no songs found — this character's cost may be too low)");
      } else {
        for (const s of songs) {
          lines.push(`  ${s.full_name} [${s.color}, Cost ${s.cost}]: ${s.full_text}`);
        }
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }

    return {
      isError: true,
      content: [{ type: "text" as const, text: `"${card.full_name}" is a ${card.type}, not a Song or Character. Song synergies only apply to Songs and Characters.` }],
    };
  });
}
```

**Step 2: Write tests**

File: `tests/tools/find-song-synergies.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "../helpers/test-db.js";

describe("find_song_synergies tool", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("finds characters that can sing a song", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: { card_name: "A Whole New World" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Song: A Whole New World");
    expect(text).toContain("cost >= 5");
    // Elsa Spirit of Winter (6) and Hades (7) should appear
    expect(text).toContain("Elsa");
    expect(text).toContain("Hades");
  });

  it("finds songs a character can sing", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: { card_name: "Elsa" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Character:");
    expect(text).toContain("Songs this character can sing");
    // Elsa Snow Queen (cost 4) can sing Let It Go (cost 3)
    expect(text).toContain("Let It Go");
  });

  it("browses all songs without card_name", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: {},
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("All Lorcana Songs");
    expect(text).toContain("A Whole New World");
    expect(text).toContain("Let It Go");
    expect(text).toContain("characters can sing");
  });

  it("filters by ink color", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: { card_name: "Let It Go", ink: "Amethyst" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Amethyst");
  });

  it("returns error for non-existent card", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: { card_name: "Nonexistent" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("not found");
  });

  it("returns error for non-song/character card", async () => {
    const result = await client.callTool({
      name: "find_song_synergies",
      arguments: { card_name: "Maui's Fish Hook" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("Item");
  });
});
```

**Step 3: Register in server.ts, run tests, commit**

```bash
git add src/tools/find-song-synergies.ts tests/tools/find-song-synergies.test.ts src/server.ts
git commit -m "feat: add find_song_synergies tool for song/character cost matching"
```

---

### Task 11: Integration Tests & Server Smoke Test

**Files:**
- Create: `tests/server.test.ts`

**Step 1: Write server smoke test**

File: `tests/server.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "./helpers/test-db.js";

describe("lorcana-oracle server", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("lists all 7 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_cards");
    expect(names).toContain("browse_sets");
    expect(names).toContain("character_versions");
    expect(names).toContain("browse_franchise");
    expect(names).toContain("analyze_ink_curve");
    expect(names).toContain("analyze_lore");
    expect(names).toContain("find_song_synergies");
    expect(tools).toHaveLength(7);
  });

  it("each tool has a description", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(20);
    }
  });
});
```

**Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tests/server.test.ts
git commit -m "test: add server smoke test verifying all 7 tools"
```

---

### Task 12: Fetch Data & Build

**Step 1: Fetch LorcanaJSON data and build the SQLite database**

Run: `npm run fetch-data`
Expected: Outputs card/set counts, creates `src/data/lorcana.sqlite`

**Step 2: Build the TypeScript project**

Run: `npm run build`
Expected: Compiles to `dist/`, copies schema.sql and lorcana.sqlite to `dist/data/`

**Step 3: Verify npx execution**

Run: `node dist/server.js` (Ctrl+C after confirming it starts without errors)

**Step 4: Run tests one final time**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/data/lorcana.sqlite
git commit -m "feat: add LorcanaJSON data (v2.3.2, ~2710 cards)"
```

---

### Task 13: README, status.json, GitHub Repo

**Step 1: Update README.md**

Follow the MCP server badge pattern from CLAUDE.md. Include:
- Badge pills (npm, downloads, node, MCP compatible, MIT, sponsor)
- One-line description
- Features list (7 tools)
- Install instructions (npx, Claude Desktop config, Claude Code config)
- Tool documentation with example queries
- Data source attribution (LorcanaJSON, MIT, Ravensburger Community Code)
- License

**Step 2: Create status.json**

```json
{
  "version": "0.1.0",
  "tools_count": 7,
  "tests_count": 0,
  "npm": { "published": false, "version": null },
  "glama": { "listed": false, "score_badge": false, "ownership_claimed": false },
  "mcp_registry": { "registered": false, "mcp_name": "io.github.gregario/lorcana-oracle" },
  "awesome_mcp_servers": { "pr_submitted": false, "pr_url": null },
  "github": { "release_tag": null, "sponsor_enabled": false },
  "ci": { "oidc_publishing": false, "workflow": null }
}
```

Update `tests_count` with actual count after running `npm test`.

**Step 3: Create GitHub repo and push**

```bash
gh repo create gregario/lorcana-oracle --public --description "Disney Lorcana TCG MCP server — card search, deck analysis, and franchise browsing" --source .
git push -u origin main
```

**Step 4: Commit README and status**

```bash
git add README.md status.json
git commit -m "docs: add README with badges and status.json"
git push
```
