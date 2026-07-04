# UCE S1 Resource Specification / S1 资源规则

This document defines the v0.1.0 resource format used by Ultra Confrontation Engine during S1 Origin.

本文档定义 Ultra Confrontation Engine 在 S1 起源阶段使用的 v0.1.0 资源格式与全局技能规则。

## 目录结构 / Directory Layout

```text
assets/
  characters/
    character_id.json
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

UCE v0.1.1 的参赛者发行版会从角色设计页面导出 `.ucechar` 文件。`.ucechar` 是参赛者提交给赛事官方的角色信息包，不是最终 AI 模型，也不是官方比赛资源库中的最终 `assets/characters/*.json` 文件。

`.ucechar` 文件包含：

- `package_type: "uce_character_submission"`
- `schema_version: "0.1.1"`
- `engine_version: "0.1.1"`
- `target_season: "S1"`
- `ruleset_version: "0.1.0"`
- `character`、`skills`、`combat_design`、`passive` 和 `training`
- `export.checksum_algorithm: "SHA-256"`
- `export.checksum`：导出时生成的校验码，用于辅助识别文件是否被手动改动

官方收到 `.ucechar` 后，需要进行规则审核、被动/DEBUFF/反击设计审核，再决定是否导入到官方比赛资源库。

UCE v0.1.1 participant builds export `.ucechar` files from Character Forge. A `.ucechar` file is the participant submission package sent to tournament officials. It is not the final AI model and not the final `assets/characters/*.json` resource used by the official tournament library.

After receiving a `.ucechar` file, officials should review rule compliance, custom passive effects, debuffs, and counter designs before importing the character into the official tournament resource library.

## 中文规则

### 人物资源

```json
{
  "id": "example_fighter",
  "name": "S1 Example Fighter",
  "creator": "creator_name",
  "description": "角色介绍、战斗定位或训练说明。",
  "hp": 500,
  "mp": 250,
  "skills": {
    "melee": "example_melee",
    "ranged": "example_ranged",
    "block": "example_block",
    "dodge": "example_dodge",
    "passive": null
  },
  "passive": null
}
```

- `id`：唯一且适合文件名的资源 ID。
- `hp`：S1 固定为 500，不允许玩家手动修改。
- `mp`：S1 固定为 250，不允许玩家手动修改。
- `skills.melee/ranged/block/dodge`：必须引用对应类型的技能。
- `skills.passive`：没有被动时使用 `null`；存在被动时必须等于 `passive.id`。
- `passive`：没有被动时使用 `null`；存在被动时填写单一被动效果对象。

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
  "id": "example_melee",
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
  "id": "example_ranged",
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
  "id": "example_passive",
  "name": "Example Passive",
  "type": "passive",
  "timing": "before_simulation_persistent",
  "single_effect": true,
  "official_review_required": true,
  "effect": {
    "category": "恢复类",
    "name": "低血量续航",
    "description": "当角色生命低于 30% 时，每回合结束恢复少量生命。",
    "trigger_condition": "自身生命低于 30%",
    "value": 5,
    "value_unit": "HP/turn",
    "balance_notes": "只提供单一恢复效果，不同时恢复蓝量，也不附带减伤、加速或其他增益。"
  },
  "description": "用于表达角色的续航风格。"
}
```

S1 被动限制：

- 被动必须设置 `single_effect: true`。
- 被动必须设置 `official_review_required: true`。
- `effect` 必须是一个对象，不能是数组。
- `effect.category`、`effect.name`、`effect.description`、`effect.balance_notes` 必须填写。
- `trigger_condition`、`value`、`value_unit` 可选，但如果填写必须只服务于这个单一效果。
- 同一个被动不能同时拥有多个效果，例如回血和回蓝同时存在、易伤同时附带减速、恢复同时附带减伤等。
- 自定义被动当前先进入资源与审核流程；具体战斗结算需要在后续被动解释/映射系统中接入。

## English Rules

### Character Resource

- `id`: unique file-safe resource ID.
- `hp`: fixed at 500 for S1. Players cannot manually change it.
- `mp`: fixed at 250 for S1. Players cannot manually change it.
- `skills.melee/ranged/block/dodge`: must reference a skill of the matching type.
- `skills.passive`: use `null` when there is no passive; when a passive exists, it must match `passive.id`.
- `passive`: use `null` when there is no passive; otherwise define one single passive effect object.

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
  "id": "example_passive",
  "name": "Example Passive",
  "type": "passive",
  "timing": "before_simulation_persistent",
  "single_effect": true,
  "official_review_required": true,
  "effect": {
    "category": "recovery",
    "name": "low health sustain",
    "description": "When this character is below 30% HP, recover a small amount of HP at the end of each turn.",
    "trigger_condition": "self HP below 30%",
    "value": 5,
    "value_unit": "HP/turn",
    "balance_notes": "This is one recovery effect only. It does not also restore MP, reduce damage, increase speed, or apply another buff."
  },
  "description": "Defines the character's sustain style."
}
```

S1 passive limits:

- Passive must set `single_effect: true`.
- Passive must set `official_review_required: true`.
- `effect` must be one object, not an array.
- `effect.category`, `effect.name`, `effect.description`, and `effect.balance_notes` are required.
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
