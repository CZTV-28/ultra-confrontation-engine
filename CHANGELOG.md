# Changelog

All notable changes to Ultra Confrontation Engine are documented in this file.

The project uses SemVer-style versions during early development. While UCE is still in the `0.x` line, patch releases may contain participant-facing iteration work, and larger capability milestones should move the minor version.

## [0.1.1] - 2026-07-05

### Release Refresh - 2026-07-05

#### 中文

- 升级模拟对战、角色选择和地图选择界面，使其与主菜单视觉风格统一。
- 角色库和地图库预留后续空白位；地图“原型竞技场”更名为“测试场地”。
- 角色设计新增立绘上传，导出的 `.ucechar` 会携带立绘数据。
- 完善桌面端图片读取权限，并预留地图缩略图字段。
- 补充赛事、官方审核、S1 名单和开发计划相关基础内容。

#### English

- Upgraded the Battle Simulation, character selection, and stage selection screens to match the main menu visual style.
- Added future empty slots for the character and stage libraries; renamed the prototype arena to “Test Stage”.
- Added character portrait upload support. Exported `.ucechar` packages now carry portrait data.
- Added desktop image-read permission and reserved thumbnail support for future stages.
- Expanded the foundation for Events, Official Review, the S1 roster, and the development roadmap.

This section was translated with AI. Please forgive any errors.

#### 日本語

- 模擬対戦、キャラクター選択、ステージ選択画面をメインメニューと同じ視覚スタイルに更新しました。
- 今後の追加に備えてキャラクター一覧とステージ一覧に空き枠を追加し、プロトタイプ競技場を「テストステージ」に改名しました。
- キャラクター設計に立ち絵アップロード機能を追加し、出力される `.ucechar` に立ち絵データを含めるようにしました。
- デスクトップ版の画像読み取り権限を追加し、今後のステージ用サムネイル項目を予約しました。
- イベント、公式審査、S1 名簿、開発計画の基礎内容を拡張しました。

この本文はAI翻訳を使用しています。誤りがある場合はご容赦ください。

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
