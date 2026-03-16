## ADDED Requirements

### Requirement: Browse by Disney franchise
The system SHALL provide a `browse_franchise` tool that groups and filters cards by their Disney franchise using the `story` field from LorcanaJSON.

#### Scenario: List all franchises
- **WHEN** user calls browse_franchise without a franchise name
- **THEN** system returns all unique franchise names (story values) with card counts, sorted by card count descending

#### Scenario: Browse specific franchise
- **WHEN** user calls browse_franchise with franchise "Frozen"
- **THEN** system returns all cards from the Frozen franchise with standard card details

#### Scenario: Franchise not found
- **WHEN** user calls browse_franchise with a franchise name that doesn't match
- **THEN** system returns an error with suggestions based on partial matching (e.g., "Little" → "The Little Mermaid")

### Requirement: Franchise statistics
The system SHALL include summary statistics when browsing a specific franchise.

#### Scenario: Franchise summary
- **WHEN** user browses a specific franchise
- **THEN** system includes: total cards, ink color distribution, type breakdown (Characters/Actions/Songs/Items), rarity distribution, and set appearances
