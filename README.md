# Ultra Confrontation - 超类史诗

当前 UCE 引擎版本：`0.1.2`

[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

## 项目介绍

Ultra Confrontation 是一款基于《Undertale》同人游戏发展而设计的统筹类开发项目。我将其暂时分为两个部分：

其一，是 Ultra Confrontation Game，简称 UCG。其中包含卡牌游戏、模拟赛事对抗、MOBA 类、全向 Mugen 格斗、PVP、PVE 等内容，且不限于以上类别。

其二，是 Ultra Confrontation Engine，简称 UCE。UCE 将为上述所有内容服务。

这个引擎本身是为了扩展同人游戏的多样化。同人作品也可以除去 RPG 或 SRPG 等类型，进行更多方向的额外开发。

经过参赛者和许多朋友的帮助，UCE 引擎已经完成了对 AI 模拟对抗赛事的全向适配。目前的内容将会主要对此模块进行打磨，并计划在 `v0.3.0` 版本实装 AI 训练。基于 PPO 神经网络模拟算法，使用引擎的使用者可以创建独属于自己 AU 的 AI 智能体，或者用于参加 UCG 比赛的 AI 数据单元集。

## 游戏扩展方向

针对游戏扩展，目前我已完成了对部分类型游戏的接口接入和框架预留。

- 卡牌游戏：已经对卡牌杀预留了开发框架，后续可同步制作。
- 格斗游戏：已经并入了部分 Mugen 引擎的功能，不过暂时还没有适配。
- MOBA：暂时做了模板，但是计划至上，以后再说。
- PVP / PVE：类型未定，不过考虑到赛事需求和后期人工游玩，也有额外设计。
- 联机模式：当 UCE 引擎升级到 `v0.7.0` 版本之后，将开放 P2P 和局域网联机。玩家可在本地创建房间，并共享网络给加入房间的玩家。服务器线上等功能可能还需要一段时间才能开发。

基于现有的设计，在 UCE 引擎开发阶段，UC 的 S1 赛季：起源已经开启。本赛季暂不面向全语言社区的同人创作者开放，目前只针对中文社区进行试点开发和赛事模拟。

不过本项目仍然是基于我本人对同人创作的虚无幻想所诞生的产物。实则写歌写得麻木了，随便搞个项目开发一下。

本程序基于 Rust 生态制作，使用 GPL 开源协议。感兴趣的小伙伴可以自行下载使用。

好了，祝你生活愉快，也祝我们未来同人创作无上限。

## 授权边界

- UCE 源代码使用 `GPL-3.0-or-later`。
- Logo、立绘、音乐、角色设定、赛事数据、官方 UCG 游戏内容和内购内容不自动按 GPL 授权，详见 [ASSETS_LICENSE.md](ASSETS_LICENSE.md)。
- 参赛者提交的 `.ucechar`、立绘、技能设计和被动设计遵守 [SUBMISSION_TERMS.md](SUBMISSION_TERMS.md)。
- 创作者使用 UCE 制作和导出的游戏内容，原则上归创作者自行决定如何发布和盈利；正式导出 Runtime 会在后续单独拆分授权。
- 详细授权结构见 [docs/licensing.md](docs/licensing.md)。

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
