import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "./helpers/test-db.js";

describe("lorcana-oracle server", () => {
  let client: Client;

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it("lists all 7 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_cards");
    expect(names).toContain("browse_sets");
    expect(names).toContain("character_versions");
    expect(names).toContain("browse_franchise");
    expect(names).toContain("analyze_ink_curve");
    expect(names).toContain("analyze_lore");
    expect(names).toContain("find_song_synergies");
    expect(tools).toHaveLength(7);
  });

  it("each tool has a description", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(20);
    }
  });
});
