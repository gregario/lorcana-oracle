import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getCardsByCharacterName } from '../data/db.js';
import type { CardRow } from '../types.js';

function formatVersionCard(card: CardRow): string {
  const lines: string[] = [];
  lines.push(`**${card.full_name ?? card.name}**`);
  lines.push(`  Rarity: ${card.rarity ?? '—'} | Set: ${card.set_code ?? '—'}`);
  lines.push(`  Ink: ${card.color} | Cost: ${card.cost ?? '—'} | Inkwell: ${card.inkwell ? 'Yes' : 'No'}`);
  if (card.type === 'Character') {
    lines.push(`  Strength: ${card.strength ?? '—'} | Willpower: ${card.willpower ?? '—'} | Lore: ${card.lore ?? '—'}`);
  }
  if (card.full_text) {
    lines.push(`  Text: ${card.full_text}`);
  }
  return lines.join('\n');
}

export function registerCharacterVersions(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'character_versions',
    {
      title: 'Character Versions',
      description:
        'Show all printings/versions of a Disney Lorcana character across sets. Useful for comparing different versions of the same character.',
      inputSchema: {
        character_name: z.string().describe('Character base name (e.g. "Elsa", "Mickey Mouse")'),
      },
    },
    async (args) => {
      const cards = getCardsByCharacterName(db, args.character_name);

      if (cards.length === 0) {
        // Try partial match suggestions
        const suggestions = db
          .prepare(
            'SELECT DISTINCT name FROM cards WHERE name LIKE @pattern LIMIT 5',
          )
          .all({ pattern: `%${args.character_name}%` }) as { name: string }[];

        let text = `No versions found for character "${args.character_name}".`;
        if (suggestions.length > 0) {
          text += `\n\nDid you mean one of these?\n${suggestions.map((s) => `  - ${s.name}`).join('\n')}`;
        }

        return {
          content: [{ type: 'text' as const, text }],
          isError: true,
        };
      }

      // Group by version
      const versionMap = new Map<string, CardRow[]>();
      for (const card of cards) {
        const version = card.version ?? card.full_name ?? card.name;
        const existing = versionMap.get(version) ?? [];
        existing.push(card);
        versionMap.set(version, existing);
      }

      const header = `**${args.character_name}** — ${versionMap.size} version${versionMap.size !== 1 ? 's' : ''}, ${cards.length} printing${cards.length !== 1 ? 's' : ''}`;

      const sections: string[] = [header, ''];
      for (const [, printings] of versionMap) {
        for (const card of printings) {
          sections.push(formatVersionCard(card));
          sections.push('');
        }
      }

      return {
        content: [{ type: 'text' as const, text: sections.join('\n').trimEnd() }],
      };
    },
  );
}
