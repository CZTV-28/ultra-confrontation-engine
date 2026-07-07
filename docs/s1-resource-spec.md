# UCE S1 Resource Specification / S1 资源规则

This document defines the v0.1.0 resource format used by Ultra Confrontation Engine during S1 Origin.

本文档定义 Ultra Confrontation Engine 在 S1 起源阶段使用的 v0.1.0 资源格式与全局技能规则。

## 目录结构 / Directory Layout

```text
assets/
  characters/
    character_id.json
  rosters/
    S1.json
  tournaments/
    S1.json
  skills/
    skill_id.json
  arenas/
    arena_id.json
  rules/
    S1.json
```

The desktop app reads resources from `assets/`. Run `npm run sync:assets` after editing assets so Tauri receives the same files under `src-tauri/assets/`.

桌面端会读取 `assets/` 下的资源。修改资源后运行 `npm run sync:assets`，把同一份资源同步到 `src-tauri/assets/`。

## 参赛者提交包 / Participant Submission Package

UCE v0.1.3 的参赛者发行版会从角色设计页面导出 `.ucechar` 文件。`.ucechar` 是参赛者提交给赛事官方的角色信息包，不是最终 AI 模型，也不是官方比赛资源库中的最终 `assets/characters/*.json` 文件。

`.ucechar` 文件包含：

- `package_type: "uce_character_submission"`
- `schema_version: "0.1.3"`
- `engine_version: "0.1.3"`
- `target_season: "S1"`
- `ruleset_version: "0.1.0"`
- `season_template`：记录当前角色设计模板 ID、名称、规则版本和角色默认值；后续赛季可以拥有独立模板。
- `character`、`skills`、`combat_design`、`passive` 和 `training`
- `export.checksum_algorithm: "SHA-256"`
- `export.checksum`：导出时生成的校验码，用于辅助识别文件是否被手动改动

官方收到 `.ucechar` 后，需要进行规则审核、被动/DEBUFF/反击设计审核，再决定是否导入到官方比赛资源库。

UCE v0.1.3 participant builds export `.ucechar` files from Character Forge. A `.ucechar` file is the participant submission package sent to tournament officials. It is not the final AI model and not the final `assets/characters/*.json` resource used by the official tournament library.

After receiving a `.ucechar` file, officials should review rule compliance, custom passive effects, debuffs, and counter designs before importing the character into the official tournament resource library.

## S1 Roster Resource / S1 名单资源

`assets/rosters/S1.json` records the official S1 participant slots.

`assets/rosters/S1.json` 用于记录 S1 官方参赛席位。

- S1 has 32 roster slots.
- Official import writes approved characters into the roster.
- Events reads this roster to display registration and review progress.
- Battle Simulation sorts official roster characters first.
- Internal review uses the full roster data, including notes, source paths, checksums, and import status.
- Public event views must use the sanitized roster feed, which removes notes, local paths, checksums, and rejected participant details.

- S1 固定 32 个名单席位。
- 官方导入通过审核的角色时，会同步写入名单。
- 赛事页面会读取该名单展示报名和审核进度。
- 模拟对战会优先显示已进入官方名单的角色。
- 内部审核使用完整名单数据，包含官方备注、本地来源路径、校验码和导入状态。
- 对外赛事视图必须使用脱敏后的名单数据，不暴露备注、本地路径、校验码和被驳回的参赛者详情。

## S1 Tournament Resource / S1 赛事资源

`assets/tournaments/S1.json` stores the tournament bracket, match status, and final placements for S1.

`assets/tournaments/S1.json` 用于记录 S1 赛事对阵、对局状态和最终名次。

- The bracket is split into left and right halves.
- The first round receives randomized roster slots only after all 32 valid roster slots are filled and officials generate the bracket draw.
- Later rounds reference source match IDs.
- `placements` stores champion, runner-up, third place, and fourth place slot IDs.
- The current file starts in `preparing` state. Public bracket participants remain hidden until the tournament reaches `seeded`, `running`, or `completed`.
- Official S1 battle results write `winnerSlot`, `loserSlot`, optional `replayId`, and `updatedAt` to the matched bracket entry.
- Later rounds resolve entrants from their `sources`; `MATCH_ID` means the source winner, and `MATCH_ID:loser` means the source loser.
- Sandbox Battle Simulation is not an official tournament match. Only the tournament battle flow should write official match results.

