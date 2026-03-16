import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('browse_franchise tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('lists all franchises when no franchise given', async () => {
    const result = await client.callTool({ name: 'browse_franchise', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('franchises');
    expect(text).toContain('Frozen');
    expect(text).toContain('Moana');
    expect(text).toContain('Aladdin');
    expect(text).toContain('Hercules');
    expect(text).toContain('The Little Mermaid');
    expect(text).toContain('Mickey Mouse & Friends');
  });

  it('shows franchise detail with stats for Frozen', async () => {
    const result = await client.callTool({ name: 'browse_franchise', arguments: { franchise: 'Frozen' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    // Header with card count
    expect(text).toContain('Frozen');
    expect(text).toContain('4 cards');
    // Stats
    expect(text).toContain('Ink colors:');
    expect(text).toContain('Amethyst');
    expect(text).toContain('Types:');
    expect(text).toContain('Character');
    expect(text).toContain('Song');
    expect(text).toContain('Rarities:');
    // Cards listed
    expect(text).toContain('Elsa - Snow Queen');
    expect(text).toContain('Elsa - Spirit of Winter');
    expect(text).toContain('Let It Go');
  });

  it('returns error for unknown franchise', async () => {
    const result = await client.callTool({ name: 'browse_franchise', arguments: { franchise: 'Cars' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('not found');
    expect(result.isError).toBe(true);
  });

  it('suggests partial matches for unknown franchise', async () => {
    const result = await client.callTool({ name: 'browse_franchise', arguments: { franchise: 'Little' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Did you mean');
    expect(text).toContain('The Little Mermaid');
  });
});
