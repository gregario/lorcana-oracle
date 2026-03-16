# card-search Specification

## Purpose
TBD - created by archiving change lorcana-oracle. Update Purpose after archive.
## Requirements
### Requirement: Full-text card search
The system SHALL provide a `search_cards` tool that searches Lorcana cards by name, rules text, type, subtypes, ink color, cost, rarity, and keywords using FTS5 full-text search.

#### Scenario: Search by card name
- **WHEN** user searches with query "Elsa"
- **THEN** system returns all cards with "Elsa" in their name, including all versions (e.g., "Elsa - Snow Queen", "Elsa - Spirit of Winter")

#### Scenario: Search by rules text
- **WHEN** user searches with query "draw a card"
- **THEN** system returns all cards whose rules text contains "draw a card"

#### Scenario: Filter by ink color
- **WHEN** user searches with ink filter "Amethyst"
- **THEN** system returns only cards with ink color "Amethyst"

#### Scenario: Filter by cost range
- **WHEN** user searches with cost filter ">= 5"
- **THEN** system returns only cards with ink cost 5 or greater

#### Scenario: Filter by type
- **WHEN** user searches with type filter "Song"
- **THEN** system returns only cards with type "Song"

#### Scenario: Filter by rarity
- **WHEN** user searches with rarity filter "Legendary"
- **THEN** system returns only Legendary rarity cards

#### Scenario: Pagination
- **WHEN** search returns more results than the limit (default 20)
- **THEN** system returns results with a cursor for fetching the next page

#### Scenario: No results
- **WHEN** search matches no cards
- **THEN** system returns an empty result set with a message indicating no matches

### Requirement: Card result format
The system SHALL return card results with: name, version, ink color, cost, inkwell status, type, subtypes, strength, willpower, lore value, rarity, rules text, set name, and collector number.

#### Scenario: Character card result
- **WHEN** a Character card is returned
- **THEN** result includes name, version, ink, cost, inkwell, strength, willpower, lore, rarity, text, keywords, classifications, set name, and collector number

#### Scenario: Action/Song card result
- **WHEN** an Action or Song card is returned
- **THEN** result includes name, ink, cost, inkwell, rarity, text, keywords, set name, and collector number (strength/willpower/lore are null)

