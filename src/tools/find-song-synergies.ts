import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  getCardByName,
  getCharactersByMinCost,
  getSongsByMaxCost,
  getSongCards,
  searchCards,
} from '../data/db.js';
import type { CardRow } from '../types.js';

function formatSingerCard(card: CardRow): string {
  return `**${card.full_name ?? card.name}** — Cost: ${card.cost ?? '—'} | Lore: ${card.lore ?? '—'} | ${card.color}`;
}

function formatSongCard(card: CardRow): string {
  return `**${card.full_name ?? card.name}** — Cost: ${card.cost ?? '—'} | ${card.color}${card.full_text ? ` | ${card.full_text}` : ''}`;
}

export function registerFindSongSynergies(server: McpServer, db: Database.Database): void {
  server.registerTool(
    'find_song_synergies',
    {
      title: 'Find Song Synergies',
      description:
        'Find Disney Lorcana song synergies. Given a Song, find characters that can sing it (cost >= song cost). Given a Character, find songs they can sing (cost <= character cost). With no input, browse all songs with singer counts.',
      inputSchema: {
        card_name: z.string().optional().describe('Card name to find synergies for (Song or Character)'),
        ink: z.string().optional().describe('Filter results by ink color'),
      },
    },
    async (args) => {
      // Browse mode — no card specified
      if (!args.card_name) {
        const songs = getSongCards(db);
        if (songs.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No songs found in the database.' }],
          };
        }

        const lines: string[] = [];
        lines.push('## All Songs\n');
        for (const song of songs) {
          const singers = getCharactersByMinCost(db, song.cost ?? 0);
          const filteredSingers = args.ink
            ? singers.filter((c) => c.color.toLowerCase() === args.ink!.toLowerCase())
            : singers;
          lines.push(`${formatSongCard(song)} — ${filteredSingers.length} potential singers`);
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Look up the card
      const card = getCardByName(db, args.card_name);
      if (!card) {
        // Try partial match for suggestions
        const { rows } = searchCards(db, { query: args.card_name, limit: 5 });
        if (rows.length > 0) {
          const suggestions = rows.map((c) => c.full_name ?? c.name).join(', ');
          return {
            content: [{ type: 'text' as const, text: `Card "${args.card_name}" not found. Did you mean: ${suggestions}?` }],
          };
        }
        return {
          content: [{ type: 'text' as const, text: `Card "${args.card_name}" not found.` }],
        };
      }

      // Song mode — find characters that can sing this song
      if (card.type === 'Song') {
        const singers = getCharactersByMinCost(db, card.cost ?? 0);
        let filtered = args.ink
          ? singers.filter((c) => c.color.toLowerCase() === args.ink!.toLowerCase())
          : singers;

        const lines: string[] = [];
        lines.push(`## Singers for ${card.full_name ?? card.name} (Cost ${card.cost})\n`);

        if (filtered.length === 0) {
          lines.push('No characters found that can sing this song.');
        } else {
          // Group by color
          const byColor = new Map<string, CardRow[]>();
          for (const singer of filtered) {
            const group = byColor.get(singer.color) ?? [];
            group.push(singer);
            byColor.set(singer.color, group);
          }

          for (const [color, chars] of [...byColor.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
            lines.push(`### ${color} (${chars.length})`);
            for (const c of chars) {
              lines.push(`  ${formatSingerCard(c)}`);
            }
          }
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Character mode — find songs this character can sing
      if (card.type === 'Character') {
        const songs = getSongsByMaxCost(db, card.cost ?? 0);
        const filtered = args.ink
          ? songs.filter((s) => s.color.toLowerCase() === args.ink!.toLowerCase())
          : songs;

        const lines: string[] = [];
        lines.push(`## Songs for ${card.full_name ?? card.name} (Cost ${card.cost})\n`);

        if (filtered.length === 0) {
          lines.push('No songs found that this character can sing.');
        } else {
          for (const song of filtered) {
            lines.push(`  ${formatSongCard(song)}`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Non-song/character
      return {
        content: [{ type: 'text' as const, text: `"${card.full_name ?? card.name}" is a ${card.type}. Song synergies only apply to Songs and Characters. Songs can be sung by Characters with cost >= song cost.` }],
      };
    },
  );
}
