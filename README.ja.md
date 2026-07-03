# Ultra Confrontation - 超类史诗

[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

Ultra Confrontation は、私自身が Undertale のファン創作やファンゲームのキャラクターを原型として開発しているエンジニアリングプロジェクトです。手軽に楽しめる AI 戦闘シミュレーションを目的としており、将来的には Undertale AU の Mugen 格闘ゲーム開発や、その他のゲームデザイン内容にも統合していく予定です。そのため、プロジェクト全体を Ultra Confrontation Game と呼び、以下では UC または UCG と略します。

Ultra Confrontation Engine は、このプロジェクトから生まれたエンジンです。以下では UCE と略します。UCE は、プレイヤーが個人でキャラクターを開発したり、自分自身のキャラクターを設計したり、ニューラルネットワークの訓練とシミュレーションを行って自分だけの AI キャラクターを作成したりするためのものです。また、将来的なゲーム進行システムやオンライン大会シミュレーションなどの開発基盤にもなります。

現在の設計に基づき、UCE エンジン開発段階では UC の S1 シーズン「起源」がすでに開始されています。このシーズンは、現時点では全言語圏のファン創作者コミュニティに向けて開放していません。現在は中国語コミュニティを対象に、試験的な開発と大会シミュレーションを行っています。

このプロジェクトに興味がある場合、または将来的に広い可能性があると考えていただける場合は、内容改善のための提案を歓迎します。

## 技術スタック

- フロントエンド：React 19、TypeScript、Vite
- デスクトップシェル：Tauri 2
- 状態管理と国際化：Zustand、i18next
- バックエンドエンジン：`src-tauri/src` 配下の Rust コマンドとロジック
- ゲームデータ：`assets` と `src-tauri/assets` 配下の JSON ファイル

## プロジェクト構成

- `src/`：React アプリ、ページ、共通 UI コンポーネント、ストア、スタイル
- `src-tauri/src/`：Rust 戦闘エンジン、ローダー、ルール、モデル、Tauri コマンド
- `assets/`：編集可能なソースゲームデータ
- `src-tauri/assets/`：Tauri バックエンドが実行時に使用するデータ
- `replays/`：アプリによって生成されるローカルリプレイファイル

## 開発

依存関係をインストール：

```powershell
npm install
```

Web フロントエンドを実行：

```powershell
npm run dev
```

Tauri アプリを実行：

```powershell
npm run tauri dev
```

フロントエンドをビルド：

```powershell
npm run build
```

Rust バックエンドをチェック：

```powershell
cd src-tauri
cargo check
```

Translation note: 此段对话使用AI进行翻译，如有错误还请谅解
