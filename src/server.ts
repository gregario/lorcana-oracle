#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase } from './data/db.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type Database from 'better-sqlite3';

export interface ServerOptions {
  db?: Database.Database;
  dataDir?: string;
}

export function createServer(options?: ServerOptions): McpServer {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let version = '0.0.0';
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'),
    );
    version = pkg.version;
  } catch {
    // Fallback version if package.json not found (e.g., in tests)
  }

  const server = new McpServer({
    name: 'lorcana-oracle',
    version,
  });

  const db = options?.db ?? getDatabase(options?.dataDir);

  // TODO: register tools here
  // registerSearchCards(server, db);
  // registerBrowseSets(server, db);
  // registerCharacterVersions(server, db);
  // registerBrowseFranchise(server, db);
  // registerAnalyzeInkCurve(server, db);
  // registerAnalyzeLore(server, db);
  // registerFindSongSynergies(server, db);

  return server;
}

// Only start stdio when run directly
const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).includes(process.argv[1]);
if (isMain) {
  console.error('lorcana-oracle MCP server starting...');
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
