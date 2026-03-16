import type Database from 'better-sqlite3';
import { getCardByName } from '../data/db.js';
import type { CardRow } from '../types.js';

export interface DeckEntry {
  quantity: number;
  cardName: string;
  version?: string;
}

export interface ResolvedDeckEntry {
  quantity: number;
  card: CardRow;
}

export interface DeckParseResult {
  entries: ResolvedDeckEntry[];
  unrecognized: string[];
}

/**
 * Parse a deck list text into structured entries.
 * Accepts formats like:
 *   "2 Elsa - Snow Queen"
 *   "2x Elsa"
 *   "3 Let It Go"
 */
export function parseDeckList(text: string): DeckEntry[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const entries: DeckEntry[] = [];

  for (const line of lines) {
    // Match: optional quantity (digits followed by optional 'x'), then card name
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const fullName = match[2].trim();
      const dashIndex = fullName.indexOf(' - ');
      if (dashIndex > 0) {
        entries.push({
          quantity,
          cardName: fullName.substring(0, dashIndex).trim(),
          version: fullName.substring(dashIndex + 3).trim(),
        });
      } else {
        entries.push({ quantity, cardName: fullName });
      }
    } else {
      // Line with no quantity — treat as 1
      const fullName = line.trim();
      if (fullName.length > 0) {
        const dashIndex = fullName.indexOf(' - ');
        if (dashIndex > 0) {
          entries.push({
            quantity: 1,
            cardName: fullName.substring(0, dashIndex).trim(),
            version: fullName.substring(dashIndex + 3).trim(),
          });
        } else {
          entries.push({ quantity: 1, cardName: fullName });
        }
      }
    }
  }

  return entries;
}

/**
 * Resolve parsed deck entries against the database.
 * Tries full_name first (name - version), then just name.
 */
export function resolveDeck(
  db: Database.Database,
  entries: DeckEntry[],
): DeckParseResult {
  const resolved: ResolvedDeckEntry[] = [];
  const unrecognized: string[] = [];

  for (const entry of entries) {
    const searchName = entry.version
      ? `${entry.cardName} - ${entry.version}`
      : entry.cardName;

    const card = getCardByName(db, searchName);
    if (card) {
      resolved.push({ quantity: entry.quantity, card });
    } else {
      unrecognized.push(searchName);
    }
  }

  return { entries: resolved, unrecognized };
}
