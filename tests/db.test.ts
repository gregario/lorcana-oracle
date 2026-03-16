import { describe, it, expect, beforeAll } from 'vitest';
import type Database from 'better-sqlite3';
import { getDatabase } from '../src/data/db.js';
import {
  searchCards,
  getCardByName,
  getCardsByCharacterName,
  listSets,
  getSet,
  getCardsBySet,
  listFranchises,
  getCardsByFranchise,
  getSongCards,
  getCharactersByMinCost,
  getSongsByMaxCost,
  getTopLoreGenerators,
  sanitizeFtsQuery,
} from '../src/data/db.js';
import { seedTestData } from './helpers/test-db.js';

let db: Database.Database;

beforeAll(() => {
  db = getDatabase(':memory:');
  seedTestData(db);
});

describe('getDatabase', () => {
  it('creates an in-memory database with schema', () => {
    const testDb = getDatabase(':memory:');
    const tables = testDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('cards');
    expect(tableNames).toContain('sets');
  });

  it('creates FTS virtual table', () => {
    const testDb = getDatabase(':memory:');
    const tables = testDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = 'cards_fts'",
      )
      .all() as { name: string }[];
    expect(tables).toHaveLength(1);
  });
});

describe('sanitizeFtsQuery', () => {
  it('wraps single token in quotes', () => {
    expect(sanitizeFtsQuery('elsa')).toBe('"elsa"');
  });

  it('wraps multiple tokens in quotes', () => {
    expect(sanitizeFtsQuery('snow queen')).toBe('"snow" "queen"');
  });

  it('removes FTS5 special characters', () => {
    expect(sanitizeFtsQuery('elsa*')).toBe('"elsa"');
    expect(sanitizeFtsQuery('"elsa"')).toBe('"elsa"');
  });

  it('handles empty input', () => {
    expect(sanitizeFtsQuery('')).toBe('');
  });
});

