import { describe, it, expect, beforeAll } from 'vitest';
import { parseDeckList, resolveDeck } from '../../src/lib/deck-parser.js';
import { getDatabase } from '../../src/data/db.js';
import { seedTestData } from '../helpers/test-db.js';
import type Database from 'better-sqlite3';

describe('parseDeckList', () => {
  it('parses standard format "2 Elsa - Snow Queen"', () => {
    const entries = parseDeckList('2 Elsa - Snow Queen');
    expect(entries).toEqual([
      { quantity: 2, cardName: 'Elsa', version: 'Snow Queen' },
    ]);
  });

  it('parses without version "3 Let It Go"', () => {
    const entries = parseDeckList('3 Let It Go');
    expect(entries).toEqual([
      { quantity: 3, cardName: 'Let It Go' },
    ]);
  });

  it('parses "x" quantity format "2x Elsa"', () => {
    const entries = parseDeckList('2x Elsa');
    expect(entries).toEqual([
      { quantity: 2, cardName: 'Elsa' },
    ]);
  });

  it('skips empty lines', () => {
    const entries = parseDeckList('2 Elsa - Snow Queen\n\n\n3 Let It Go\n');
    expect(entries).toHaveLength(2);
    expect(entries[0].cardName).toBe('Elsa');
    expect(entries[1].cardName).toBe('Let It Go');
  });

  it('parses multiple lines', () => {
    const text = `4 Elsa - Snow Queen
2 Mickey Mouse - Brave Little Tailor
3 A Whole New World`;
    const entries = parseDeckList(text);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ quantity: 4, cardName: 'Elsa', version: 'Snow Queen' });
    expect(entries[1]).toEqual({ quantity: 2, cardName: 'Mickey Mouse', version: 'Brave Little Tailor' });
    expect(entries[2]).toEqual({ quantity: 3, cardName: 'A Whole New World' });
  });
});

describe('resolveDeck', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = getDatabase(':memory:');
    seedTestData(db);
  });

  it('resolves known cards', () => {
    const entries = parseDeckList('2 Elsa - Snow Queen\n1 Let It Go');
    const result = resolveDeck(db, entries);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].quantity).toBe(2);
    expect(result.entries[0].card.full_name).toBe('Elsa - Snow Queen');
    expect(result.entries[1].quantity).toBe(1);
    expect(result.entries[1].card.name).toBe('Let It Go');
    expect(result.unrecognized).toHaveLength(0);
  });

  it('flags unknown cards as unrecognized', () => {
    const entries = parseDeckList('2 Elsa - Snow Queen\n3 Nonexistent Card');
    const result = resolveDeck(db, entries);
    expect(result.entries).toHaveLength(1);
    expect(result.unrecognized).toEqual(['Nonexistent Card']);
  });

  it('resolves by name without version', () => {
    const entries = parseDeckList('1 Elsa');
    const result = resolveDeck(db, entries);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].card.name).toBe('Elsa');
  });
});
