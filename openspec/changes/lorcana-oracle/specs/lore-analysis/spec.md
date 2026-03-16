## ADDED Requirements

### Requirement: Analyze lore generation
The system SHALL provide an `analyze_lore` tool that analyzes cards or deck lists by lore generation potential using the `lore` and `cost` data fields.

#### Scenario: Deck lore analysis
- **WHEN** user provides a deck list
- **THEN** system returns: total lore potential (sum of all character lore values × quantity), average lore per character, lore-per-cost efficiency for each character, and identification of the top lore generators in the deck

#### Scenario: Top lore generators query
- **WHEN** user queries for top lore generators without a deck list (e.g., by ink color or cost range)
- **THEN** system returns the characters with highest lore values, optionally filtered by ink color, cost range, or set

#### Scenario: Lore efficiency ranking
- **WHEN** deck is analyzed
- **THEN** system ranks characters by lore-per-cost ratio (lore value divided by ink cost), identifying the most efficient questers

#### Scenario: Non-character cards
- **WHEN** deck contains Actions, Songs, or Items (which have no lore value)
- **THEN** system correctly reports these as having zero lore contribution and excludes them from lore efficiency calculations

#### Scenario: Unrecognized card
- **WHEN** a card in the deck list doesn't match the database
- **THEN** system flags it and continues analyzing remaining cards
