# set-browsing Specification

## Purpose
TBD - created by archiving change lorcana-oracle. Update Purpose after archive.
## Requirements
### Requirement: List all sets
The system SHALL provide a `browse_sets` tool that lists all Lorcana sets when called without a set code parameter.

#### Scenario: List all sets
- **WHEN** user calls browse_sets without a set code
- **THEN** system returns all sets with: code, name, release date, and card count

#### Scenario: Sets ordered by release date
- **WHEN** user lists all sets
- **THEN** sets are returned in chronological order (oldest first)

### Requirement: Browse set contents
The system SHALL allow drilling into a specific set to see its cards when a set code is provided.

#### Scenario: Browse specific set
- **WHEN** user calls browse_sets with set code "1"
- **THEN** system returns the set metadata plus all cards in "The First Chapter" ordered by collector number

#### Scenario: Invalid set code
- **WHEN** user calls browse_sets with a non-existent set code
- **THEN** system returns an error message listing available set codes

