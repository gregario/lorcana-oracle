import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('analyze_lore tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('analyzes deck lore with stats', async () => {
    const deckList = `2 Elsa - Snow Queen
1 Elsa - Spirit of Winter
1 Mickey Mouse - Brave Little Tailor`;

    const result = await client.callTool({
      name: 'analyze_lore',
      arguments: { deck_list: deckList },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Deck Lore Analysis');
    expect(text).toContain('Total Lore Potential');
    expect(text).toContain('Average Lore per Card');
    expect(text).toContain('Lore Generators');
    // Elsa Snow Queen: lore 2 × 2 = 4, Spirit: lore 3 × 1 = 3, Mickey: lore 1 × 1 = 1 → total 8
    expect(text).toContain('8');
  });

  it('notes non-character exclusion', async () => {
    const deckList = `2 Elsa - Snow Queen
2 Let It Go
1 A Whole New World`;

    const result = await client.callTool({
      name: 'analyze_lore',
      arguments: { deck_list: deckList },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('non-lore cards excluded');
  });

  it('query mode returns top lore generators', async () => {
    const result = await client.callTool({
      name: 'analyze_lore',
      arguments: {},
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Top Lore Generators');
    // Elsa Spirit of Winter has lore 3 — should be first
    expect(text).toContain('Elsa - Spirit of Winter');
  });

  it('query mode with ink filter', async () => {
    const result = await client.callTool({
      name: 'analyze_lore',
      arguments: { ink: 'Amber' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Top Lore Generators');
    expect(text).toContain('Mickey Mouse');
    expect(text).not.toContain('Elsa');
  });
});
