import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { parseDeckList, resolveDeck } from '../lib/deck-parser.js';

export function registerAnalyzeInkCurve(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'analyze_ink_curve',
    {
      title: 'Analyze Ink Curve',
      description:
        'Analyze a Disney Lorcana deck list for ink cost distribution, inkable ratio, and color balance. Paste a deck list to get curve analysis.',
      inputSchema: {
        deck_list: z.string().describe('Deck list text, one card per line (e.g. "2 Elsa - Snow Queen")'),
      },
    },
    async (args) => {
      const entries = parseDeckList(args.deck_list);
      if (entries.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'Error: Could not parse any cards from the deck list. Use format: "2 Elsa - Snow Queen" (one card per line).' }],
          isError: true,
        };
      }

      const result = resolveDeck(db, entries);
      if (result.entries.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'Error: No recognized cards found in the deck list.' }],
          isError: true,
        };
      }

      // Compute statistics
      const costHistogram = new Map<number, number>();
      let inkableCount = 0;
      let nonInkableCount = 0;
      const colorCounts = new Map<string, number>();
      let totalCost = 0;
      let totalCards = 0;
      let cardsWithCost = 0;

      for (const entry of result.entries) {
        const { card, quantity } = entry;
        totalCards += quantity;

        if (card.inkwell) {
          inkableCount += quantity;
        } else {
          nonInkableCount += quantity;
        }

        // Color distribution
        const colorCount = colorCounts.get(card.color) ?? 0;
        colorCounts.set(card.color, colorCount + quantity);

        // Cost histogram
        if (card.cost !== null) {
          const current = costHistogram.get(card.cost) ?? 0;
          costHistogram.set(card.cost, current + quantity);
          totalCost += card.cost * quantity;
          cardsWithCost += quantity;
        }
      }

      const averageCost = cardsWithCost > 0 ? (totalCost / cardsWithCost).toFixed(2) : '—';
      const inkablePercent = totalCards > 0 ? ((inkableCount / totalCards) * 100).toFixed(1) : '0';

      // Build output
      const lines: string[] = [];
      lines.push('## Ink Curve Analysis\n');
      lines.push(`**Total Cards:** ${totalCards}`);
      lines.push(`**Average Cost:** ${averageCost}\n`);

      // Cost histogram
      lines.push('### Cost Distribution');
      const sortedCosts = [...costHistogram.entries()].sort((a, b) => a[0] - b[0]);
      for (const [cost, count] of sortedCosts) {
        const bar = '█'.repeat(count);
        lines.push(`  ${cost}-cost: ${bar} (${count})`);
      }

      // Inkable ratio
      lines.push('\n### Inkable Ratio');
      lines.push(`  Inkable: ${inkableCount} (${inkablePercent}%)`);
      lines.push(`  Non-inkable: ${nonInkableCount} (${(100 - parseFloat(inkablePercent)).toFixed(1)}%)`);

      // Color distribution
      lines.push('\n### Ink Colors');
      const sortedColors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [color, count] of sortedColors) {
        lines.push(`  ${color}: ${count} cards`);
      }

      // Warnings
      const warnings: string[] = [];
      const inkableRatio = parseFloat(inkablePercent);
      if (inkableRatio < 40) {
        warnings.push(`⚠ Low inkable ratio (${inkablePercent}%) — consider adding more inkable cards. Below 40% may cause ink problems.`);
      }
      if (inkableRatio > 70) {
        warnings.push(`⚠ High inkable ratio (${inkablePercent}%) — above 70% means many key cards can be inked accidentally.`);
      }
      if (colorCounts.size > 2) {
        warnings.push(`⚠ Running ${colorCounts.size} ink colors — more than 2 colors can cause consistency issues.`);
      }

      if (warnings.length > 0) {
        lines.push('\n### Warnings');
        for (const w of warnings) {
          lines.push(w);
        }
      }

      // Unrecognized cards
      if (result.unrecognized.length > 0) {
        lines.push('\n### Unrecognized Cards');
        for (const name of result.unrecognized) {
          lines.push(`  - ${name}`);
        }
      }

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );
}