describe('searchCards', () => {
  it('returns all cards with no filters', () => {
    const result = searchCards(db, {});
    expect(result.total).toBe(10);
    expect(result.rows.length).toBe(10);
  });

  it('searches by FTS query', () => {
    const result = searchCards(db, { query: 'freeze' });
    expect(result.rows.length).toBeGreaterThan(0);
    // Elsa cards have "Freeze" in their text
    expect(result.rows.some((c) => c.name === 'Elsa')).toBe(true);
  });

  it('filters by color', () => {
    const result = searchCards(db, { color: 'Amethyst' });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((c) => c.color === 'Amethyst')).toBe(true);
  });

  it('filters by color case-insensitively', () => {
    const result = searchCards(db, { color: 'amethyst' });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((c) => c.color === 'Amethyst')).toBe(true);
  });

  it('filters by type', () => {
    const result = searchCards(db, { type: 'Song' });
    expect(result.rows.length).toBe(2);
    expect(result.rows.every((c) => c.type === 'Song')).toBe(true);
  });

  it('filters by exact cost', () => {
    const result = searchCards(db, { cost: 3 });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((c) => c.cost === 3)).toBe(true);
  });

  it('filters by cost lte', () => {
    const result = searchCards(db, { cost: 3, costOp: 'lte' });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((c) => c.cost !== null && c.cost <= 3)).toBe(true);
  });

  it('filters by cost gte', () => {
    const result = searchCards(db, { cost: 5, costOp: 'gte' });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((c) => c.cost !== null && c.cost >= 5)).toBe(true);
  });

  it('filters by rarity', () => {
    const result = searchCards(db, { rarity: 'Legendary' });
    expect(result.rows.length).toBe(2); // Elsa Snow Queen + Hades
    expect(result.rows.every((c) => c.rarity === 'Legendary')).toBe(true);
  });

  it('filters by set code', () => {
    const result = searchCards(db, { setCode: '2' });
    expect(result.rows.length).toBe(2); // Elsa Spirit + Motunui
    expect(result.rows.every((c) => c.set_code === '2')).toBe(true);
  });

  it('filters by story/franchise', () => {
    const result = searchCards(db, { story: 'Frozen' });
    expect(result.rows.length).toBe(4); // 3 Elsas + Let It Go
    expect(result.rows.every((c) => c.story === 'Frozen')).toBe(true);
  });

  it('filters by inkwell', () => {
    const result = searchCards(db, { inkwell: false });
    // Elsa Spirit of Winter (id 3) and Hades (id 8) are not inkable
    expect(result.rows.length).toBe(2);
    expect(result.rows.every((c) => c.inkwell === 0)).toBe(true);
  });

  it('filters by keyword ability', () => {
    const result = searchCards(db, { hasKeyword: 'Shift' });
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe('Elsa');
    expect(result.rows[0].version).toBe('Spirit of Winter');
  });

  it('combines multiple filters', () => {
    const result = searchCards(db, { color: 'Amethyst', type: 'Character' });
    expect(result.rows.length).toBe(3); // 3 Elsa variants
    expect(result.rows.every((c) => c.color === 'Amethyst' && c.type === 'Character')).toBe(true);
  });

  it('paginates with limit and offset', () => {
    const page1 = searchCards(db, { limit: 3, offset: 0 });
    const page2 = searchCards(db, { limit: 3, offset: 3 });
    expect(page1.rows.length).toBe(3);
    expect(page2.rows.length).toBe(3);
    expect(page1.total).toBe(10);
    expect(page2.total).toBe(10);
    // No overlap
    const ids1 = page1.rows.map((c) => c.id);
    const ids2 = page2.rows.map((c) => c.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  it('returns correct total even with limit', () => {
    const result = searchCards(db, { color: 'Amethyst', limit: 1 });
    expect(result.rows.length).toBe(1);
    expect(result.total).toBe(4); // 3 Elsa chars + Let It Go
  });
});

describe('getCardByName', () => {
  it('finds card by full name', () => {
    const card = getCardByName(db, 'Elsa - Snow Queen');
    expect(card).toBeDefined();
    expect(card!.full_name).toBe('Elsa - Snow Queen');
  });

  it('finds card by base name', () => {
    const card = getCardByName(db, 'A Whole New World');
    expect(card).toBeDefined();
    expect(card!.name).toBe('A Whole New World');
  });

  it('is case-insensitive', () => {
    const card = getCardByName(db, 'a whole new world');
    expect(card).toBeDefined();
  });

  it('returns undefined for non-existent card', () => {
    const card = getCardByName(db, 'Nonexistent Card');
    expect(card).toBeUndefined();
  });
});

describe('getCardsByCharacterName', () => {
  it('returns all versions of a character', () => {
    const cards = getCardsByCharacterName(db, 'Elsa');
    expect(cards.length).toBe(3);
    expect(cards.every((c) => c.name === 'Elsa')).toBe(true);
  });

  it('orders by cost ascending', () => {
    const cards = getCardsByCharacterName(db, 'Elsa');
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i].cost!).toBeGreaterThanOrEqual(cards[i - 1].cost!);
    }
  });

  it('returns empty array for non-existent character', () => {
    const cards = getCardsByCharacterName(db, 'Nonexistent');
    expect(cards).toHaveLength(0);
  });
});

describe('listSets', () => {
  it('returns all sets', () => {
    const sets = listSets(db);
    expect(sets.length).toBe(2);
  });

  it('orders by release date ascending', () => {
    const sets = listSets(db);
    expect(sets[0].name).toBe('The First Chapter');
    expect(sets[1].name).toBe('Rise of the Floodborn');
  });
});

describe('getSet', () => {
  it('returns set by code', () => {
    const set = getSet(db, '1');
    expect(set).toBeDefined();
    expect(set!.name).toBe('The First Chapter');
  });

  it('returns undefined for non-existent set', () => {
    const set = getSet(db, 'nonexistent');
    expect(set).toBeUndefined();
  });
});

