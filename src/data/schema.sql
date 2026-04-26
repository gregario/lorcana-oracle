-- Sets
-- `released` flag: 1 if cards are available (LorcanaJSON `hasAllCards`),
-- 0 if the set is announced but pre-release (cards not yet in the data feed).
CREATE TABLE IF NOT EXISTS sets (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  release_date TEXT,
  prerelease_date TEXT,
  card_count INTEGER DEFAULT 0,
  released INTEGER NOT NULL DEFAULT 1
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  simple_name TEXT,
  version TEXT,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  cost INTEGER,
  inkwell INTEGER DEFAULT 0,
  strength INTEGER,
  willpower INTEGER,
  lore INTEGER,
  move_cost INTEGER,
  rarity TEXT,
  number INTEGER,
  set_code TEXT REFERENCES sets(code),
  full_text TEXT,
  subtypes TEXT,
  subtypes_text TEXT,
  story TEXT,
  keyword_abilities TEXT,
  flavor_text TEXT,
  artists TEXT,
  image_url TEXT,
  base_id INTEGER,
  enchanted_id INTEGER,
  epic_id INTEGER,
  iconic_id INTEGER,
  reprinted_as_ids TEXT,
  reprint_of_id INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_simple_name ON cards(simple_name);
CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
CREATE INDEX IF NOT EXISTS idx_cards_color ON cards(color);
CREATE INDEX IF NOT EXISTS idx_cards_story ON cards(story);
CREATE INDEX IF NOT EXISTS idx_cards_cost ON cards(cost);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);

-- FTS5 for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  name,
  full_name,
  full_text,
  subtypes_text,
  keyword_abilities,
  story,
  content='cards',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Trigger to keep FTS in sync on INSERT
CREATE TRIGGER IF NOT EXISTS cards_fts_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid, name, full_name, full_text, subtypes_text, keyword_abilities, story)
  VALUES (new.id, new.name, new.full_name, new.full_text, new.subtypes_text, new.keyword_abilities, new.story);
END;
