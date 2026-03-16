import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('search_cards tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('searches by name', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { query: 'Elsa' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Elsa - Snow Queen');
    expect(text).toContain('Elsa - Spirit of Winter');
  });

  it('searches by rules text', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { query: 'draw a card' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Mickey Mouse - Brave Little Tailor');
  });

  it('filters by ink color', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { ink: 'Amethyst' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Elsa');
    expect(text).toContain('Let It Go');
    expect(text).not.toContain('Mickey Mouse');
  });

  it('filters by type', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { type: 'Song' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('A Whole New World');
    expect(text).toContain('Let It Go');
    expect(text).not.toContain('Elsa');
  });

  it('filters by cost range (cost_min)', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { cost_min: 5 } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('A Whole New World'); // cost 5
    expect(text).toContain('Elsa - Spirit of Winter'); // cost 6
    expect(text).toContain('Hades - King of Olympus'); // cost 7
    expect(text).not.toContain('Let It Go'); // cost 3
  });

  it('supports pagination with limit and cursor', async () => {
    const result1 = await client.callTool({ name: 'search_cards', arguments: { limit: 2 } });
    const text1 = (result1.content as { type: string; text: string }[])[0].text;
    expect(text1).toContain('Showing 1');
    expect(text1).toContain('cursor');

    const result2 = await client.callTool({ name: 'search_cards', arguments: { limit: 2, cursor: 2 } });
    const text2 = (result2.content as { type: string; text: string }[])[0].text;
    expect(text2).toContain('Showing 3');
  });

  it('returns empty message for no results', async () => {
    const result = await client.callTool({ name: 'search_cards', arguments: { query: 'xyznonexistent' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('No cards found');
  });
});
