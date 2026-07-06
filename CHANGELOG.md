# Changelog

All notable changes to Ultra Confrontation Engine are documented in this file.

The project uses SemVer-style versions during early development. While UCE is still in the `0.x` line, patch releases may contain participant-facing iteration work, and larger capability milestones should move the minor version.

## [0.1.2] - 2026-07-06

### Tournament System Refresh - 2026-07-07

#### 中文

- 优化了赛事系统，增加了可视化的对位表。
- 优化了界面特效设计。
- 优化了人物设计列表。
- 优化了模拟对战。
- 修复了若干 BUG。

#### English

- Optimized the tournament system and added a visual matchup bracket.
- Improved UI effect design.
- Improved the character design list.
- Improved Battle Simulation.
- Fixed several bugs.

This section was translated with AI. Please forgive any errors.

#### 日本語

- トーナメントシステムを最適化し、視覚的な対戦表を追加しました。
- UI エフェクトデザインを改善しました。
- キャラクター設計リストを改善しました。
- 模擬対戦を改善しました。
- 複数の不具合を修正しました。

この本文はAI翻訳を使用しています。誤りがある場合はご容赦ください。

### Developer Access Update

#### 中文

- 将 UCE 版本号更新为 `v0.1.2`，默认启动进入参赛者模式。
- 新增开发者 ID 与开发者密钥验证，官方审核、AI 训练和开发者列表入口需要验证后访问。
- 新增开发者列表页面，项目所有者可以添加开发者信息和头像，其他开发者只能查看。
- 重构设置页面和开发者列表布局，并将主页入口文案统一为“开发者”。

#### English

- Updated UCE to `v0.1.2`, with participant mode as the default startup mode.
- Added developer ID and developer key verification for Official Review, AI Trainer, and Developer List access.
- Added the Developer List page. The project owner can add developer profiles and avatars, while other developers have read-only access.
- Reworked the Settings page and Developer List layout, and unified the home entry wording as “Developer”.

This text was translated with AI. Please forgive any errors.

#### 日本語

- UCE を `v0.1.2` に更新し、起動時の初期モードを参加者モードにしました。
- 公式審査、AI トレーナー、開発者リストにアクセスするための開発者 ID と開発者キー認証を追加しました。
- 開発者リストページを追加しました。プロジェクト所有者は開発者情報とアバターを追加でき、他の開発者は閲覧のみ可能です。
- 設定ページと開発者リストのレイアウトを調整し、ホーム画面の入口表記を「開発者」に統一しました。

この本文はAI翻訳を使用しています。誤りがある場合はご了承ください。

## [0.1.1] - 2026-07-05

### Final Refresh - 2026-07-05

#### 中文

- 完成主界面中英文 LOGO 最终接入。
- 中文 LOGO 与英文 LOGO 均使用完整底图加分层素材动效，并统一画布对齐，避免素材错位或图片丢失。
- 将 `v0.1.1` 作为参赛者发行前的最终收尾版本。

#### English

- Finalized the Chinese and English homepage logo integration.
- Both logos now use full base artwork plus aligned animated asset layers to prevent missing images or misaligned parts.
- Marks `v0.1.1` as the final closing build before the participant release handoff.

This section was translated with AI. Please forgive any errors.

#### 日本語

- ホーム画面の中国語版・英語版ロゴの最終統合を完了しました。
- 両方のロゴで完全なベース画像と整列済みのアニメーション素材レイヤーを使用し、画像欠落や素材のずれを防ぐようにしました。
- `v0.1.1` を参加者向け配布前の最終仕上げビルドとして位置づけます。

この本文はAI翻訳を使用しています。誤りがある場合はご容赦ください。

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
