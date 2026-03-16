# AI Product Template

A spec-driven project template for the AI-Factory workspace. Uses OpenSpec for product thinking and Superpowers for engineering.

## How to Use This Template

### 1. Copy the template

```
cp -r templates/ai-product-template projects/your-product-name
cd projects/your-product-name
```

### 2. Initialize OpenSpec

```
openspec init --tools claude
```

This creates the `openspec/` directory structure and installs slash commands.

### 3. Define the product

Use OpenSpec to create the initial product specs:

```
/opsx:propose "define the product — [your product description]"
```

OpenSpec will generate:
- A proposal (what and why)
- A design (how)
- Specs (requirements and scenarios)
- Tasks (implementation steps)

Do not write code until specs are approved.

### 4. Implement

Once specs are approved, use Superpowers to implement:

- Superpowers activates automatically and enforces TDD, code review, and structured execution
- Work through tasks one at a time
- Place code in `/src/` and tests in `/tests/`

### 5. Iterate

For small changes and bug fixes, use Superpowers directly — no spec update needed.

For new features or large enhancements, go back to OpenSpec:

```
/opsx:propose "add [new feature]"
```

OpenSpec will review the current codebase before generating new specs.

### 6. Archive completed changes

```
/opsx:archive
```

This moves completed changes to the archive and updates master specs.

## Template Structure

```
your-product/
  CLAUDE.md              # Project-level AI instructions
  README.md              # This file
  .gitignore
  src/                   # All source code
  tests/                 # All tests
```

After `openspec init`:

```
your-product/
  ...
  openspec/
    specs/               # Delivered capability specs (managed by OpenSpec)
    changes/             # In-progress change proposals
  .claude/
    commands/opsx/       # OpenSpec slash commands
    skills/              # OpenSpec skills
```

## Works For

This template is product-type agnostic:

- Games
- Mobile apps
- SaaS products
- CLI tools
- APIs
- Web apps

The tech stack is defined through OpenSpec's architecture specs, not hardcoded in the template.
