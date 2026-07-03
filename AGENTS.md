# Codex Project Instructions

## Scope

These instructions apply to the whole `ultra-confrontation-engine` project.

## Commands

- Install dependencies with `npm install`.
- Synchronize game data with `npm run sync:assets`.
- Check game data synchronization with `npm run check:assets`.
- Validate frontend changes with `npm run build`.
- Validate Rust/Tauri changes with `cargo check` from `src-tauri`.
- Run the desktop app with `npm run tauri dev`.

## Project Rules

- Keep edits scoped to the requested feature or fix.
- Do not commit or rely on generated directories: `node_modules`, `dist`, and `src-tauri/target`.
- Treat `replays/*.ucr` as local runtime output unless a replay is explicitly needed as a fixture.
- Treat `assets` as the authoritative editable game data. Run `npm run sync:assets` after game data changes to update `src-tauri/assets`.
- Preserve strict TypeScript settings. Do not leave unused variables or parameters in frontend code.
- Prefer fixing mojibaked Chinese strings when touching nearby user-facing text.

## Verification Notes

- For frontend-only changes, run `npm run build`.
- For backend command, model, rule, loader, or battle-engine changes, run `cargo check` in `src-tauri` and `npm run build` at the project root.
- For game data changes, run `npm run check:assets`.
- If a change affects the visual UI, run the app or dev server and inspect the affected screen.
