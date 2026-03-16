# Project Instructions

This is a project inside the AI-Factory workspace. It follows the spec-driven workflow defined in the parent CLAUDE.md.

## Workflow Overview

This project uses two complementary tools:

- **OpenSpec** — Product thinking. Creates specs, designs changes, manages the product lifecycle.
- **Superpowers** — Engineering. Implements tasks with TDD, code review, and subagent execution.

## Spec Mode (OpenSpec)

Use OpenSpec for:
- Defining the product (first specs)
- Proposing new features or large enhancements
- Reviewing and updating specs after code has changed

Key commands:
- `/opsx:propose "idea"` — Propose a change. Generates proposal, design, specs, and tasks.
- `/opsx:explore` — Review the current state of specs.
- `/opsx:archive` — Archive a completed change and update master specs.

Note: `/opsx:apply` is deprecated. After OpenSpec generates tasks, use Design Mode then Superpowers to implement — not `/opsx:apply`.

OpenSpec manages all specs in `openspec/specs/` (delivered capabilities) and `openspec/changes/` (in-progress work). Do not create or edit spec files manually outside of OpenSpec's workflow.

### Spec Sync Rule

When returning to OpenSpec after a period of Superpowers iterations, OpenSpec must first review the current codebase to update its understanding of the product before generating new specs. Code may have evolved since the last spec was written.

## Execution Mode (Superpowers)

Use Superpowers for:
- Implementing tasks from OpenSpec proposals
- Small enhancements and iterations
- Bug fixes
- Refactoring

Superpowers activates automatically. Its skills enforce:
- TDD (red-green-refactor)
- Systematic debugging
- Code review before completion
- Subagent-driven development for complex tasks

## When to Use Which

| Situation | Tool |
|---|---|
| New product definition | OpenSpec |
| New feature or large enhancement | OpenSpec → then Superpowers to implement |
| Small enhancement or iteration | Superpowers directly |
| Bug fix | Superpowers directly |
| Specs and code have diverged | OpenSpec (review + update specs) |
| Refactoring | Superpowers directly |

## Development Rules

1. Never write code before specs exist. Use OpenSpec to create them.
2. All source code goes in `/src/`.
3. All tests go in `/tests/`.
4. Run tests after every change.
5. Work in small iterative commits.
6. Do not add dependencies without recording them in the architecture spec via OpenSpec.

## File Hygiene

- Do not create files outside of `/src/`, `/tests/`, and `openspec/` unless there is a clear reason.
- Keep files small and focused.
- If a spec is ambiguous or missing, raise it — do not guess.

## Project Setup

After copying this template, run:
1. `openspec init --tools claude` to initialize the spec system.
2. Use `/opsx:propose` to define the product.
