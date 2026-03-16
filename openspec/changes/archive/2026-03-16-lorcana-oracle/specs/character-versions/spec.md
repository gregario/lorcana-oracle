## ADDED Requirements

### Requirement: Explore character versions
The system SHALL provide a `character_versions` tool that returns all printings/versions of a Disney character across all sets using variant cross-reference fields.

#### Scenario: Character with multiple versions
- **WHEN** user queries character "Elsa"
- **THEN** system returns all cards named "Elsa" across all sets, grouped by version (e.g., "Snow Queen", "Spirit of Winter", "Ice Surfer"), showing ink, cost, rarity, lore, strength, willpower, and set for each

#### Scenario: Character with single version
- **WHEN** user queries a character that only has one card
- **THEN** system returns that single card with its details

#### Scenario: Character not found
- **WHEN** user queries a character name that doesn't match any card
- **THEN** system returns an error with suggestions based on partial name matching

### Requirement: Version comparison
The system SHALL present character versions in a way that makes comparing stats across versions easy.

#### Scenario: Compare versions side by side
- **WHEN** multiple versions of a character are returned
- **THEN** each version shows: version name, ink color, cost, inkwell, strength, willpower, lore, rarity, set, and rules text — enabling direct comparison
