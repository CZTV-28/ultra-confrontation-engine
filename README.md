# Ultra Confrontation - 超类史诗

当前 UCE 引擎版本：`0.1.0`

[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

Ultra Confrontation 是我本人基于 Undertale 同人创作和同人游戏人物为蓝本开发的工程项目，用于一些即时取乐的 AI 战斗模拟，并会在后期并入开发 Undertale AU 的 Mugen 格斗游戏，以及一些其他游戏设计内容，因此统称为 Ultra Confrontation Game（下文简称 UC 或 UCG）。

Ultra Confrontation Engine 是基于此工程诞生的引擎（下文简称 UCE），用于玩家个人使用开发角色、设计自己的角色，并进行神经网络训练和模拟，制造属于自己的 AI 人物等内容，也为后期游戏进程和模拟线上赛事等内容的开发铺垫基础。

基于现有的设计，在 UCE 引擎开发阶段，UC 的 S1 赛季：起源已经开启。本赛季暂不面向全语言社区的同人创作者开放，目前只针对中文社区进行试点开发和赛事模拟。

如果你对这个项目感兴趣，或者认为它日后的前景比较广阔，可以提出建议，帮助我改进其中的内容。

## 技术栈

- 前端：React 19、TypeScript、Vite
- 桌面端外壳：Tauri 2
- 状态管理与国际化：Zustand、i18next
- 后端引擎：位于 `src-tauri/src` 的 Rust 命令与逻辑
- 游戏数据：位于 `assets` 和 `src-tauri/assets` 的 JSON 文件

## 项目结构

- `src/`：React 应用、页面、通用 UI 组件、状态仓库和样式
- `src-tauri/src/`：Rust 战斗引擎、加载器、规则、模型和 Tauri 命令
- `assets/`：可编辑的源游戏数据
- `src-tauri/assets/`：Tauri 后端运行时使用的数据
- `replays/`：应用生成的本地回放文件

## 开发

安装依赖：

```powershell
npm install
```

同步游戏数据：

```powershell
npm run sync:assets
```

检查游戏数据是否同步：

```powershell
npm run check:assets
```

运行 Web 前端：

```powershell
npm run dev
```

运行 Tauri 应用：

```powershell
npm run tauri dev
```

构建前端：

```powershell
npm run build
```

检查 Rust 后端：

```powershell
cd src-tauri
cargo check
```
