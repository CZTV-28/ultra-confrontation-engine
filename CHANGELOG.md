# Changelog

All notable changes to Ultra Confrontation Engine are documented in this file.

The project uses SemVer-style versions during early development. While UCE is still in the `0.x` line, patch releases may contain participant-facing iteration work, and larger capability milestones should move the minor version.

## [0.1.1] - 2026-07-05

### Added

- Added the participant release homepage flow with focused entries for Character Forge, S1 Rules, and Settings.
- Added the S1 participant rules and submission guide page.
- Added `.ucechar` participant character submission export.
- Added export metadata for UCE version, character schema version, S1 ruleset version, export time, and SHA-256 checksum.

### Changed

- Updated the application version to `0.1.1`.
- Updated Character Forge wording from generic resource export to participant submission export.
- Documented the difference between participant `.ucechar` packages and official `assets/` resources.

### Verified

- `npm run build`
- `npm run check:assets`
- `cargo test`
- `npm run tauri build`

## [0.1.0] - 2026-07-05

### Added

- Established UCE `0.1.0` as the first public development baseline.
- Added S1 Origin resource validation for fixed `500 HP / 250 MP` character limits.
- Added Character Forge for S1 character, skill, passive, and training-note drafting.
- Added S1 resource specification documentation.
- Added battle setup support for character and arena resource data.
- Added replay import/export foundations.
- Added Windows installer artifacts for the first local release build.

### Verified

- `npm run check:assets`
- `cargo test`
- `npm run build`