- 晋级表分为左半区和右半区。
- 第一轮直接引用 S1 名单席位。
- 后续轮次引用上一轮对局 ID。
- `placements` 记录冠军、亚军、季军和第四名对应的席位 ID。
- 当前文件处于 `preparing` 筹备状态，后续可由官方比赛结果更新。
- 官方 S1 模拟对局结果会向对应对局写入 `winnerSlot`、`loserSlot`、可选的 `replayId` 和 `updatedAt`。
- 后续轮次会从 `sources` 自动解析晋级者；`MATCH_ID` 表示来源对局胜者，`MATCH_ID:loser` 表示来源对局败者。
- 普通模拟对战不算官方赛事对局。只有赛事对战流程可以写入官方对局结果。

## 中文规则

### 人物资源

```json
{
  "id": null,
  "id_scope": "season_contestant",
  "season_contestant_id": null,
  "season_contestant_id_status": "pending_assignment",
  "permanent_character_id": null,
  "project_name": "Example AU Project",
  "name": "S1 Example Fighter",
  "creator": "creator_name",
  "description": "角色介绍、战斗定位或训练说明。",
  "hp": 500,
  "mp": 250,
  "skills": {
    "melee": "pending_character_melee",
    "ranged": "pending_character_ranged",
    "block": "pending_character_block",
    "dodge": "pending_character_dodge",
    "passive": null
  },
  "passive": null
}
```

- `id`：参赛者提交阶段使用 `null`。官方审核通过并登记赛季名单时，写入当季的赛季参赛选手 ID。
- `id_scope`：当前赛事资源使用 `season_contestant`，表示 `id` 只用于本赛季比赛。
- `season_contestant_id`：赛季参赛选手 ID。每个赛季单独分配，只服务于本季参赛名单、赛事对战和晋级数据。
- `season_contestant_id_status`：参赛者提交阶段为 `pending_assignment`；官方登记后为 `assigned`。
- `permanent_character_id`：永久角色 ID。参赛阶段与普通赛季资源默认为 `null`；只有当角色设计被长期收录到引擎/游戏内容中时，才由官方另行分配。
- `project_name`：同人项目名称。
- `name`：角色名，建议使用“项目简称 + 角色名”的常用称呼，例如 `TS!Sans`。
- `hp`：S1 固定为 500，不允许玩家手动修改。
- `mp`：S1 固定为 250，不允许玩家手动修改。
- `skills.melee/ranged/block/dodge`：由程序自动生成并引用对应类型技能；参赛者不填写资源 ID。
- `skills.passive`：没有被动时使用 `null`；存在被动时由程序自动引用 `passive.id`。
- `passive`：没有被动时使用 `null`；存在被动时填写单一被动效果对象。
- 参赛者提交阶段的技能 ID 使用程序生成的 draft ID；官方导出阶段会按赛季参赛选手 ID 重写为 `赛季参赛选手ID_melee`、`赛季参赛选手ID_ranged`、`赛季参赛选手ID_block`、`赛季参赛选手ID_dodge` 和 `赛季参赛选手ID_passive`。
- 同一角色如果参加后续赛季，需要重新提交并分配新的赛季参赛选手 ID；这不会自动等同于永久角色 ID。

### 全局模拟

- S1 起源赛季进行 30 轮次模拟。
- `max_turns_per_round` 为 `0` 表示取消每轮回合上限。
- 胜负、晋级和赛季比赛列表会在后续 Battle Engine 与赛事模块继续接入。

### 平A

- 平A是人物固有动作，不作为独立技能文件。
- 基础伤害为 10。
- AI 可以在战斗中自行决定是否额外消耗蓝量提升伤害。
- 蓝耗范围为 0 到 30，必须以 5 为单位。
- 蓝量不足以支付本次追加蓝耗时，本次平A回到 10 基础伤害。

| 追加蓝耗 | 伤害 |
| --- | --- |
| 0 | 10 |
| 5 | 20 |
| 10 | 26 |
| 15 | 31 |
| 20 | 35 |
| 25 | 38 |
| 30 | 40 |

