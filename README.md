# lorcana-oracle

Disney Lorcana TCG MCP server -- card search, deck analysis, and franchise browsing powered by LorcanaJSON.

<p align="center">
  <a href="https://www.npmjs.com/package/lorcana-oracle"><img src="https://img.shields.io/npm/v/lorcana-oracle.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/lorcana-oracle"><img src="https://img.shields.io/npm/dm/lorcana-oracle.svg" alt="npm downloads"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js 18+"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-purple.svg" alt="MCP Compatible"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/sponsors/gregario"><img src="https://img.shields.io/badge/sponsor-♥-ea4aaa.svg" alt="Sponsor"></a>
</p>

## Features

- **search_cards** -- Search cards by name, rules text, ink color, type, rarity, set, or cost range
- **browse_sets** -- List all sets or drill into a specific set to see its cards
- **character_versions** -- Compare all printings of a character across sets
- **browse_franchise** -- Browse cards by Disney franchise (Frozen, Moana, etc.)
- **analyze_ink_curve** -- Analyze a deck list for ink cost distribution, inkable ratio, and color balance
- **analyze_lore** -- Analyze lore generation in a deck or find top lore-generating cards
- **find_song_synergies** -- Find which characters can sing a song, or which songs a character can sing

## Installation

### Quick start

```bash
npx lorcana-oracle
```

On first run, the server downloads card data from LorcanaJSON and builds a local SQLite database. Subsequent runs use the cached database.

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lorcana-oracle": {
      "command": "npx",
      "args": ["-y", "lorcana-oracle"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add lorcana-oracle -- npx -y lorcana-oracle
```

## Tools

### search_cards

Search Disney Lorcana cards by name, rules text, or filters (ink color, type, rarity, set, cost range). Returns paginated results.

```
search_cards({ query: "Elsa", color: "Amethyst" })
search_cards({ type: "Song", cost_max: 3 })
search_cards({ query: "draw a card", rarity: "Legendary" })
```

### browse_sets

List all Disney Lorcana sets, or drill into a specific set to see its metadata and cards.

```
browse_sets({})
browse_sets({ set_code: "1" })
```

### character_versions

Show all printings/versions of a Disney Lorcana character across sets. Useful for comparing different versions of the same character.

```
character_versions({ character_name: "Elsa" })
character_versions({ character_name: "Mickey Mouse" })
```

### browse_franchise

Browse Disney Lorcana cards by franchise (story). Without a franchise name, lists all franchises with card counts. With a franchise name, shows cards and statistics.

```
browse_franchise({})
browse_franchise({ franchise: "Frozen" })
```

### analyze_ink_curve

Analyze a Disney Lorcana deck list for ink cost distribution, inkable ratio, and color balance. Paste a deck list to get curve analysis.

```
analyze_ink_curve({ deck_list: "4 Elsa - Snow Queen\n4 Let It Go\n2 Hades - King of Olympus" })
```

### analyze_lore

Analyze lore generation in a deck list, or find the top lore-generating cards. In deck mode, shows total lore potential and efficiency ranking. In query mode, shows top lore generators with optional filters.

```
analyze_lore({ deck_list: "4 Elsa - Snow Queen\n4 Mickey Mouse - Brave Little Tailor" })
analyze_lore({ color: "Amber", min_lore: 3 })
```

### find_song_synergies

Find Disney Lorcana song synergies. Given a Song, find characters that can sing it. Given a Character, find songs they can sing. With no input, browse all songs with singer counts.

```
find_song_synergies({ card_name: "Let It Go" })
find_song_synergies({ card_name: "Elsa - Snow Queen" })
find_song_synergies({})
```

## Data Source

Card data is sourced from [LorcanaJSON](https://lorcanajson.org/) (MIT license). LorcanaJSON provides comprehensive card data for all released Disney Lorcana sets.

Disney Lorcana is a product of Ravensburger. This project is not affiliated with or endorsed by Ravensburger or The Walt Disney Company. Card data usage follows the [Ravensburger Community Code Policy](https://www.ravensburger.us/lorcana/community-code).

## License

[MIT](LICENSE)
