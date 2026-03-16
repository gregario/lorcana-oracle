import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('character_versions tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('shows multiple versions of a character', async () => {
    const result = await client.callTool({ name: 'character_versions', arguments: { character_name: 'Elsa' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    // Header shows version and printing counts
    expect(text).toContain('Elsa');
    expect(text).toContain('2 versions');
    expect(text).toContain('3 printings');
    // Both versions present
    expect(text).toContain('Elsa - Snow Queen');
    expect(text).toContain('Elsa - Spirit of Winter');
    // Stats for comparison
    expect(text).toContain('Cost: 4');
    expect(text).toContain('Cost: 6');
    expect(text).toContain('Lore: 2');
    expect(text).toContain('Lore: 3');
  });

  it('shows a single version character', async () => {
    const result = await client.callTool({ name: 'character_versions', arguments: { character_name: 'Ariel' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Ariel');
    expect(text).toContain('1 version');
    expect(text).toContain('1 printing');
    expect(text).toContain('Ariel - On Human Legs');
  });

  it('returns not found with suggestions for unknown character', async () => {
    const result = await client.callTool({ name: 'character_versions', arguments: { character_name: 'Rapunzel' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('No versions found');
    expect(result.isError).toBe(true);
  });

  it('suggests partial matches for unknown character', async () => {
    const result = await client.callTool({ name: 'character_versions', arguments: { character_name: 'Mic' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Did you mean');
    expect(text).toContain('Mickey Mouse');
  });
});