### 近战

```json
{
  "id": "pending_character_melee",
  "name": "Example Slash",
  "type": "melee",
  "mp_cost": 0,
  "damage": 25,
  "min_mp_cost": 0,
  "max_mp_cost": 50,
  "min_damage": 10,
  "max_damage": 75
}
```

- 默认不消耗蓝量，默认伤害 25。
- 释放距离为 10 格以内。
- 判定范围为面向正前方 120 度扇形。
- 敌人同回合闪避时可以躲避近战横扫。
- 可以选择增加蓝耗提升伤害，也可以选择增加蓝耗挂 DEBUFF，但二者只能选一个。
- DEBUFF 必须写明名称和具体效果，并交给比赛官方审核。
- 蓝耗范围 0 到 50，必须以 5 为单位。
- 伤害范围 10 到 75。

### 远程

```json
{
  "id": "pending_character_ranged",
  "name": "Example Bolt",
  "type": "ranged",
  "mp_cost": 50,
  "damage": 75,
  "hit_rate": 0.6,
  "range": 100,
  "knockback": 0,
  "min_mp_cost": 25,
  "max_mp_cost": 100,
  "min_damage": 25,
  "max_damage": 150,
  "min_hit_rate": 0.6,
  "max_hit_rate": 1.0,
  "min_range": 100,
  "max_range": 200
}
```

- 默认 50 蓝、75 伤害、60% 命中率、100 射程。
- 伤害范围 25 到 150。
- 命中率范围 60% 到 100%。
- 射程范围 100 到 200。
- 蓝耗范围 25 到 100，必须以 5 为单位。
- 远程技能在设计阶段锁定属性，AI 不能在模拟战斗中临时决定强化哪一项。
- 玩家不手动输入远程技能蓝耗，程序根据属性自动平衡。

远程蓝耗曲线：

```text
mp_cost = round5(clamp(50 + damage_delta + hit_delta + range_delta + 5 * boosted_attribute_count, 25, 100))
```

- `damage_delta`：伤害高于 75 时线性增加，150 伤害对应 +25；伤害低于 75 时线性降低，25 伤害对应 -25。
- `hit_delta`：命中率从 60% 到 100% 线性映射到 +0 到 +25。
- `range_delta`：射程从 100 到 200 线性映射到 +0 到 +15。
- `boosted_attribute_count`：伤害高于 75、命中率高于 60%、射程高于 100 分别算一个强化项。一个强化项额外 +5，两个 +10，三个 +15。

### 格挡

- 默认不消耗蓝量。
- 成功格挡时减免 50% 受到的伤害，最高可提升到 75%。
- 可以设计完美格挡后反击，但反击必须增加蓝耗。
- 反击伤害越高，格挡蓝耗越高。
- AI 可以在战斗内自行决定是否使用加蓝格挡或完美格挡反击。
- 无论敌人是否命中、是否攻击，都先结算本次格挡蓝耗。

格挡蓝耗曲线：

```text
mp_cost = round5(clamp(((reduction - 0.5) / 0.25) * 30 + counter_cost, 0, 80))
counter_cost = 0 if no counter
counter_cost = 15 + counter_damage / 75 * 35 if counter exists
```

### 闪避

- 默认消耗 25 蓝。
- 闪避本回合将要受到的平A、近战、远程伤害。
- 默认向正后方后撤 100 格。
- 可以选择双倍蓝耗后撤 200 格。
- 也可以选择闪避后冲刺反击。
- 双倍后撤与冲刺反击不能同时选择。

闪避蓝耗曲线：

```text
normal_dodge = 25
double_retreat = 50
dash_counter = round5(clamp(25 + 15 + counter_damage / 75 * 35, 40, 80))
```

### 被动

被动技能由玩家自定义，在角色进入模拟前生效，并在模拟中持续存在。S1 不预设固定被动类型，只要求每个角色最多拥有一个被动，且这个被动只能描述一个单一效果元素。

回血、回蓝、靠近易伤等都只是设计示例，不是引擎提前写死的可选项。玩家可以设计恢复、DEBUFF、强化或其他方向，但必须把它写成一个效果，不能在同一个被动里同时塞入多个效果。

自定义被动示例：

