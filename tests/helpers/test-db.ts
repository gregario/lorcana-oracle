import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../../src/server.js';
import { getDatabase } from '../../src/data/db.js';
import type Database from 'better-sqlite3';

export function seedTestData(db: Database.Database): void {
  // Insert sets
  const insertSet = db.prepare(
    'INSERT INTO sets (code, name, type, release_date, prerelease_date, card_count) VALUES (?, ?, ?, ?, ?, ?)',
  );
  insertSet.run('1', 'The First Chapter', 'core', '2023-08-18', '2023-08-18', 204);
  insertSet.run('2', 'Rise of the Floodborn', 'core', '2023-11-17', '2023-11-17', 204);

  // Insert cards
  const insertCard = db.prepare(
    `INSERT INTO cards (
      id, name, full_name, simple_name, version, type, color, cost, inkwell,
      strength, willpower, lore, move_cost, rarity, number, set_code,
      full_text, subtypes, subtypes_text, story, keyword_abilities,
      flavor_text, artists, image_url, base_id, enchanted_id, epic_id,
      iconic_id, reprinted_as_ids, reprint_of_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )`,
  );

  // 1: Elsa - Snow Queen (Amethyst Character, Legendary, set 1, Frozen)
  insertCard.run(
    1, 'Elsa', 'Elsa - Snow Queen', 'elsa-snow-queen', 'Snow Queen',
    'Character', 'Amethyst', 4, 1,
    3, 4, 2, null, 'Legendary', 1, '1',
    'Freeze - When you play this character, exert chosen opposing character.',
    '["Storyborn","Hero","Queen"]', 'Storyborn - Hero - Queen', 'Frozen',
    '["Freeze"]',
    'The cold never bothered her anyway.', 'Artist Name', 'https://example.com/elsa.png',
    null, 2, null, null, null, null,
  );

  // 2: Elsa - Snow Queen (Enchanted variant, set 1)
  insertCard.run(
    2, 'Elsa', 'Elsa - Snow Queen', 'elsa-snow-queen', 'Snow Queen',
    'Character', 'Amethyst', 4, 1,
    3, 4, 2, null, 'Enchanted', 2, '1',
    'Freeze - When you play this character, exert chosen opposing character.',
    '["Storyborn","Hero","Queen"]', 'Storyborn - Hero - Queen', 'Frozen',
    '["Freeze"]',
    'The cold never bothered her anyway.', 'Artist Name', 'https://example.com/elsa-enchanted.png',
    1, null, null, null, null, null,
  );

  // 3: Elsa - Spirit of Winter (Amethyst Character, set 2, Frozen, Shift)
  insertCard.run(
    3, 'Elsa', 'Elsa - Spirit of Winter', 'elsa-spirit-of-winter', 'Spirit of Winter',
    'Character', 'Amethyst', 6, 0,
    4, 6, 3, null, 'Super Rare', 1, '2',
    'Shift 4 - Deep Freeze - When you play this character, exert all opposing characters.',
    '["Storyborn","Hero","Queen"]', 'Storyborn - Hero - Queen', 'Frozen',
    '["Shift","Deep Freeze"]',
    'Let the storm rage on.', 'Artist Name', 'https://example.com/elsa-spirit.png',
    null, null, null, null, null, null,
  );

  // 4: Mickey Mouse - Brave Little Tailor (Amber Character, set 1, draw a card)
  insertCard.run(
    4, 'Mickey Mouse', 'Mickey Mouse - Brave Little Tailor', 'mickey-mouse-brave-little-tailor',
    'Brave Little Tailor',
    'Character', 'Amber', 3, 1,
    3, 3, 1, null, 'Rare', 3, '1',
    'Is Everybody Happy? - Whenever this character quests, you may draw a card.',
    '["Storyborn","Hero"]', 'Storyborn - Hero', 'Mickey Mouse & Friends',
    null,
    'Oh boy!', 'Artist Name', 'https://example.com/mickey.png',
    null, null, null, null, null, null,
  );

  // 5: A Whole New World (Amber Song, cost 5, set 1, Aladdin)
  insertCard.run(
    5, 'A Whole New World', 'A Whole New World', 'a-whole-new-world', null,
    'Song', 'Amber', 5, 1,
    null, null, null, null, 'Uncommon', 4, '1',
    'Each player draws 7 cards.',
    null, null, 'Aladdin',
    null,
    'A dazzling place I never knew.', 'Artist Name', 'https://example.com/awholenewworld.png',
    null, null, null, null, null, null,
  );

  // 6: Let It Go (Amethyst Song, cost 3, set 1, Frozen)
  insertCard.run(
    6, 'Let It Go', 'Let It Go', 'let-it-go', null,
    'Song', 'Amethyst', 3, 1,
    null, null, null, null, 'Common', 5, '1',
    'Deal 3 damage to chosen character.',
    null, null, 'Frozen',
    null,
    "Can't hold it back anymore.", 'Artist Name', 'https://example.com/letitgo.png',
    null, null, null, null, null, null,
  );

  // 7: Ariel - On Human Legs (Emerald Character, cost 2, set 1, The Little Mermaid)
  insertCard.run(
    7, 'Ariel', 'Ariel - On Human Legs', 'ariel-on-human-legs', 'On Human Legs',
    'Character', 'Emerald', 2, 1,
    2, 3, 1, null, 'Common', 6, '1',
    'Voiceless - This character can\'t use Song cards.',
    '["Storyborn","Hero","Princess"]', 'Storyborn - Hero - Princess', 'The Little Mermaid',
    '["Voiceless"]',
    'Part of your world.', 'Artist Name', 'https://example.com/ariel.png',
    null, null, null, null, null, null,
  );

  // 8: Hades - King of Olympus (Ruby Character, cost 7, set 1, Hercules)
  insertCard.run(
    8, 'Hades', 'Hades - King of Olympus', 'hades-king-of-olympus', 'King of Olympus',
    'Character', 'Ruby', 7, 0,
    6, 6, 2, null, 'Legendary', 7, '1',
    'Is There A Problem? - Whenever this character is challenged, banish the challenging character.',
    '["Storyborn","Villain","Deity"]', 'Storyborn - Villain - Deity', 'Hercules',
    null,
    "Name's Hades, Lord of the Dead.", 'Artist Name', 'https://example.com/hades.png',
    null, null, null, null, null, null,
  );

  // 9: Maui's Fish Hook (Sapphire Item, cost 3, set 1, Moana)
  insertCard.run(
    9, "Maui's Fish Hook", "Maui's Fish Hook", 'mauis-fish-hook', null,
    'Item', 'Sapphire', 3, 1,
    null, null, null, null, 'Uncommon', 8, '1',
    'Banish this item - Chosen character gets +2 strength this turn.',
    null, null, 'Moana',
    null,
    'You will board my boat!', 'Artist Name', 'https://example.com/fishook.png',
    null, null, null, null, null, null,
  );

  // 10: Motunui - Island Paradise (Sapphire Location, cost 4, moveCost 2, set 2, Moana)
  insertCard.run(
    10, 'Motunui', 'Motunui - Island Paradise', 'motunui-island-paradise', 'Island Paradise',
    'Location', 'Sapphire', 4, 1,
    null, null, 1, 2, 'Rare', 2, '2',
    'Gather - Characters here get +1 lore.',
    null, null, 'Moana',
    '["Gather"]',
    'Where the people are happy to stay.', 'Artist Name', 'https://example.com/motunui.png',
    null, null, null, null, null, null,
  );
}

export async function createTestClient(): Promise<{
  client: Client;
  db: Database.Database;
}> {
  const db = getDatabase(':memory:');
  seedTestData(db);

  const server = createServer({ db });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  return { client, db };
}
