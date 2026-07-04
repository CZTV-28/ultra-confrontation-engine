# UCE Versioning and Release Workflow

This document defines how Ultra Confrontation Engine uses Git, GitHub, SemVer, Conventional Commits, and manual GitHub Releases.

## Branch Model

- `main` is the source of truth.
- `main` should stay buildable and releasable.
- New work should use short-lived branches, then merge back into `main`.
- Avoid long-lived `develop` branches unless the project later has multiple maintainers and a clear reason.

Recommended branch names:

```text
feat/participant-import
fix/battle-log-scroll
docs/s1-rules
chore/release-0.1.2
```

## SemVer Policy

UCE versions use:

```text
MAJOR.MINOR.PATCH
```

Examples:

- `0.1.0`: first public development baseline.
- `0.1.1`: participant release iteration.
- `0.2.0`: a larger feature milestone, such as official import/review tooling.
- `1.0.0`: stable public contract for competitors and tournament operation.

During `0.x`, UCE is still pre-stable. We still use SemVer discipline, but small participant-facing milestones may use patch versions while the engine contract is evolving.

## Conventional Commits

Use this format:

```text
type(scope): summary
```

Useful types:

- `feat`: new capability.
- `fix`: bug fix.
- `docs`: documentation-only change.
- `style`: formatting or visual styling without behavior changes.
- `refactor`: code restructuring without behavior change.
- `test`: test-only change.
- `build`: build system, installer, or CI change.
- `chore`: maintenance.

Examples:

```text
feat(creator): export participant ucechar package
fix(battle): keep log scrolled to newest turn
docs(rules): explain S1 passive review policy
build(release): add Windows installer workflow
chore(release): prepare v0.1.1
```

Breaking changes use `!`:

```text
feat(rules)!: replace S1 character package schema
```

## Current Manual Release Checklist

Use this when preparing a release yourself:

1. Update versions in:
   - `package.json`
   - `package-lock.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
   - README version lines
   - visible UI version labels
2. Update `CHANGELOG.md`.
3. Run:

```powershell
npm run build
npm run check:assets
cargo test --manifest-path src-tauri\Cargo.toml
npm run tauri build
```

4. Commit with a Conventional Commit message:

```text
chore(release): prepare v0.1.1
```

5. Create an annotated tag:

```powershell
git tag -a v0.1.1 -m "UCE v0.1.1"
```

6. Push the branch and tag:

```powershell
git push origin main --tags
```

7. Create a GitHub Release and attach installer files.

## Release Automation Status

UCE currently uses a manual release workflow.

release-plz is not enabled for now. UCE is a Tauri desktop app, not a crates.io library package, and its Rust build script generates Tauri schema files during Cargo package verification. Manual releases are clearer at the current project stage.

The active automation is:

- CI verifies `main` on each push and pull request.
- The Windows release workflow builds installer assets when a GitHub Release is published.
- Version numbers, tags, changelog entries, and release notes are reviewed manually.

This keeps version history explicit while avoiding premature release automation.

## GitHub Release Assets

The repository includes a Windows release workflow that builds installers when a GitHub Release is published.

Expected assets:

```text
ultra-confrontation-engine_<version>_x64-setup.exe
ultra-confrontation-engine_<version>_x64_en-US.msi
```

For participant distribution, prefer the `setup.exe` installer.
