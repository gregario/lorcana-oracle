import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CardRow, SetRow, SearchFilters } from '../types.js';

const DB_FILENAME = 'lorcana.sqlite';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

export function getDatabase(dataDir?: string): Database.Database {
  let db: Database.Database;
  if (dataDir === ':memory:') {
    db = new Database(':memory:');
  } else {
    const dir = dataDir ?? __dirname;
    const dbPath = dir.endsWith('.sqlite') ? dir : path.join(dir, DB_FILENAME);
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    db = new Database(dbPath);
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

function initializeSchema(db: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
}

// -- FTS helpers --

export function sanitizeFtsQuery(query: string): string {
  // Remove FTS5 special characters, wrap each token in quotes
  const cleaned = query.replace(/[*":()^~{}<>]/g, '');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
  return tokens.map((t) => `"${t}"`).join(' ');
}

// -- Search & query functions --

export interface SearchResult {
  rows: CardRow[];
  total: number;
}

export function searchCards(
  db: Database.Database,
  filters: SearchFilters,
): SearchResult {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.query) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery.length > 0) {
      conditions.push(
        'c.id IN (SELECT rowid FROM cards_fts WHERE cards_fts MATCH ?)',
      );
      params.push(ftsQuery);
    }
  }

  if (filters.color) {
    conditions.push('LOWER(c.color) = LOWER(?)');
    params.push(filters.color);
  }

  if (filters.type) {
    conditions.push('LOWER(c.type) = LOWER(?)');
    params.push(filters.type);
  }

  if (filters.cost !== undefined) {
    const op = filters.costOp ?? 'eq';
    const sqlOp = op === 'lte' ? '<=' : op === 'gte' ? '>=' : '=';
    conditions.push(`c.cost ${sqlOp} ?`);
    params.push(filters.cost);
  }

  if (filters.costMin !== undefined) {
    conditions.push('c.cost >= ?');
    params.push(filters.costMin);
  }

  if (filters.costMax !== undefined) {
    conditions.push('c.cost <= ?');
    params.push(filters.costMax);
  }

  if (filters.rarity) {
    conditions.push('LOWER(c.rarity) = LOWER(?)');
    params.push(filters.rarity);
  }

  if (filters.setCode) {
    conditions.push('c.set_code = ?');
    params.push(filters.setCode);
  }

  if (filters.story) {
    conditions.push('LOWER(c.story) = LOWER(?)');
    params.push(filters.story);
  }

  if (filters.inkwell !== undefined) {
    conditions.push('c.inkwell = ?');
    params.push(filters.inkwell ? 1 : 0);
  }

  if (filters.hasKeyword) {
    conditions.push('c.keyword_abilities LIKE ?');
    params.push(`%${filters.hasKeyword}%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM cards c ${where}`)
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `SELECT c.* FROM cards c ${where} ORDER BY c.cost ASC, c.name ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as CardRow[];

  return { rows, total: countRow.count };
}

export function getCardByName(
  db: Database.Database,
  name: string,
): CardRow | undefined {
  return db
    .prepare('SELECT * FROM cards WHERE LOWER(full_name) = LOWER(?) OR LOWER(name) = LOWER(?)')
    .get(name, name) as CardRow | undefined;
}

export function getCardsByCharacterName(
  db: Database.Database,
  characterName: string,
): CardRow[] {
  return db
    .prepare(
      'SELECT * FROM cards WHERE LOWER(name) = LOWER(?) ORDER BY cost ASC',
    )
    .all(characterName) as CardRow[];
}

export function listSets(db: Database.Database): SetRow[] {
  return db
    .prepare('SELECT * FROM sets ORDER BY release_date ASC')
    .all() as SetRow[];
}

export function getSet(
  db: Database.Database,
  code: string,
): SetRow | undefined {
  return db
    .prepare('SELECT * FROM sets WHERE code = ?')
    .get(code) as SetRow | undefined;
}

export function getCardsBySet(
  db: Database.Database,
  setCode: string,
  limit = 20,
  offset = 0,
): SearchResult {
  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM cards WHERE set_code = ?')
    .get(setCode) as { count: number };
  const rows = db
    .prepare(
      'SELECT * FROM cards WHERE set_code = ? ORDER BY number ASC LIMIT ? OFFSET ?',
    )
    .all(setCode, limit, offset) as CardRow[];
  return { rows, total: countRow.count };
}

export function listFranchises(db: Database.Database): { story: string; count: number }[] {
  return db
    .prepare(
      "SELECT story, COUNT(*) as count FROM cards WHERE story IS NOT NULL AND story != '' GROUP BY story ORDER BY count DESC",
    )
    .all() as { story: string; count: number }[];
}

export function getCardsByFranchise(
  db: Database.Database,
  franchise: string,
  limit = 20,
  offset = 0,
): SearchResult {
  const countRow = db
    .prepare(
      'SELECT COUNT(*) as count FROM cards WHERE LOWER(story) = LOWER(?)',
    )
    .get(franchise) as { count: number };
  const rows = db
    .prepare(
      'SELECT * FROM cards WHERE LOWER(story) = LOWER(?) ORDER BY cost ASC, name ASC LIMIT ? OFFSET ?',
    )
    .all(franchise, limit, offset) as CardRow[];
  return { rows, total: countRow.count };
}

export function getSongCards(
  db: Database.Database,
  maxCost?: number,
): CardRow[] {
  if (maxCost !== undefined) {
    return db
      .prepare(
        "SELECT * FROM cards WHERE LOWER(type) = 'song' AND cost <= ? ORDER BY cost ASC, name ASC",
      )
      .all(maxCost) as CardRow[];
  }
  return db
    .prepare(
      "SELECT * FROM cards WHERE LOWER(type) = 'song' ORDER BY cost ASC, name ASC",
    )
    .all() as CardRow[];
}

export function getCharactersByMinCost(
  db: Database.Database,
  minCost: number,
): CardRow[] {
  return db
    .prepare(
      "SELECT * FROM cards WHERE LOWER(type) = 'character' AND cost >= ? ORDER BY cost ASC, name ASC",
    )
    .all(minCost) as CardRow[];
}

export function getSongsByMaxCost(
  db: Database.Database,
  maxCost: number,
): CardRow[] {
  return getSongCards(db, maxCost);
}

export function getTopLoreGenerators(
  db: Database.Database,
  limit = 10,
): CardRow[] {
  return db
    .prepare(
      'SELECT * FROM cards WHERE lore IS NOT NULL AND lore > 0 ORDER BY lore DESC, cost ASC LIMIT ?',
    )
    .all(limit) as CardRow[];
}
