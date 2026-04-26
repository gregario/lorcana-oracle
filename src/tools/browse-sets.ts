import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { listSets, getSet, getCardsBySet } from '../data/db.js';
import type { CardRow } from '../types.js';

function formatCardBrief(card: CardRow): string {
  const stats: string[] = [];
  if (card.type === 'Character') {
    stats.push(`${card.strength ?? '—'}/${card.willpower ?? '—'}/${card.lore ?? '—'}`);
  } else if (card.type === 'Location' && card.lore !== null) {
    stats.push(`Lore: ${card.lore}`);
  }
  const statsStr = stats.length > 0 ? ` | ${stats.join(' ')}` : '';
  return `  #${card.number ?? '—'} ${card.full_name ?? card.name} — ${card.color} ${card.type} | Cost ${card.cost ?? '—'}${statsStr} | ${card.rarity ?? '—'}`;
}

/**
 * Render the cards-and-status segment of a set listing line.
 *
 * Sets are listed regardless of release state, but unreleased sets must be
 * labelled so the user understands the data state. We never emit a
 * silently-empty `Cards: 0` line — every empty set carries a status note,
 * and pre-release sets that already have spoilers are flagged as previews.
 */
function formatSetStatus(set: { card_count: number; released: number; release_date: string | null }): string {
  if (set.released === 1) {
    return `Cards: ${set.card_count}`;
  }
  // Pre-release set — distinguish "we have spoilers" from "no data yet".
  const when = set.release_date
    ? `releases ${set.release_date}`
    : 'release date TBA';
  if (set.card_count > 0) {
    return `Cards: ${set.card_count} (preview — ${when})`;
  }
  return `Cards: 0 (set unreleased — ${when})`;
}

export function registerBrowseSets(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'browse_sets',
    {
      title: 'Browse Sets',
      description:
        'List all Disney Lorcana sets, or drill into a specific set to see its metadata and cards. Provide a set_code to see cards in that set.',
      inputSchema: {
        set_code: z.string().optional().describe('Set code to browse (e.g. "1", "2"). Omit to list all sets.'),
      },
    },
    async (args) => {
      if (!args.set_code) {
        // List all sets
        const sets = listSets(db);
        if (sets.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No sets found in the database.' }],
          };
        }
        const lines = sets.map(
          (s) =>
            `**${s.name}** (${s.code})\n  Type: ${s.type ?? '—'} | ${formatSetStatus(s)} | Released: ${s.release_date ?? '—'}`,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${sets.length} sets:\n\n${lines.join('\n\n')}`,
            },
          ],
        };
      }

      // Browse specific set
      const set = getSet(db, args.set_code);
      if (!set) {
        const allSets = listSets(db);
        const codes = allSets.map((s) => s.code).join(', ');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Set "${args.set_code}" not found. Available set codes: ${codes}`,
            },
          ],
          isError: true,
        };
      }

      const { rows } = getCardsBySet(db, args.set_code, 1000, 0);
      const header = [
        `**${set.name}** (${set.code})`,
        `Type: ${set.type ?? '—'} | ${formatSetStatus(set)} | Released: ${set.release_date ?? '—'}`,
      ];

      // Unreleased set with no cards yet: explain why instead of dumping an empty list.
      if (set.released === 0 && rows.length === 0) {
        const when = set.release_date
          ? `releases ${set.release_date}`
          : 'release date TBA';
        header.push(
          '',
          `This set has not yet been released (${when}). Card data will appear once it is published by the upstream data source (LorcanaJSON).`,
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: header.join('\n'),
            },
          ],
        };
      }

      // Pre-release set with spoilers: show cards but flag as preview.
      if (set.released === 0) {
        const when = set.release_date
          ? `releases ${set.release_date}`
          : 'release date TBA';
        header.push(
          '',
          `Preview — this set has not yet released (${when}). The card list below reflects spoilers from the upstream data source and may be incomplete.`,
          '',
          `Cards in set (${rows.length}):`,
        );
      } else {
        header.push('', `Cards in set (${rows.length}):`);
      }
      const cardLines = rows.map(formatCardBrief);

      return {
        content: [
          {
            type: 'text' as const,
            text: header.join('\n') + '\n' + cardLines.join('\n'),
          },
        ],
      };
    },
  );
}
