import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('analyze_ink_curve tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('analyzes a valid deck with mixed cards', async () => {
    const deckList = `2 Elsa - Snow Queen
1 Elsa - Spirit of Winter
2 Let It Go
1 Mickey Mouse - Brave Little Tailor`;

    const result = await client.callTool({
      name: 'analyze_ink_curve',
      arguments: { deck_list: deckList },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Ink Curve Analysis');
    expect(text).toContain('Total Cards:** 6');
    expect(text).toContain('Cost Distribution');
    expect(text).toContain('Inkable Ratio');
    expect(text).toContain('Ink Colors');
    expect(text).toContain('Amethyst');
    expect(text).toContain('Amber');
  });

  it('flags unrecognized cards', async () => {
    const deckList = `2 Elsa - Snow Queen
1 Fake Card Name`;

    const result = await client.callTool({
      name: 'analyze_ink_curve',
      arguments: { deck_list: deckList },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Unrecognized Cards');
    expect(text).toContain('Fake Card Name');
  });

  it('warns about multi-color decks with more than 2 colors', async () => {
    const deckList = `2 Elsa - Snow Queen
2 Mickey Mouse - Brave Little Tailor
2 Ariel - On Human Legs`;

    const result = await client.callTool({
      name: 'analyze_ink_curve',
      arguments: { deck_list: deckList },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('3 ink colors');
    expect(text).toContain('consistency');
  });

  it('returns error for empty deck', async () => {
    const result = await client.callTool({
      name: 'analyze_ink_curve',
      arguments: { deck_list: '' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Error');
    expect(result.isError).toBe(true);
  });
});
