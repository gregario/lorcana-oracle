import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { searchCards } from '../data/db.js';
import type { CardRow, SearchFilters } from '../types.js';

function formatCard(card: CardRow): string {
  const lines: string[] = [];
  lines.push(`**${card.full_name ?? card.name}**`);
  lines.push(`  Ink: ${card.color} | Cost: ${card.cost ?? '—'} | Inkwell: ${card.inkwell ? 'Yes' : 'No'}`);
  lines.push(`  Type: ${card.type}${card.subtypes_text ? ` — ${card.subtypes_text}` : ''}`);
  if (card.type === 'Character') {
    lines.push(`  Strength: ${card.strength ?? '—'} | Willpower: ${card.willpower ?? '—'} | Lore: ${card.lore ?? '—'}`);
  }
  if (card.type === 'Location' && card.move_cost !== null) {
    lines.push(`  Lore: ${card.lore ?? '—'} | Move Cost: ${card.move_cost}`);
  }
  lines.push(`  Rarity: ${card.rarity ?? '—'} | Set: ${card.set_code ?? '—'}`);
  if (card.full_text) {
    lines.push(`  Text: ${card.full_text}`);
  }
  if (card.story) {
    lines.push(`  Franchise: ${card.story}`);
  }
  return lines.join('\n');
}

export function registerSearchCards(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'search_cards',
    {
      title: 'Search Cards',
      description:
        'Search Disney Lorcana cards by name, rules text, or filters (ink color, type, rarity, set, cost range). Returns paginated results.',
      inputSchema: {
        query: z.string().optional().describe('Search by card name or rules text'),
        ink: z.string().optional().describe('Filter by ink color (e.g. Amber, Amethyst, Emerald, Ruby, Sapphire, Steel)'),
        type: z.string().optional().describe('Filter by card type (e.g. Character, Song, Item, Action, Location)'),
        rarity: z.string().optional().describe('Filter by rarity (e.g. Common, Uncommon, Rare, Super Rare, Legendary, Enchanted)'),
        set: z.string().optional().describe('Filter by set code'),
        cost_min: z.number().optional().describe('Minimum ink cost (inclusive)'),
        cost_max: z.number().optional().describe('Maximum ink cost (inclusive)'),
        limit: z.number().optional().default(20).describe('Max results to return (default 20)'),
        cursor: z.number().optional().describe('Offset for pagination'),
      },
    },
    async (args) => {
      const filters: SearchFilters = {
        query: args.query,
        color: args.ink,
        type: args.type,
        rarity: args.rarity,
        setCode: args.set,
        costMin: args.cost_min,
        costMax: args.cost_max,
        limit: args.limit,
        offset: args.cursor,
      };

      const { rows, total } = searchCards(db, filters);

      if (rows.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No cards found matching your search criteria.' }],
        };
      }

      const offset = args.cursor ?? 0;
      const parts = rows.map(formatCard);
      const footer: string[] = [];
      footer.push(`\n---\nShowing ${offset + 1}–${offset + rows.length} of ${total} results.`);
      if (offset + rows.length < total) {
        footer.push(`Use cursor: ${offset + rows.length} to see more.`);
      }

      return {
        content: [
          { type: 'text' as const, text: parts.join('\n\n') + footer.join(' ') },
        ],
      };
    },
  );
}
