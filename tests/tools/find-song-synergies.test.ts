import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('find_song_synergies tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('song lookup shows eligible singers', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: { card_name: 'A Whole New World' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Singers for A Whole New World');
    // Cost 5 song — characters with cost >= 5 can sing it
    // Elsa Spirit of Winter (cost 6), Hades (cost 7)
    expect(text).toContain('Elsa - Spirit of Winter');
    expect(text).toContain('Hades - King of Olympus');
    // Mickey (cost 3) cannot sing a cost-5 song
    expect(text).not.toContain('Mickey Mouse');
  });

  it('character lookup shows singable songs', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: { card_name: 'Elsa - Snow Queen' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Songs for Elsa - Snow Queen');
    // Elsa Snow Queen cost 4 — songs with cost <= 4
    expect(text).toContain('Let It Go'); // cost 3
    expect(text).not.toContain('A Whole New World'); // cost 5
  });

  it('browse mode lists all songs with singer counts', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: {},
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('All Songs');
    expect(text).toContain('Let It Go');
    expect(text).toContain('A Whole New World');
    expect(text).toContain('potential singers');
  });

  it('filters by ink color', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: { card_name: 'A Whole New World', ink: 'Amethyst' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    // Only Amethyst characters with cost >= 5: Elsa Spirit of Winter
    expect(text).toContain('Elsa - Spirit of Winter');
    expect(text).not.toContain('Hades'); // Ruby, not Amethyst
  });

  it('shows suggestions for not found card', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: { card_name: 'Elsaa' },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('not found');
  });

  it('errors for non-song/character cards', async () => {
    const result = await client.callTool({
      name: 'find_song_synergies',
      arguments: { card_name: "Maui's Fish Hook" },
    });
    const text = (result.content as { type: string; text: string }[])[0].text;

    expect(text).toContain('Item');
    expect(text).toContain('Songs and Characters');
  });
});
