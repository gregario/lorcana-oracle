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
    expect(text).toContain('Found 4 sets');
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

  it('annotates unreleased sets in the listing with their release date', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    // "Attack of the Vine" has a future release date — must say so
    expect(text).toMatch(/Attack of the Vine[\s\S]*?unreleased[\s\S]*?2026-07-24/);
  });

  it('annotates announced sets with no release date as TBA', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;
    // "Hyperia City" has no release date — must say TBA, not just "0"
    expect(text).toMatch(/Hyperia City[\s\S]*?(TBA|announced)/i);
  });

  it('explains why an unreleased set has no cards when drilled into', async () => {
    const result = await client.callTool({ name: 'browse_sets', arguments: { set_code: '13' } });
    const text = (result.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('Attack of the Vine');
    expect(text).toMatch(/not yet been released/i);
    expect(text).toContain('2026-07-24');
    // Should NOT misleadingly claim "Cards in set (0):" with no explanation
    expect(text).not.toMatch(/^Cards in set \(0\):/m);
  });

  it('never returns a silently empty set in the listing', async () => {
    // Regression test: lorcana-oracle@0.1.1 listed "Attack of the Vine"
    // with "Cards: 0" and no explanation. Every empty set must carry a
    // status note (unreleased / TBA / etc).
    const result = await client.callTool({ name: 'browse_sets', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0].text;

    // For every "Cards: 0" occurrence, the same line must include a status
    // qualifier in parentheses — never a bare "Cards: 0".
    const lines = text.split('\n');
    const offenders = lines.filter(
      (line) => /Cards:\s*0(?!\s*\()/.test(line),
    );
    expect(offenders).toEqual([]);
  });
});
