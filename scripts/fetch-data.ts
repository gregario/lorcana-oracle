/**
 * Fetches LorcanaJSON data and ingests it into SQLite.
 *
 * Usage: npx tsx scripts/fetch-data.ts
 */
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const DB_PATH = path.join(DATA_DIR, 'lorcana.sqlite');
const SCHEMA_PATH = path.join(DATA_DIR, 'schema.sql');
const ALL_CARDS_URL = 'https://lorcanajson.org/files/current/en/allCards.json';

// ── Types ──

export interface LorcanaCardImage {
  full?: string;
  thumbnail?: string;
  foil?: string;
  artCrop?: string;
}

export interface LorcanaCard {
  id: number;
  name: string;
  fullName: string;
  simpleName: string;
  version: string | null;
  type: string;
  color: string;
  cost: number | null;
  inkwell: boolean;
  strength: number | null;
  willpower: number | null;
  lore: number | null;
  moveCost: number | null;
  rarity: string;
  number: number;
  setCode: string;
  fullText: string | null;
  subtypes: string[] | null;
  subtypesText: string | null;
  story: string | null;
  keywordAbilities: string[] | null;
  flavorText: string | null;
  artists: string[];
  artistsText: string | null;
  images: LorcanaCardImage;
  baseId: number | null;
  enchantedId: number | null;
  epicId: number | null;
  iconicId: number | null;
  reprintedAsIds: number[] | null;
  reprintOfId: number | null;
}

export interface TransformedCard {
  id: number;
  name: string;
  full_name: string;
  simple_name: string;
  version: string | null;
  type: string;
  color: string;
  cost: number | null;
  inkwell: number;
  strength: number | null;
  willpower: number | null;
  lore: number | null;
  move_cost: number | null;
  rarity: string;
  number: number;
  set_code: string;
  full_text: string | null;
  subtypes: string | null;
  subtypes_text: string | null;
  story: string | null;
  keyword_abilities: string | null;
  flavor_text: string | null;
  artists: string | null;
  image_url: string | null;
  base_id: number | null;
  enchanted_id: number | null;
  epic_id: number | null;
  iconic_id: number | null;
  reprinted_as_ids: string | null;
  reprint_of_id: number | null;
}

// ── Transform ──

export function transformCard(card: LorcanaCard): TransformedCard {
  return {
    id: card.id,
    name: card.name,
    full_name: card.fullName ?? card.name,
    simple_name: card.simpleName ?? card.name.toLowerCase(),
    version: card.version ?? null,
    type: card.type,
    color: card.color,
    cost: card.cost ?? null,
    inkwell: card.inkwell ? 1 : 0,
    strength: card.strength ?? null,
    willpower: card.willpower ?? null,
    lore: card.lore ?? null,
    move_cost: card.moveCost ?? null,
    rarity: card.rarity,
    number: card.number,
    set_code: card.setCode,
    full_text: card.fullText ?? null,
    subtypes: card.subtypes ? JSON.stringify(card.subtypes) : null,
    subtypes_text: card.subtypesText ?? null,
    story: card.story ?? null,
    keyword_abilities: card.keywordAbilities
      ? JSON.stringify(card.keywordAbilities)
      : null,
    flavor_text: card.flavorText ?? null,
    artists: card.artists ? JSON.stringify(card.artists) : null,
    image_url: card.images?.full ?? card.images?.thumbnail ?? null,
    base_id: card.baseId ?? null,
    enchanted_id: card.enchantedId ?? null,
    epic_id: card.epicId ?? null,
    iconic_id: card.iconicId ?? null,
    reprinted_as_ids: card.reprintedAsIds
      ? JSON.stringify(card.reprintedAsIds)
      : null,
    reprint_of_id: card.reprintOfId ?? null,
  };
}

// ── Response shape ──

interface LorcanaSet {
  name: string;
  number: number;
  type: string;
  releaseDate?: string;
  prereleaseDate?: string;
  hasAllCards?: boolean;
}

interface LorcanaResponse {
  metadata?: unknown;
  sets: Record<string, LorcanaSet>;
  cards: LorcanaCard[];
}

// ── Ingestion ──

async function fetchAndIngest(): Promise<void> {
  console.log(`Fetching card data from ${ALL_CARDS_URL}...`);
  const response = await fetch(ALL_CARDS_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = (await response.json()) as LorcanaResponse;
  const cards = data.cards;
  const setsData = data.sets;
  console.log(`Fetched ${cards.length} cards, ${Object.keys(setsData).length} sets`);

  // Delete existing db if present
  const fs = await import('node:fs');
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  // Create fresh database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  // Count cards per set
  const setCardCounts = new Map<string, number>();
  for (const card of cards) {
    setCardCounts.set(
      card.setCode,
      (setCardCounts.get(card.setCode) ?? 0) + 1,
    );
  }

  // Insert sets using set metadata from the response.
  // `released` mirrors LorcanaJSON's `hasAllCards`: 1 when cards are in the
  // feed, 0 for announced-but-pre-release sets so the UX can label them.
  const insertSet = db.prepare(
    'INSERT OR IGNORE INTO sets (code, name, type, release_date, prerelease_date, card_count, released) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const insertSets = db.transaction(() => {
    for (const [code, setInfo] of Object.entries(setsData)) {
      const cardCount = setCardCounts.get(code) ?? 0;
      const released = setInfo.hasAllCards ? 1 : 0;
      insertSet.run(
        code,
        setInfo.name,
        setInfo.type ?? null,
        setInfo.releaseDate ?? null,
        setInfo.prereleaseDate ?? null,
        cardCount,
        released,
      );
    }
  });
  insertSets();
  console.log(`Inserted ${Object.keys(setsData).length} sets`);

  // Insert cards
  const insertCard = db.prepare(
    `INSERT INTO cards (
      id, name, full_name, simple_name, version, type, color, cost, inkwell,
      strength, willpower, lore, move_cost, rarity, number, set_code,
      full_text, subtypes, subtypes_text, story, keyword_abilities,
      flavor_text, artists, image_url, base_id, enchanted_id, epic_id,
      iconic_id, reprinted_as_ids, reprint_of_id
    ) VALUES (
      @id, @name, @full_name, @simple_name, @version, @type, @color, @cost, @inkwell,
      @strength, @willpower, @lore, @move_cost, @rarity, @number, @set_code,
      @full_text, @subtypes, @subtypes_text, @story, @keyword_abilities,
      @flavor_text, @artists, @image_url, @base_id, @enchanted_id, @epic_id,
      @iconic_id, @reprinted_as_ids, @reprint_of_id
    )`,
  );

  const insertCards = db.transaction(() => {
    for (const card of cards) {
      const transformed = transformCard(card);
      insertCard.run(transformed);
    }
  });
  insertCards();
  console.log(`Inserted ${cards.length} cards`);

  db.close();
  console.log(`Database written to ${DB_PATH}`);
}

// Only run when executed directly
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).includes(process.argv[1]);
if (isMain) {
  fetchAndIngest().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
