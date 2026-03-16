## ADDED Requirements

### Requirement: Analyze deck ink curve
The system SHALL provide an `analyze_ink_curve` tool that analyzes a deck list's ink distribution using ground-truth card data fields (cost, inkwell, ink color).

#### Scenario: Valid deck list
- **WHEN** user provides a deck list in text format (e.g., "2 Elsa - Snow Queen\n3 Mickey Mouse - Brave Little Tailor")
- **THEN** system returns: ink cost distribution (histogram of cards at each cost), inkable vs non-inkable count and ratio, ink color distribution, average cost, and total card count

#### Scenario: Ink cost histogram
- **WHEN** deck is analyzed
- **THEN** system returns the count of cards at each ink cost (1 through max), enabling the model to describe the curve shape

#### Scenario: Inkwell ratio
- **WHEN** deck is analyzed
- **THEN** system returns the count and percentage of inkable cards vs non-inkable cards, with a note if the ratio is outside typical range (below 40% or above 70% inkable)

#### Scenario: Multi-ink color deck
- **WHEN** deck contains cards of multiple ink colors
- **THEN** system returns the count per ink color and flags if the deck uses more than 2 ink colors (which is unusual in Lorcana)

#### Scenario: Unrecognized card in deck list
- **WHEN** a card name in the deck list doesn't match any card in the database
- **THEN** system flags the unrecognized card by name and continues analyzing the remaining cards

#### Scenario: Card name with version disambiguation
- **WHEN** deck list includes "2 Elsa - Snow Queen"
- **THEN** system resolves to the specific version "Snow Queen" rather than an arbitrary Elsa card
