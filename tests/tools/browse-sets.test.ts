import { describe, it, expect, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTestClient } from '../helpers/test-db.js';

describe('browse_sets tool', () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('lists all sets when no set_code provided', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('The First Chapter');
    expect(text).toContain('Rise of the Floodborn');
    expect(text).toContain('Found 2 sets');
  });

  it('shows cards for a specific set', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: { set_code: '1' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('The First Chapter');
    expect(text).toContain('Elsa - Snow Queen');
    expect(text).toContain('Mickey Mouse - Brave Little Tailor');
    expect(text).toContain('Cards in set');
  });

  it('returns error with available codes for invalid set', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: { set_code: '99' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(result.isError).toBe(true);
    expect(text).toContain('not found');
    expect(text).toContain('1');
    expect(text).toContain('2');
  });
});
