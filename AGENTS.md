# Codex Project Instructions

## Scope

These instructions apply to the whole `ultra-confrontation-engine` project.

## Commands

- Install dependencies with `npm install`.
- Validate frontend changes with `npm run build`.
- Validate Rust/Tauri changes with `cargo check` from `src-tauri`.
- Run the desktop app with `npm run tauri dev`.

## Project Rules

- Keep edits scoped to the requested feature or fix.
- Do not commit or rely on generated directories: `node_modules`, `dist`, and `src-tauri/target`.
- Treat `replays/*.ucr` as local runtime output unless a replay is explicitly needed as a fixture.
- When changing game data, check both `assets` and `src-tauri/assets`; document which copy is authoritative for the change.
- Preserve strict TypeScript settings. Do not leave unused variables or parameters in frontend code.
- Prefer fixing mojibaked Chinese strings when touching nearby user-facing text.

## Verification Notes

- For frontend-only changes, run `npm run build`.
- For backend command, model, rule, loader, or battle-engine changes, run `cargo check` in `src-tauri` and `npm run build` at the project root.
- If a change affects the visual UI, run the app or dev server and inspect the affected screen.
