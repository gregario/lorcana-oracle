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
            `**${s.name}** (${s.code})\n  Type: ${s.type ?? '—'} | Cards: ${s.card_count} | Released: ${s.release_date ?? '—'}`,
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
        `Type: ${set.type ?? '—'} | Cards: ${set.card_count} | Released: ${set.release_date ?? '—'}`,
        '',
        `Cards in set (${rows.length}):`,
      ].join('\n');

      const cardLines = rows.map(formatCardBrief);

      return {
        content: [
          {
            type: 'text' as const,
            text: header + '\n' + cardLines.join('\n'),
          },
        ],
      };
    },
  );
}