describe('getCardsBySet', () => {
  it('returns cards for a set', () => {
    const result = getCardsBySet(db, '1');
    expect(result.total).toBe(8); // 8 cards in set 1
    expect(result.rows.every((c) => c.set_code === '1')).toBe(true);
  });

  it('orders by card number', () => {
    const result = getCardsBySet(db, '1');
    for (let i = 1; i < result.rows.length; i++) {
      expect(result.rows[i].number!).toBeGreaterThanOrEqual(
        result.rows[i - 1].number!,
      );
    }
  });

  it('supports pagination', () => {
    const result = getCardsBySet(db, '1', 3, 0);
    expect(result.rows.length).toBe(3);
    expect(result.total).toBe(8);
  });
});

describe('listFranchises', () => {
  it('returns all franchises with counts', () => {
    const franchises = listFranchises(db);
    expect(franchises.length).toBeGreaterThan(0);
    expect(franchises.some((f) => f.story === 'Frozen')).toBe(true);
  });

  it('orders by count descending', () => {
    const franchises = listFranchises(db);
    for (let i = 1; i < franchises.length; i++) {
      expect(franchises[i].count).toBeLessThanOrEqual(franchises[i - 1].count);
    }
  });
});

describe('getCardsByFranchise', () => {
  it('returns cards for a franchise', () => {
    const result = getCardsByFranchise(db, 'Frozen');
    expect(result.total).toBe(4); // 3 Elsas + Let It Go
    expect(result.rows.every((c) => c.story === 'Frozen')).toBe(true);
  });

  it('is case-insensitive', () => {
    const result = getCardsByFranchise(db, 'frozen');
    expect(result.total).toBe(4);
  });

  it('supports pagination', () => {
    const result = getCardsByFranchise(db, 'Frozen', 2, 0);
    expect(result.rows.length).toBe(2);
    expect(result.total).toBe(4);
  });
});

describe('getSongCards', () => {
  it('returns all song cards', () => {
    const songs = getSongCards(db);
    expect(songs.length).toBe(2);
    expect(songs.every((c) => c.type === 'Song')).toBe(true);
  });

  it('filters by max cost', () => {
    const songs = getSongCards(db, 3);
    expect(songs.length).toBe(1);
    expect(songs[0].name).toBe('Let It Go');
  });

  it('orders by cost ascending', () => {
    const songs = getSongCards(db);
    for (let i = 1; i < songs.length; i++) {
      expect(songs[i].cost!).toBeGreaterThanOrEqual(songs[i - 1].cost!);
    }
  });
});

describe('getCharactersByMinCost', () => {
  it('returns characters at or above cost threshold', () => {
    const chars = getCharactersByMinCost(db, 6);
    expect(chars.length).toBe(2); // Elsa Spirit (6) + Hades (7)
    expect(chars.every((c) => c.type === 'Character' && c.cost! >= 6)).toBe(true);
  });

  it('orders by cost ascending', () => {
    const chars = getCharactersByMinCost(db, 1);
    for (let i = 1; i < chars.length; i++) {
      expect(chars[i].cost!).toBeGreaterThanOrEqual(chars[i - 1].cost!);
    }
  });
});

describe('getSongsByMaxCost', () => {
  it('returns songs at or below cost threshold', () => {
    const songs = getSongsByMaxCost(db, 4);
    expect(songs.length).toBe(1);
    expect(songs[0].name).toBe('Let It Go');
  });
});

describe('getTopLoreGenerators', () => {
  it('returns cards with highest lore', () => {
    const top = getTopLoreGenerators(db, 5);
    expect(top.length).toBe(5);
    expect(top[0].lore!).toBeGreaterThanOrEqual(top[1].lore!);
  });

  it('orders by lore descending, cost ascending', () => {
    const top = getTopLoreGenerators(db);
    for (let i = 1; i < top.length; i++) {
      if (top[i].lore === top[i - 1].lore) {
        expect(top[i].cost!).toBeGreaterThanOrEqual(top[i - 1].cost!);
      } else {
        expect(top[i].lore!).toBeLessThanOrEqual(top[i - 1].lore!);
      }
    }
  });

  it('respects limit parameter', () => {
    const top = getTopLoreGenerators(db, 3);
    expect(top.length).toBe(3);
  });
});
