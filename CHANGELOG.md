# Changelog

All notable changes to lorcana-oracle will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.2

### Fixed
- **`browse_sets` UX gap for unreleased sets:** Fleet QA flagged that "Attack of the
  Vine" was listed with 0 cards and no explanation, indistinguishable from a broken
  set. The tool now surfaces upstream's `hasAllCards` flag and labels sets honestly:
  unreleased sets with a known date show "Cards: 0 (set unreleased — releases
  YYYY-MM-DD)", announced sets with no date show "Cards: 0 (set unreleased — release
  date TBA)", and pre-release sets with spoiler cards (e.g. "Wilds Unknown") gain a
  Preview banner. Drilling into an empty unreleased set returns an explanatory
  message instead of "Cards in set (0):".
- **Missing Set 14 "Hyperia City":** Re-ran `fetch-data` and picked up the new
  upstream entry — 16 sets total now (was 15 in 0.1.1).
- **Glama auto-rebuild compatibility:** Glama clones the repo and runs
  `npm install && npm run build` in its container. The build script silently
  no-ops the sqlite copy when the file is missing, so the gitignored data file
  was leading to a working server with zero data — tools listed, every query
  empty. SQLite is now tracked in git (~2.4 MB); refresh via `npm run fetch-data`.

### Added
- New `released` column on `sets`, populated from `setInfo.hasAllCards`.
- `listSets()` orders released sets by date first, then unreleased, with TBA last.

### Tests
- Added regression assertion that no `browse_sets` row says "Cards: 0" without
  a status qualifier.
- Added unreleased-set fixtures ("Attack of the Vine", "Hyperia City"). All 97
  tests pass.

## 0.1.1

- Use `realpathSync` for `isMain` detection to support npm global symlinks.

## 0.1.0

- Initial release.
