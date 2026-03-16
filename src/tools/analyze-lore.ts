import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { parseDeckList, resolveDeck } from '../lib/deck-parser.js';
import { getTopLoreGenerators, searchCards } from '../data/db.js';
import type { CardRow } from '../types.js';

function loreEfficiency(card: CardRow): number {
  if (!card.lore || !card.cost || card.cost === 0) return 0;
  return card.lore / card.cost;
}

function formatLoreCard(card: CardRow, quantity?: number): string {
  const qtyStr = quantity !== undefined ? `${quantity}x ` : '';
  const efficiency = loreEfficiency(card).toFixed(2);
  return `${qtyStr}**${card.full_name ?? card.name}** — Lore: ${card.lore ?? 0} | Cost: ${card.cost ?? '—'} | Efficiency: ${efficiency} lore/cost | ${card.color}`;
}

export function registerAnalyzeLore(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'analyze_lore',
    {
      title: 'Analyze Lore',
      description:
        'Analyze lore generation in a deck list, or find the top lore-generating cards. In deck mode, shows total lore potential and efficiency ranking. In query mode, shows top lore generators with optional filters.',
      inputSchema: {
        deck_list: z.string().optional().describe('Deck list text to analyze for lore potential'),
        ink: z.string().optional().describe('Filter by ink color'),
        cost_min: z.number().optional().describe('Minimum ink cost filter'),
        cost_max: z.number().optional().describe('Maximum ink cost filter'),
        limit: z.number().optional().default(20).describe('Max results (default 20)'),
      },
    },
    async (args) => {
      // Deck mode
      if (args.deck_list) {
        const entries = parseDeckList(args.deck_list);
        if (entries.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: Could not parse any cards from the deck list.' }],
            isError: true,
          };
        }

        const result = resolveDeck(db, entries);
        if (result.entries.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: No recognized cards found.' }],
            isError: true,
          };
        }

        // Filter to cards with lore (characters and locations)
        const loreEntries = result.entries.filter((e) => e.card.lore !== null && e.card.lore > 0);
        const nonLoreEntries = result.entries.filter((e) => e.card.lore === null || e.card.lore === 0);

        let totalLore = 0;
        let totalLoreCards = 0;
        for (const entry of loreEntries) {
          totalLore += (entry.card.lore ?? 0) * entry.quantity;
          totalLoreCards += entry.quantity;
        }

        const avgLore = totalLoreCards > 0 ? (totalLore / totalLoreCards).toFixed(2) : '0';

        // Sort by efficiency
        const sorted = [...loreEntries].sort((a, b) => loreEfficiency(b.card) - loreEfficiency(a.card));

        const lines: string[] = [];
        lines.push('## Deck Lore Analysis\n');
        lines.push(`**Total Lore Potential:** ${totalLore} (across ${totalLoreCards} lore-generating cards)`);
        lines.push(`**Average Lore per Card:** ${avgLore}\n`);
        lines.push('### Lore Generators (by efficiency)');
        for (const entry of sorted) {
          lines.push(`  ${formatLoreCard(entry.card, entry.quantity)}`);
        }

        if (nonLoreEntries.length > 0) {
          const nonLoreCount = nonLoreEntries.reduce((sum, e) => sum + e.quantity, 0);
          lines.push(`\n*${nonLoreCount} non-lore cards excluded (Songs, Items, Actions without lore value).*`);
        }

        if (result.unrecognized.length > 0) {
          lines.push('\n### Unrecognized Cards');
          for (const name of result.unrecognized) {
            lines.push(`  - ${name}`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Query mode — find top lore generators
      // Use searchCards with filters if color/cost provided, otherwise getTopLoreGenerators
      let cards: CardRow[];

      if (args.ink || args.cost_min !== undefined || args.cost_max !== undefined) {
        // Use searchCards with filters
        const { rows } = searchCards(db, {
          color: args.ink,
          cost: args.cost_min,
          costOp: args.cost_min !== undefined ? 'gte' : undefined,
          limit: 200, // Get more to filter and sort
        });

        cards = rows
          .filter((c) => c.lore !== null && c.lore > 0)
          .filter((c) => args.cost_max === undefined || (c.cost !== null && c.cost <= args.cost_max));

        // Sort by lore desc, then efficiency
        cards.sort((a, b) => {
          const loreDiff = (b.lore ?? 0) - (a.lore ?? 0);
          if (loreDiff !== 0) return loreDiff;
          return loreEfficiency(b) - loreEfficiency(a);
        });

        cards = cards.slice(0, args.limit);
      } else {
        cards = getTopLoreGenerators(db, args.limit);
      }

      if (cards.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No lore-generating cards found matching your filters.' }],
        };
      }

      const lines: string[] = [];
      lines.push('## Top Lore Generators\n');
      for (const card of cards) {
        lines.push(formatLoreCard(card));
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
