import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { listFranchises, getCardsByFranchise } from '../data/db.js';
import type { CardRow } from '../types.js';

function formatCardBrief(card: CardRow): string {
  const stats: string[] = [];
  if (card.type === 'Character') {
    stats.push(`${card.strength ?? '—'}/${card.willpower ?? '—'}/${card.lore ?? '—'}`);
  } else if (card.type === 'Location' && card.lore !== null) {
    stats.push(`Lore: ${card.lore}`);
  }
  const statsStr = stats.length > 0 ? ` | ${stats.join(' ')}` : '';
  return `  ${card.full_name ?? card.name} — ${card.color} ${card.type} | Cost ${card.cost ?? '—'}${statsStr} | ${card.rarity ?? '—'}`;
}

function computeDistribution(cards: CardRow[], key: keyof CardRow): Map<string, number> {
  const dist = new Map<string, number>();
  for (const card of cards) {
    const val = String(card[key] ?? 'Unknown');
    dist.set(val, (dist.get(val) ?? 0) + 1);
  }
  return dist;
}

function formatDistribution(dist: Map<string, number>): string {
  return [...dist.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
}

export function registerBrowseFranchise(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'browse_franchise',
    {
      title: 'Browse Franchise',
      description:
        'Browse Disney Lorcana cards by franchise (story). Without a franchise name, lists all franchises with card counts. With a franchise name, shows cards and statistics.',
      inputSchema: {
        franchise: z.string().optional().describe('Franchise/story name (e.g. "Frozen", "Moana"). Omit to list all franchises.'),
      },
    },
    async (args) => {
      if (!args.franchise) {
        // List all franchises
        const franchises = listFranchises(db);
        if (franchises.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No franchises found in the database.' }],
          };
        }

        const lines = franchises.map(
          (f) => `  ${f.story} (${f.count} card${f.count !== 1 ? 's' : ''})`,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${franchises.length} franchises:\n\n${lines.join('\n')}`,
            },
          ],
        };
      }

      // Browse specific franchise
      const { rows, total } = getCardsByFranchise(db, args.franchise, 1000, 0);

      if (total === 0) {
        // Try partial match
        const allFranchises = listFranchises(db);
        const matches = allFranchises.filter(
          (f) => f.story.toLowerCase().includes(args.franchise!.toLowerCase()),
        );

        let text = `Franchise "${args.franchise}" not found.`;
        if (matches.length > 0) {
          text += `\n\nDid you mean one of these?\n${matches.map((f) => `  - ${f.story} (${f.count} cards)`).join('\n')}`;
        }

        return {
          content: [{ type: 'text' as const, text }],
          isError: true,
        };
      }

      // Compute stats
      const inkDist = computeDistribution(rows, 'color');
      const typeDist = computeDistribution(rows, 'type');
      const rarityDist = computeDistribution(rows, 'rarity');
      const setDist = computeDistribution(rows, 'set_code');

      const header = [
        `**${rows[0].story ?? args.franchise}** — ${total} card${total !== 1 ? 's' : ''}`,
        '',
        'Stats:',
        `  Ink colors: ${formatDistribution(inkDist)}`,
        `  Types: ${formatDistribution(typeDist)}`,
        `  Rarities: ${formatDistribution(rarityDist)}`,
        `  Sets: ${formatDistribution(setDist)}`,
        '',
        'Cards:',
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