```json
{
  "id": "pending_character_passive",
  "name": "Example Passive",
  "type": "passive",
  "timing": "before_simulation_persistent",
  "execution_status": "pending_code_mapping",
  "single_effect": true,
  "official_review_required": true,
  "effect": {
    "category": "恢复类",
    "name": "低血量续航",
    "description": "当角色生命低于 30% 时，每回合结束恢复少量生命。",
    "trigger_condition": "自身生命低于 30%",
    "value": 5,
    "value_unit": "HP/turn"
  },
  "description": "用于表达角色的续航风格。"
}
```

S1 被动限制：

- 被动必须设置 `single_effect: true`。
- 被动必须设置 `official_review_required: true`。
- `execution_status` 默认为 `pending_code_mapping`，表示该被动目前是审核描述，尚未映射到可执行战斗逻辑。
- `effect` 必须是一个对象，不能是数组。
- `effect.category`、`effect.name`、`effect.description` 必须填写。
- 平衡性说明不由参赛者填写，由赛事官方在审核阶段判断。
- `trigger_condition`、`value`、`value_unit` 可选，但如果填写必须只服务于这个单一效果。
- 同一个被动不能同时拥有多个效果，例如回血和回蓝同时存在、易伤同时附带减速、恢复同时附带减伤等。
- 自定义被动当前先进入资源与审核流程；具体战斗结算需要在后续被动解释/映射系统中接入。

## English Rules

### Character Resource

- `id`: use `null` during participant submission. When officials register the character to a season roster, this becomes the season contestant ID.
- `id_scope`: season tournament resources use `season_contestant`, meaning `id` is scoped to that season's competition.
- `season_contestant_id`: season contestant ID. It is assigned per season and is used only by the season roster, tournament battle flow, and advancement data.
- `season_contestant_id_status`: `pending_assignment` during participant submission and `assigned` after official registration.
- `permanent_character_id`: permanent character ID. It remains `null` for normal seasonal submissions and is assigned only if the character is permanently accepted into engine/game content.
- `project_name`: fan project name.
- `name`: character name. Prefer the common "project abbreviation + character name" form, such as `TS!Sans`.
- `hp`: fixed at 500 for S1. Players cannot manually change it.
- `mp`: fixed at 250 for S1. Players cannot manually change it.
- `skills.melee/ranged/block/dodge`: generated by the program and linked to the matching skill type. Participants do not enter resource IDs.
- `skills.passive`: use `null` when there is no passive; when a passive exists, the program links it to `passive.id`.
- `passive`: use `null` when there is no passive; otherwise define one single passive effect object.
- Participant submissions use program-generated draft skill IDs. Official export rewrites them to `seasonContestantId_melee`, `seasonContestantId_ranged`, `seasonContestantId_block`, `seasonContestantId_dodge`, and `seasonContestantId_passive`.
- If the same character joins a later season, it must be submitted again and receive a new season contestant ID. This is separate from any future permanent character ID.

### Global Simulation

- S1 Origin uses 30 simulation rounds.
- `max_turns_per_round` set to `0` disables the per-round turn cap.
- Match scoring, advancement, and tournament lists will be connected later through the Battle Engine and tournament module.

### Basic Attack

- Basic attack is intrinsic to every character and is not a separate skill file.
- Base damage is 10.
- The AI may decide during battle whether to spend extra MP for more damage.
- MP spend range is 0 to 30 in steps of 5.
- If the character cannot afford the selected MP spend, the attack falls back to 10 base damage.

| Extra MP | Damage |
| --- | --- |
| 0 | 10 |
| 5 | 20 |
| 10 | 26 |
| 15 | 31 |
| 20 | 35 |
| 25 | 38 |
| 30 | 40 |

### Melee

- Default cost is 0 MP and default damage is 25.
- Melee can be used within 10 tiles.
- The hit area is a 120-degree forward cone.
- A simultaneous dodge can avoid the melee sweep.
- Damage boost and debuff attachment are mutually exclusive.
- Debuffs must include exact effect text and require official tournament review.
- MP cost range is 0 to 50 in steps of 5.
- Damage range is 10 to 75.

### Ranged

