## ADDED Requirements

### Requirement: Find song synergies
The system SHALL provide a `find_song_synergies` tool that identifies which characters can sing which songs for free using the deterministic game rule: a character with ink cost >= song ink cost can sing that song without paying its cost.

#### Scenario: Find singers for a specific song
- **WHEN** user queries with a song name (e.g., "A Whole New World")
- **THEN** system returns the song's cost and all characters that can sing it for free (cost >= song cost), grouped by ink color

#### Scenario: Find songs a character can sing
- **WHEN** user queries with a character name (e.g., "Elsa - Snow Queen")
- **THEN** system returns the character's cost and all songs they can sing for free (songs with cost <= character cost)

#### Scenario: Browse all songs
- **WHEN** user calls find_song_synergies without specifying a card
- **THEN** system returns all Song cards with their costs and the count of characters that can sing each one

#### Scenario: Song not found
- **WHEN** user queries a song name that doesn't match any Song-type card
- **THEN** system returns an error explaining the card is not a Song type, with suggestions

#### Scenario: Ink color filter
- **WHEN** user queries song synergies with an ink color filter
- **THEN** system returns only characters/songs of the specified ink color(s), useful for building within a color pair