- Defaults are 50 MP, 75 damage, 60% hit rate, and 100 range.
- Damage range is 25 to 150.
- Hit rate range is 60% to 100%.
- Range is 100 to 200.
- MP cost range is 25 to 100 in steps of 5.
- Ranged attributes are locked at design time; the AI cannot choose temporary ranged boosts during simulation.
- Players do not manually enter ranged MP cost. The program calculates it from the balancing curve.

Ranged MP curve:

```text
mp_cost = round5(clamp(50 + damage_delta + hit_delta + range_delta + 5 * boosted_attribute_count, 25, 100))
```

- `damage_delta`: damage above 75 scales linearly to +25 at 150; damage below 75 scales linearly to -25 at 25.
- `hit_delta`: hit rate from 60% to 100% maps linearly from +0 to +25.
- `range_delta`: range from 100 to 200 maps linearly from +0 to +15.
- `boosted_attribute_count`: damage above 75, hit rate above 60%, and range above 100 each count as one boosted attribute.

### Block

- Default cost is 0 MP.
- A successful block reduces incoming damage by 50%, up to 75%.
- Perfect guard counters are allowed, but they must add MP cost.
- Higher counter damage increases block MP cost.
- The AI may decide during battle whether to spend MP for stronger block or perfect guard counter.
- Block MP is paid before resolution, even if the enemy misses or does not attack.

Block MP curve:

```text
mp_cost = round5(clamp(((reduction - 0.5) / 0.25) * 30 + counter_cost, 0, 80))
counter_cost = 0 if no counter
counter_cost = 15 + counter_damage / 75 * 35 if counter exists
```

### Dodge

- Default cost is 25 MP.
- Dodge avoids incoming basic, melee, or ranged damage for the current turn.
- Default retreat distance is 100 tiles backward.
- Double retreat costs 50 MP and retreats 200 tiles.
- Dash counter is available as a separate dodge option.
- Double retreat and dash counter are mutually exclusive.

Dodge MP curve:

```text
normal_dodge = 25
double_retreat = 50
dash_counter = round5(clamp(25 + 15 + counter_damage / 75 * 35, 40, 80))
```

### Passive

Passive skills are player-defined, become active before simulation starts, and remain active during simulation. S1 does not predefine fixed passive types. Each character may have at most one passive, and that passive may describe exactly one custom effect element.

HP regen, MP regen, and proximity vulnerability are examples only. Players may design recovery, debuff, buff, or other concepts, but the passive must still be written as one effect rather than a bundle of multiple effects.

Example:

```json
{
  "id": "pending_character_passive",
  "name": "Example Passive",
  "type": "passive",
  "timing": "before_simulation_persistent",
  "execution_status": "pending_code_mapping",
  "single_effect": true,
  "official_review_required": true,
  "effect": {
    "category": "recovery",
    "name": "low health sustain",
    "description": "When this character is below 30% HP, recover a small amount of HP at the end of each turn.",
    "trigger_condition": "self HP below 30%",
    "value": 5,
    "value_unit": "HP/turn"
  },
  "description": "Defines the character's sustain style."
}
```

S1 passive limits:

- Passive must set `single_effect: true`.
- Passive must set `official_review_required: true`.
- `execution_status` defaults to `pending_code_mapping`, meaning the passive is review text until mapped to executable battle logic.
- `effect` must be one object, not an array.
- `effect.category`, `effect.name`, and `effect.description` are required.
- Balance notes are not written by participants; tournament officials judge balance during review.
- `trigger_condition`, `value`, and `value_unit` are optional, but if present they must support the same single effect.
- One passive cannot bundle multiple effects, such as HP regen plus MP regen, vulnerability plus slow, or recovery plus damage reduction.
- Custom passives currently enter the resource and review workflow first. Battle resolution requires a later passive interpretation/mapping system.

## Validation / 校验

The engine validates resources before listing assets or starting a battle.

引擎会在列出资源或开始战斗前执行资源校验。

- Duplicate character, skill, arena, or ruleset IDs are blocked.
- Missing skill references are blocked.
- Skill type mismatch is blocked.
- Character HP/MP outside S1 limits is blocked.
- Skill values outside S1 limits are blocked.
- Invalid arena shape, radius, or spawn points are blocked.
- Warnings do not block loading, but they mark content that needs attention.
