import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import { normalizePortraitDataUrl } from "../../utils/portraitImage";
import "./CreatorPage.css";

interface CreatorPageProps {
  goBack: () => void;
}

type SkillKind = "basic" | "melee" | "ranged" | "block" | "dodge" | "passive";
type Language = "zh" | "en";
type MeleeMode = "damage" | "debuff";
type DodgeMode = "normal" | "double_retreat" | "counter";
type PassiveMode = "none" | "custom";

interface BasicDraft {
  maxMpSpend: number;
}

interface MeleeDraft {
  id: string;
  name: string;
  mode: MeleeMode;
  mpCost: number;
  damage: number;
  debuffName: string;
  debuffEffect: string;
}

interface RangedDraft {
  id: string;
  name: string;
  damage: number;
  hitRate: number;
  range: number;
}

interface BlockDraft {
  id: string;
  name: string;
  damageReduction: number;
  perfectCounter: boolean;
  counterDamage: number;
}

interface DodgeDraft {
  id: string;
  name: string;
  mode: DodgeMode;
  counterDamage: number;
}

interface PassiveDraft {
  id: string;
  name: string;
  mode: PassiveMode;
  effectCategory: string;
  effectName: string;
  triggerCondition: string;
  value: string;
  valueUnit: string;
  effectDescription: string;
  description: string;
}

interface PortraitDraft {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

const skillKinds: SkillKind[] = ["basic", "melee", "ranged", "block", "dodge", "passive"];
const basicDamageTable: Record<number, number> = {
  0: 10,
  5: 20,
  10: 26,
  15: 31,
  20: 35,
  25: 38,
  30: 40,
};

const UCE_VERSION = "0.1.2";
const CHARACTER_SCHEMA_VERSION = "0.1.2";
const S1_RULESET_VERSION = "0.1.0";

const copy = {
  zh: {
    title: "角色设计",
    subtitle: "S1 参赛角色文件生成器",
    identity: "角色资料",
    combat: "技能参数",
    preview: "资源预览",
    export: "导出 .ucechar",
    exported: "已导出参赛角色文件。",
    exportFailed: "导出失败，请在 Tauri 桌面端运行并确认文件权限。",
    fixIssues: "需要先修正红色校验项。",
    id: "资源 ID",
    projectName: "项目名称",
    name: "角色名",
    creator: "作者",
    hp: "生命",
    mp: "能量",
    description: "角色介绍 / 训练说明",
    portrait: "角色立绘",
    uploadPortrait: "上传立绘",
    clearPortrait: "清除立绘",
    portraitEmpty: "未上传",
    portraitFormat: "PNG / JPG / WEBP",
    portraitGuide: "建议使用 3:4 竖版立绘，例如 900x1200 或 1200x1600；上传后会等比例缩放完整显示，不会裁切画面。",
    notes: "AI 训练备注",
    skillName: "技能名",
    mpCost: "耗蓝",
    autoMpCost: "自动耗蓝",
    damage: "伤害",
    maxMpSpend: "最大附带蓝量",
    hitRate: "命中率 %",
    range: "射程",
    reduction: "减伤 %",
    retreat: "后撤距离",
    counterDamage: "反击伤害",
    debuffName: "DEBUFF 名称",
    debuffEffect: "DEBUFF 效果说明",
    validation: "校验",
    ok: "当前资源可以导出。",
    back: "返回",
    basic: "平A",
    melee: "近战",
    ranged: "远程",
    block: "格挡",
    dodge: "闪避",
    passive: "被动",
    damageMode: "增加伤害",
    debuffMode: "挂 DEBUFF",
    perfectCounter: "允许完美格挡反击",
    normalDodge: "普通闪避",
    doubleRetreat: "双倍后撤",
    dodgeCounter: "冲刺反击",
    noPassive: "无被动",
    customPassive: "自定义被动",
    effectCategory: "效果类别",
    effectName: "效果名称",
    triggerCondition: "触发条件",
    passiveValue: "数值（可选）",
    valueUnit: "数值单位",
    passiveEffectDescription: "单一效果说明",
    passiveDescription: "被动介绍",
    packageLabel: "参赛文件",
    characterLabel: "角色 JSON",
    skillsLabel: "技能 JSON",
    basicNote: "平A为角色固有动作。AI 可在战斗中决定是否额外消耗蓝量提高伤害；蓝量不足时回到 10 点基础伤害。",
    meleeNote: "近战需距离 10 格以内，判定范围为正前方 120 度扇形。加伤害与挂 DEBUFF 只能二选一。",
    rangedNote: "远程技能在设计阶段锁死属性，AI 战斗中不能临时选择强化项；蓝耗由程序按曲线自动计算。",
    blockNote: "格挡先结算蓝耗，再判断是否成功。即使对方没有命中或没有攻击，本次蓝耗也会丢失。",
    dodgeNote: "闪避默认消耗 25 蓝并后撤 100 格，可选择双倍后撤或冲刺反击，二者不可同时选择。",
    passiveNote: "被动技能由玩家自定义，在角色进入模拟前生效，并在模拟中持续存在。这里不预设固定类型，但必须只填写一个单一效果元素；如果要写恢复、DEBUFF、强化等方向，只能选择其中一种并写清楚效果，交由官方审核。",
  },
  en: {
    title: "Character Forge",
    subtitle: "S1 Participant Character Generator",
    identity: "Character",
    combat: "Skill Parameters",
    preview: "Resource Preview",
    export: "Export .ucechar",
    exported: "Participant character file exported.",
    exportFailed: "Export failed. Run inside the Tauri desktop app and check file permissions.",
    fixIssues: "Fix red validation items before exporting.",
    id: "Resource ID",
    projectName: "Project Name",
    name: "Name",
    creator: "Creator",
    hp: "HP",
    mp: "MP",
    description: "Profile / Training Notes",
    portrait: "Character Portrait",
    uploadPortrait: "Upload Portrait",
    clearPortrait: "Clear Portrait",
    portraitEmpty: "Not Uploaded",
    portraitFormat: "PNG / JPG / WEBP",
    portraitGuide: "Recommended 3:4 vertical portrait, e.g. 900x1200 or 1200x1600. The full image is scaled proportionally without cropping.",
    notes: "AI Training Notes",
    skillName: "Skill Name",
    mpCost: "MP Cost",
    autoMpCost: "Auto MP Cost",
    damage: "Damage",
    maxMpSpend: "Max MP Spend",
    hitRate: "Hit Rate %",
    range: "Range",
    reduction: "Reduction %",
    retreat: "Retreat Distance",
    counterDamage: "Counter Damage",
    debuffName: "Debuff Name",
    debuffEffect: "Debuff Effect",
    validation: "Validation",
    ok: "Current resource can be exported.",
    back: "Back",
    basic: "Basic",
    melee: "Melee",
    ranged: "Ranged",
    block: "Block",
    dodge: "Dodge",
    passive: "Passive",
    damageMode: "Damage Boost",
    debuffMode: "Debuff",
    perfectCounter: "Enable Perfect Guard Counter",
    normalDodge: "Normal Dodge",
    doubleRetreat: "Double Retreat",
    dodgeCounter: "Dash Counter",
    noPassive: "No Passive",
    customPassive: "Custom Passive",
    effectCategory: "Effect Category",
    effectName: "Effect Name",
    triggerCondition: "Trigger Condition",
    passiveValue: "Value (Optional)",
    valueUnit: "Value Unit",
    passiveEffectDescription: "Single Effect Description",
    passiveDescription: "Passive Intro",
    packageLabel: "Submission Package",
    characterLabel: "Character JSON",
    skillsLabel: "Skill JSON",
    basicNote: "Basic attack is built into the character. The AI may spend extra MP during battle for more damage; when MP is empty it returns to 10 base damage.",
    meleeNote: "Melee requires distance within 10 and a 120-degree forward cone. Damage boost and debuff mode are mutually exclusive.",
    rangedNote: "Ranged attributes are locked at design time. The AI cannot choose temporary ranged boosts in battle; MP cost is calculated by curve.",
    blockNote: "Block MP is paid before hit resolution. MP is lost even when the enemy misses or does not attack.",
    dodgeNote: "Dodge costs 25 MP and retreats 100 by default. Double retreat and dash counter are mutually exclusive.",
    passiveNote: "Passive skills are player-defined, become active before simulation starts, and remain active during simulation. S1 does not predefine fixed passive types, but each passive may contain only one single effect element. Recovery, debuff, buff, or other concepts must be written as one effect for official review.",
  },
};

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function numberInput(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function isFiveStep(value: number) {
  return Number.isInteger(value) && value % 5 === 0;
}

function basicDamage(mpSpend: number) {
  const spend = clamp(roundToStep(mpSpend, 5), 0, 30);
  return basicDamageTable[spend] ?? 10;
}

function rangedMpCost(ranged: RangedDraft) {
  const damageDelta =
    ranged.damage >= 75
      ? ((ranged.damage - 75) / 75) * 25
      : -((75 - ranged.damage) / 50) * 25;
  const hitDelta = ((ranged.hitRate - 0.6) / 0.4) * 25;
  const rangeDelta = ((ranged.range - 100) / 100) * 15;
  const boostedCount = [ranged.damage > 75, ranged.hitRate > 0.6, ranged.range > 100].filter(Boolean).length;
  return clamp(roundToStep(50 + damageDelta + hitDelta + rangeDelta + boostedCount * 5, 5), 25, 100);
}

function blockMpCost(block: BlockDraft) {
  const reductionCost = ((block.damageReduction - 0.5) / 0.25) * 30;
  const counterCost = block.perfectCounter ? 15 + (block.counterDamage / 75) * 35 : 0;
  return clamp(roundToStep(reductionCost + counterCost, 5), 0, 80);
}

function dodgeMpCost(dodge: DodgeDraft) {
  if (dodge.mode === "double_retreat") {
    return 50;
  }
  if (dodge.mode === "counter") {
    return clamp(roundToStep(25 + 15 + (dodge.counterDamage / 75) * 35, 5), 40, 80);
  }
  return 25;
}

function dodgeRetreatDistance(dodge: DodgeDraft) {
  return dodge.mode === "double_retreat" ? 200 : 100;
}

function passiveValueLabel(passive: PassiveDraft, lang: Language) {
  if (passive.mode === "none") {
    return lang === "en" ? "Disabled" : "未启用";
  }

  const category = passive.effectCategory.trim() || (lang === "en" ? "Custom" : "自定义");
  const effectName = passive.effectName.trim() || (lang === "en" ? "Single effect" : "单一效果");
  return `${category} / ${effectName}`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || "portrait";
}

function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  return "image/png";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function CreatorPage({ goBack }: CreatorPageProps) {
  const { i18n } = useTranslation();
  const lang: Language = i18n.language.startsWith("en") ? "en" : "zh";
  const t = copy[lang];

  const [projectName, setProjectName] = useState(lang === "en" ? "Origin Project" : "起源项目");
  const [characterName, setCharacterName] = useState(lang === "en" ? "Origin Fighter" : "起源斗士");
  const [creator, setCreator] = useState("creator_name");
  const [description, setDescription] = useState(
    lang === "en"
      ? "A balanced S1 prototype character prepared for simulation and AI training."
      : "用于 S1 起源赛季模拟与 AI 训练的均衡型角色。",
  );
  const [trainingNotes, setTrainingNotes] = useState(
    lang === "en"
      ? "Preferred behavior, combo ideas, weaknesses, and style notes can be written here."
      : "这里填写期望行为、连招思路、弱点、战斗风格和训练要求。",
  );
  const [portrait, setPortrait] = useState<PortraitDraft>({
    fileName: "",
    mimeType: "",
    dataUrl: "",
  });
  const hp = 500;
  const mp = 250;
  const [activeSkill, setActiveSkill] = useState<SkillKind>("basic");
  const [basic, setBasic] = useState<BasicDraft>({ maxMpSpend: 30 });
  const [melee, setMelee] = useState<MeleeDraft>({
    id: "origin_fighter_melee",
    name: "Origin Slash",
    mode: "damage",
    mpCost: 0,
    damage: 25,
    debuffName: "",
    debuffEffect: "",
  });
  const [ranged, setRanged] = useState<RangedDraft>({
    id: "origin_fighter_ranged",
    name: "Origin Bolt",
    damage: 75,
    hitRate: 0.6,
    range: 100,
  });
  const [block, setBlock] = useState<BlockDraft>({
    id: "origin_fighter_block",
    name: "Origin Guard",
    damageReduction: 0.5,
    perfectCounter: false,
    counterDamage: 25,
  });
  const [dodge, setDodge] = useState<DodgeDraft>({
    id: "origin_fighter_dodge",
    name: "Origin Dodge",
    mode: "normal",
    counterDamage: 25,
  });
  const [passive, setPassive] = useState<PassiveDraft>({
    id: "origin_fighter_passive",
    name: "Origin Passive",
    mode: "none",
    effectCategory: "",
    effectName: "",
    triggerCondition: "",
    value: "",
    valueUnit: "",
    effectDescription: "",
    description: "",
  });
  const [status, setStatus] = useState("");

  const resourceId = normalizeId(`${projectName}_${characterName}`);
  const rangedCost = rangedMpCost(ranged);
  const blockCost = blockMpCost(block);
  const dodgeCost = dodgeMpCost(dodge);
  const dodgeRetreat = dodgeRetreatDistance(dodge);
  const passiveResource = useMemo(() => {
    if (passive.mode === "none") {
      return null;
    }

    return {
      id: normalizeId(passive.id),
      name: passive.name.trim(),
      type: "passive",
      timing: "before_simulation_persistent",
      single_effect: true,
      effect: {
        category: passive.effectCategory.trim(),
        name: passive.effectName.trim(),
        description: passive.effectDescription.trim(),
        trigger_condition: passive.triggerCondition.trim() || null,
        value: passive.value.trim() ? Number(passive.value) : null,
        value_unit: passive.valueUnit.trim() || null,
      },
      official_review_required: true,
      description: passive.description.trim(),
    };
  }, [passive]);

  const characterResource = useMemo(
    () => ({
      id: resourceId,
      project_name: projectName.trim(),
      name: characterName.trim(),
      creator: creator.trim(),
      description: description.trim(),
      portrait: portrait.dataUrl
        ? {
            file_name: portrait.fileName,
            mime_type: portrait.mimeType,
            data_url: portrait.dataUrl,
          }
        : null,
      hp,
      mp,
      skills: {
        melee: normalizeId(melee.id),
        ranged: normalizeId(ranged.id),
        block: normalizeId(block.id),
        dodge: normalizeId(dodge.id),
        passive: passiveResource?.id ?? null,
      },
      passive: passiveResource,
    }),
    [
      block.id,
      characterName,
      creator,
      description,
      dodge.id,
      hp,
      melee.id,
      mp,
      passiveResource,
      portrait.dataUrl,
      portrait.fileName,
      portrait.mimeType,
      projectName,
      ranged.id,
      resourceId,
    ],
  );

  const combatDesign = useMemo(
    () => ({
      basic_attack: {
        type: "basic_attack",
        base_damage: 10,
        max_mp_spend: basic.maxMpSpend,
        mp_step: 5,
        damage_range: [10, 40],
        damage_table: Object.entries(basicDamageTable).map(([mpSpend, damage]) => ({
          mp_spend: Number(mpSpend),
          damage,
        })),
        ai_can_spend_mp_in_battle: true,
      },
      melee: {
        id: normalizeId(melee.id),
        name: melee.name.trim(),
        type: "melee",
        range: 10,
        cone_angle_degrees: 120,
        mode: melee.mode,
        mp_cost: melee.mpCost,
        base_damage: 25,
        damage: melee.mode === "damage" ? melee.damage : 25,
        damage_range: [10, 75],
        mp_range: [0, 50],
        mp_step: 5,
        debuff:
          melee.mode === "debuff"
            ? {
                name: melee.debuffName.trim(),
                effect: melee.debuffEffect.trim(),
                official_review_required: true,
              }
            : null,
        exclusive_upgrade_rule: "damage_boost_or_debuff_only",
      },
      ranged: {
        id: normalizeId(ranged.id),
        name: ranged.name.trim(),
        type: "ranged",
        mp_cost: rangedCost,
        damage: ranged.damage,
        hit_rate: ranged.hitRate,
        range: ranged.range,
        ai_locked_design: true,
        cost_curve: "round5(clamp(50 + damage_delta + hit_delta + range_delta + 5_per_boosted_attribute, 25, 100))",
      },
      block: {
        id: normalizeId(block.id),
        name: block.name.trim(),
        type: "block",
        mp_cost: blockCost,
        damage_reduction: block.damageReduction,
        perfect_counter: block.perfectCounter
          ? {
              enabled: true,
              damage: block.counterDamage,
            }
          : {
              enabled: false,
              damage: 0,
            },
        mp_paid_before_resolution: true,
        ai_can_spend_mp_in_battle: true,
      },
      dodge: {
        id: normalizeId(dodge.id),
        name: dodge.name.trim(),
        type: "dodge",
        mode: dodge.mode,
        mp_cost: dodgeCost,
        retreat_distance: dodgeRetreat,
        avoids_damage_types: ["basic_attack", "melee", "ranged"],
        counter:
          dodge.mode === "counter"
            ? {
                enabled: true,
                damage: dodge.counterDamage,
              }
            : {
                enabled: false,
                damage: 0,
            },
      },
      passive: passiveResource,
    }),
    [basic.maxMpSpend, block, blockCost, dodge, dodgeCost, dodgeRetreat, melee, passiveResource, ranged, rangedCost],
  );

  const skillResources = useMemo(
    () => [
      {
        id: normalizeId(melee.id),
        name: melee.name.trim(),
        type: "melee",
        mp_cost: melee.mpCost,
        damage: melee.mode === "damage" ? melee.damage : 25,
        min_mp_cost: 0,
        max_mp_cost: 50,
        min_damage: 10,
        max_damage: 75,
      },
      {
        id: normalizeId(ranged.id),
        name: ranged.name.trim(),
        type: "ranged",
        mp_cost: rangedCost,
        damage: ranged.damage,
        hit_rate: ranged.hitRate,
        range: ranged.range,
        knockback: 0,
        min_mp_cost: 25,
        max_mp_cost: 100,
        min_damage: 25,
        max_damage: 150,
        min_hit_rate: 0.6,
        max_hit_rate: 1.0,
        min_range: 100,
        max_range: 200,
        min_knockback: 0,
        max_knockback: 100,
      },
      {
        id: normalizeId(block.id),
        name: block.name.trim(),
        type: "block",
        mp_cost: blockCost,
        damage_reduction: block.damageReduction,
        max_damage_reduction: 0.75,
      },
      {
        id: normalizeId(dodge.id),
        name: dodge.name.trim(),
        type: "dodge",
        mp_cost: dodgeCost,
        retreat_distance: dodgeRetreat,
      },
    ],
    [block, blockCost, dodge.id, dodgeCost, dodgeRetreat, melee, ranged, rangedCost],
  );

  const infoPackage = useMemo(
    () => ({
      package_type: "uce_character_submission",
      file_extension: ".ucechar",
      schema_version: CHARACTER_SCHEMA_VERSION,
      engine_version: UCE_VERSION,
      target_season: "S1",
      ruleset_version: S1_RULESET_VERSION,
      generated_by: "Ultra Confrontation Engine",
      submission: {
        status: "player_draft",
        official_review_required: true,
        official_review_status: "pending",
      },
      character: characterResource,
      combat_design: combatDesign,
      passive: passiveResource,
      skills: skillResources,
      training: {
        status: "draft",
        model: null,
        notes: trainingNotes.trim(),
      },
    }),
    [characterResource, combatDesign, passiveResource, skillResources, trainingNotes],
  );

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const passiveId = passive.mode === "none" ? "" : normalizeId(passive.id);
    const skillIds = [normalizeId(melee.id), normalizeId(ranged.id), normalizeId(block.id), normalizeId(dodge.id)];
    const ids = [resourceId, ...skillIds, ...(passiveId ? [passiveId] : [])];
    const uniqueIds = new Set(ids);

    if (projectName.trim().length === 0) {
      issues.push(lang === "en" ? "Project name cannot be empty." : "项目名称不能为空。");
    }
    if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(resourceId)) {
      issues.push(lang === "en" ? "Generated character ID must be 3-64 file-safe characters." : "自动生成的角色 ID 需要是 3-64 位文件安全字符。");
    }
    if (characterResource.name.length === 0) {
      issues.push(lang === "en" ? "Character name cannot be empty." : "角色名不能为空。");
    }
    if (characterResource.creator.length === 0) {
      issues.push(lang === "en" ? "Creator cannot be empty." : "作者不能为空。");
    }
    if (hp !== 500) {
      issues.push(lang === "en" ? "S1 HP is fixed at 500." : "S1 生命固定为 500。");
    }
    if (mp !== 250) {
      issues.push(lang === "en" ? "S1 MP is fixed at 250." : "S1 能量固定为 250。");
    }
    if (uniqueIds.size !== ids.length) {
      issues.push(lang === "en" ? "Character and skill IDs must be unique." : "角色和技能 ID 不能重复。");
    }

    for (const skillId of skillIds) {
      if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(skillId)) {
        issues.push(lang === "en" ? `Skill ID ${skillId || "(empty)"} is invalid.` : `技能 ID ${skillId || "空"} 不合法。`);
      }
    }
    if (passive.mode !== "none") {
      if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(passiveId)) {
        issues.push(lang === "en" ? `Passive ID ${passiveId || "(empty)"} is invalid.` : `被动 ID ${passiveId || "空"} 不合法。`);
      }
      if (passive.name.trim().length === 0) {
        issues.push(lang === "en" ? "Passive name cannot be empty." : "被动名称不能为空。");
      }
      if (passive.effectCategory.trim().length === 0) {
        issues.push(lang === "en" ? "Passive effect category cannot be empty." : "被动效果类别不能为空。");
      }
      if (passive.effectName.trim().length === 0) {
        issues.push(lang === "en" ? "Passive effect name cannot be empty." : "被动效果名称不能为空。");
      }
      if (passive.effectDescription.trim().length === 0) {
        issues.push(lang === "en" ? "Passive single effect description cannot be empty." : "被动单一效果说明不能为空。");
      }
      if (passive.value.trim().length > 0 && !Number.isFinite(Number(passive.value))) {
        issues.push(lang === "en" ? "Passive value must be numeric when provided." : "被动数值如果填写，必须是数字。");
      }
    }

    if (!isFiveStep(basic.maxMpSpend) || basic.maxMpSpend < 0 || basic.maxMpSpend > 30) {
      issues.push(lang === "en" ? "Basic attack MP spend must be 0-30 in steps of 5." : "平A附带蓝量必须是 0-30，且以 5 为单位。");
    }
    if (!isFiveStep(melee.mpCost) || melee.mpCost < 0 || melee.mpCost > 50) {
      issues.push(lang === "en" ? "Melee MP must be 0-50 in steps of 5." : "近战耗蓝必须是 0-50，且以 5 为单位。");
    }
    if (melee.name.trim().length === 0) {
      issues.push(lang === "en" ? "Melee skill name cannot be empty." : "近战技能名不能为空。");
    }
    if (melee.mode === "damage" && (melee.damage < 10 || melee.damage > 75)) {
      issues.push(lang === "en" ? "Melee damage must be between 10 and 75." : "近战伤害必须在 10 到 75 之间。");
    }
    if (melee.mode === "debuff") {
      if (melee.mpCost <= 0) {
        issues.push(lang === "en" ? "Melee debuff mode must spend MP." : "近战挂 DEBUFF 必须消耗蓝量。");
      }
      if (melee.debuffName.trim().length === 0 || melee.debuffEffect.trim().length === 0) {
        issues.push(lang === "en" ? "Melee debuff requires name and effect." : "近战 DEBUFF 需要填写名称和具体效果。");
      }
    }
    if (ranged.name.trim().length === 0) {
      issues.push(lang === "en" ? "Ranged skill name cannot be empty." : "远程技能名不能为空。");
    }
    if (ranged.damage < 25 || ranged.damage > 150) {
      issues.push(lang === "en" ? "Ranged damage must be between 25 and 150." : "远程伤害必须在 25 到 150 之间。");
    }
    if (ranged.hitRate < 0.6 || ranged.hitRate > 1) {
      issues.push(lang === "en" ? "Ranged hit rate must be between 60% and 100%." : "远程命中率必须在 60% 到 100% 之间。");
    }
    if (ranged.range < 100 || ranged.range > 200) {
      issues.push(lang === "en" ? "Ranged range must be between 100 and 200." : "远程射程必须在 100 到 200 之间。");
    }
    if (block.name.trim().length === 0) {
      issues.push(lang === "en" ? "Block skill name cannot be empty." : "格挡技能名不能为空。");
    }
    if (block.damageReduction < 0.5 || block.damageReduction > 0.75) {
      issues.push(lang === "en" ? "Block reduction must be between 50% and 75%." : "格挡减伤必须在 50% 到 75% 之间。");
    }
    if (block.perfectCounter && (block.counterDamage < 10 || block.counterDamage > 75)) {
      issues.push(lang === "en" ? "Perfect guard counter damage must be 10-75." : "完美格挡反击伤害必须在 10 到 75 之间。");
    }
    if (dodge.name.trim().length === 0) {
      issues.push(lang === "en" ? "Dodge skill name cannot be empty." : "闪避技能名不能为空。");
    }
    if (dodge.mode === "counter" && (dodge.counterDamage < 10 || dodge.counterDamage > 75)) {
      issues.push(lang === "en" ? "Dodge counter damage must be 10-75." : "闪避反击伤害必须在 10 到 75 之间。");
    }

    return issues;
  }, [basic, block, characterResource, dodge, hp, lang, melee, mp, passive, projectName, ranged, resourceId]);

  const previewPackage = useMemo(
    () => ({
      ...infoPackage,
      export: {
        format: "ucechar",
        exported_at: "generated_on_export",
        checksum_algorithm: "SHA-256",
        checksum: "generated_on_export",
      },
    }),
    [infoPackage],
  );

  const previewText = useMemo(() => JSON.stringify(previewPackage, null, 2), [previewPackage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  const uploadPortrait = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Character Portrait", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!selectedPath) {
        return;
      }

      const fileName = fileNameFromPath(selectedPath);
      const mimeType = mimeTypeFromFileName(fileName);
      const bytes = await readFile(selectedPath);
      const originalDataUrl = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
      const dataUrl = await normalizePortraitDataUrl(originalDataUrl, mimeType);
      setPortrait({
        fileName,
        mimeType,
        dataUrl,
      });
    } catch (error) {
      console.error(error);
      setStatus(t.exportFailed);
    }
  };

  const exportPackage = async () => {
    if (validationIssues.length > 0) {
      setStatus(t.fixIssues);
      return;
    }

    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: `${resourceId || "uce_character"}.ucechar`,
        filters: [{ name: "UCE Character Submission", extensions: ["ucechar"] }],
      });

      if (!path) {
        return;
      }

      const unsignedPackage = {
        ...infoPackage,
        export: {
          format: "ucechar",
          exported_at: new Date().toISOString(),
          checksum_algorithm: "SHA-256",
          checksum: null,
        },
      };
      const checksum = await sha256Hex(JSON.stringify(unsignedPackage));
      const signedPackage = {
        ...unsignedPackage,
        export: {
          ...unsignedPackage.export,
          checksum,
        },
      };

      await writeTextFile(path, JSON.stringify(signedPackage, null, 2));
      setStatus(`${t.exported} SHA-256: ${checksum.slice(0, 12)}...`);
    } catch (error) {
      console.error(error);
      setStatus(t.exportFailed);
    }
  };

  const renderSkillEditor = () => {
    if (activeSkill === "basic") {
      return (
        <>
          <p className="creator-rule-note">{t.basicNote}</p>
          <div className="creator-grid">
            <label>
              <span>{t.maxMpSpend}</span>
              <input
                type="number"
                min="0"
                max="30"
                step="5"
                value={basic.maxMpSpend}
                onChange={(e) => setBasic({ maxMpSpend: numberInput(Number(e.target.value), 30) })}
              />
            </label>
            <div className="creator-derived">
              <span>{t.damage}</span>
              <strong>{basicDamage(basic.maxMpSpend)}</strong>
            </div>
          </div>
          <div className="creator-mini-table">
            {Object.entries(basicDamageTable).map(([mpSpend, damage]) => (
              <span key={mpSpend}>
                {mpSpend} MP / {damage} DMG
              </span>
            ))}
          </div>
        </>
      );
    }

    if (activeSkill === "melee") {
      return (
        <>
          <p className="creator-rule-note">{t.meleeNote}</p>
          <div className="creator-option-row">
            <button
              className={melee.mode === "damage" ? "creator-option-button creator-option-active" : "creator-option-button"}
              type="button"
              onClick={() => setMelee((current) => ({ ...current, mode: "damage" }))}
            >
              {t.damageMode}
            </button>
            <button
              className={melee.mode === "debuff" ? "creator-option-button creator-option-active" : "creator-option-button"}
              type="button"
              onClick={() => setMelee((current) => ({ ...current, mode: "debuff", damage: 25 }))}
            >
              {t.debuffMode}
            </button>
          </div>
          <div className="creator-grid">
            <label>
              <span>{t.id}</span>
              <input value={melee.id} onChange={(e) => setMelee((current) => ({ ...current, id: e.target.value }))} />
            </label>
            <label>
              <span>{t.skillName}</span>
              <input value={melee.name} onChange={(e) => setMelee((current) => ({ ...current, name: e.target.value }))} />
            </label>
            <label>
              <span>{t.mpCost}</span>
              <input
                type="number"
                min="0"
                max="50"
                step="5"
                value={melee.mpCost}
                onChange={(e) => setMelee((current) => ({ ...current, mpCost: numberInput(Number(e.target.value)) }))}
              />
            </label>
            {melee.mode === "damage" ? (
              <label>
                <span>{t.damage}</span>
                <input
                  type="number"
                  min="10"
                  max="75"
                  value={melee.damage}
                  onChange={(e) => setMelee((current) => ({ ...current, damage: numberInput(Number(e.target.value), 25) }))}
                />
              </label>
            ) : (
              <>
                <label>
                  <span>{t.debuffName}</span>
                  <input
                    value={melee.debuffName}
                    onChange={(e) => setMelee((current) => ({ ...current, debuffName: e.target.value }))}
                  />
                </label>
                <label className="creator-wide-grid-field">
                  <span>{t.debuffEffect}</span>
                  <textarea
                    value={melee.debuffEffect}
                    onChange={(e) => setMelee((current) => ({ ...current, debuffEffect: e.target.value }))}
                    rows={3}
                  />
                </label>
              </>
            )}
          </div>
        </>
      );
    }

    if (activeSkill === "ranged") {
      return (
        <>
          <p className="creator-rule-note">{t.rangedNote}</p>
          <div className="creator-grid">
            <label>
              <span>{t.id}</span>
              <input value={ranged.id} onChange={(e) => setRanged((current) => ({ ...current, id: e.target.value }))} />
            </label>
            <label>
              <span>{t.skillName}</span>
              <input value={ranged.name} onChange={(e) => setRanged((current) => ({ ...current, name: e.target.value }))} />
            </label>
            <label>
              <span>{t.damage}</span>
              <input
                type="number"
                min="25"
                max="150"
                value={ranged.damage}
                onChange={(e) => setRanged((current) => ({ ...current, damage: numberInput(Number(e.target.value), 75) }))}
              />
            </label>
            <label>
              <span>{t.hitRate}</span>
              <input
                type="number"
                min="60"
                max="100"
                step="0.1"
                value={Math.round(ranged.hitRate * 100)}
                onChange={(e) =>
                  setRanged((current) => ({ ...current, hitRate: numberInput(Number(e.target.value), 60) / 100 }))
                }
              />
            </label>
            <label>
              <span>{t.range}</span>
              <input
                type="number"
                min="100"
                max="200"
                value={ranged.range}
                onChange={(e) => setRanged((current) => ({ ...current, range: numberInput(Number(e.target.value), 100) }))}
              />
            </label>
            <div className="creator-derived">
              <span>{t.autoMpCost}</span>
              <strong>{rangedCost}</strong>
            </div>
          </div>
        </>
      );
    }

    if (activeSkill === "block") {
      return (
        <>
          <p className="creator-rule-note">{t.blockNote}</p>
          <div className="creator-grid">
            <label>
              <span>{t.id}</span>
              <input value={block.id} onChange={(e) => setBlock((current) => ({ ...current, id: e.target.value }))} />
            </label>
            <label>
              <span>{t.skillName}</span>
              <input value={block.name} onChange={(e) => setBlock((current) => ({ ...current, name: e.target.value }))} />
            </label>
            <label>
              <span>{t.reduction}</span>
              <input
                type="number"
                min="50"
                max="75"
                step="1"
                value={Math.round(block.damageReduction * 100)}
                onChange={(e) =>
                  setBlock((current) => ({
                    ...current,
                    damageReduction: numberInput(Number(e.target.value), 50) / 100,
                  }))
                }
              />
            </label>
            <div className="creator-derived">
              <span>{t.autoMpCost}</span>
              <strong>{blockCost}</strong>
            </div>
            <label className="creator-checkbox">
              <input
                type="checkbox"
                checked={block.perfectCounter}
                onChange={(e) => setBlock((current) => ({ ...current, perfectCounter: e.target.checked }))}
              />
              <span>{t.perfectCounter}</span>
            </label>
            {block.perfectCounter && (
              <label>
                <span>{t.counterDamage}</span>
                <input
                  type="number"
                  min="10"
                  max="75"
                  value={block.counterDamage}
                  onChange={(e) =>
                    setBlock((current) => ({ ...current, counterDamage: numberInput(Number(e.target.value), 25) }))
                  }
                />
              </label>
            )}
          </div>
        </>
      );
    }

    if (activeSkill === "passive") {
      return (
        <>
          <p className="creator-rule-note">{t.passiveNote}</p>
          <div className="creator-option-row">
            <button
              className={passive.mode === "none" ? "creator-option-button creator-option-active" : "creator-option-button"}
              type="button"
              onClick={() => setPassive((current) => ({ ...current, mode: "none" }))}
            >
              {t.noPassive}
            </button>
            <button
              className={passive.mode === "custom" ? "creator-option-button creator-option-active" : "creator-option-button"}
              type="button"
              onClick={() => setPassive((current) => ({ ...current, mode: "custom" }))}
            >
              {t.customPassive}
            </button>
          </div>
          <div className="creator-grid">
            {passive.mode === "custom" && (
              <>
                <label>
                  <span>{t.id}</span>
                  <input value={passive.id} onChange={(e) => setPassive((current) => ({ ...current, id: e.target.value }))} />
                </label>
                <label>
                  <span>{t.skillName}</span>
                  <input value={passive.name} onChange={(e) => setPassive((current) => ({ ...current, name: e.target.value }))} />
                </label>
                <label>
                  <span>{t.effectCategory}</span>
                  <input
                    value={passive.effectCategory}
                    onChange={(e) => setPassive((current) => ({ ...current, effectCategory: e.target.value }))}
                  />
                </label>
                <label>
                  <span>{t.effectName}</span>
                  <input
                    value={passive.effectName}
                    onChange={(e) => setPassive((current) => ({ ...current, effectName: e.target.value }))}
                  />
                </label>
                <label className="creator-wide-grid-field">
                  <span>{t.triggerCondition}</span>
                  <input
                    value={passive.triggerCondition}
                    onChange={(e) => setPassive((current) => ({ ...current, triggerCondition: e.target.value }))}
                  />
                </label>
                <label>
                  <span>{t.passiveValue}</span>
                  <input
                    value={passive.value}
                    onChange={(e) => setPassive((current) => ({ ...current, value: e.target.value }))}
                  />
                </label>
                <label>
                  <span>{t.valueUnit}</span>
                  <input
                    value={passive.valueUnit}
                    onChange={(e) => setPassive((current) => ({ ...current, valueUnit: e.target.value }))}
                  />
                </label>
                <div className="creator-derived">
                  <span>{t.passive}</span>
                  <strong>{passiveValueLabel(passive, lang)}</strong>
                </div>
                <label className="creator-wide-grid-field">
                  <span>{t.passiveEffectDescription}</span>
                  <textarea
                    value={passive.effectDescription}
                    onChange={(e) => setPassive((current) => ({ ...current, effectDescription: e.target.value }))}
                    rows={3}
                  />
                </label>
                <label className="creator-wide-grid-field">
                  <span>{t.passiveDescription}</span>
                  <textarea
                    value={passive.description}
                    onChange={(e) => setPassive((current) => ({ ...current, description: e.target.value }))}
                    rows={3}
                  />
                </label>
              </>
            )}
            {passive.mode === "none" && (
              <div className="creator-derived creator-wide-grid-field">
                <span>{t.passive}</span>
                <strong>{passiveValueLabel(passive, lang)}</strong>
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        <p className="creator-rule-note">{t.dodgeNote}</p>
        <div className="creator-option-row">
          <button
            className={dodge.mode === "normal" ? "creator-option-button creator-option-active" : "creator-option-button"}
            type="button"
            onClick={() => setDodge((current) => ({ ...current, mode: "normal" }))}
          >
            {t.normalDodge}
          </button>
          <button
            className={
              dodge.mode === "double_retreat" ? "creator-option-button creator-option-active" : "creator-option-button"
            }
            type="button"
            onClick={() => setDodge((current) => ({ ...current, mode: "double_retreat" }))}
          >
            {t.doubleRetreat}
          </button>
          <button
            className={dodge.mode === "counter" ? "creator-option-button creator-option-active" : "creator-option-button"}
            type="button"
            onClick={() => setDodge((current) => ({ ...current, mode: "counter" }))}
          >
            {t.dodgeCounter}
          </button>
        </div>
        <div className="creator-grid">
          <label>
            <span>{t.id}</span>
            <input value={dodge.id} onChange={(e) => setDodge((current) => ({ ...current, id: e.target.value }))} />
          </label>
          <label>
            <span>{t.skillName}</span>
            <input value={dodge.name} onChange={(e) => setDodge((current) => ({ ...current, name: e.target.value }))} />
          </label>
          <div className="creator-derived">
            <span>{t.autoMpCost}</span>
            <strong>{dodgeCost}</strong>
          </div>
          <div className="creator-derived">
            <span>{t.retreat}</span>
            <strong>{dodgeRetreat}</strong>
          </div>
          {dodge.mode === "counter" && (
            <label>
              <span>{t.counterDamage}</span>
              <input
                type="number"
                min="10"
                max="75"
                value={dodge.counterDamage}
                onChange={(e) =>
                  setDodge((current) => ({ ...current, counterDamage: numberInput(Number(e.target.value), 25) }))
                }
              />
            </label>
          )}
        </div>
      </>
    );
  };

  return (
    <UCWindow>
      <main className="creator-shell">
        <header className="creator-header">
          <div>
            <p>{t.subtitle}</p>
            <h1>{t.title}</h1>
          </div>
          <button className="creator-ghost-button" type="button" onClick={goBack}>
            {t.back}
          </button>
        </header>

        <section className="creator-workspace">
          <div className="creator-column creator-form-column">
            <section className="creator-section">
              <div className="creator-section-title">{t.identity}</div>
              <div className="creator-grid">
                <label>
                  <span>{t.projectName}</span>
                  <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </label>
                <label>
                  <span>{t.name}</span>
                  <input value={characterName} onChange={(e) => setCharacterName(e.target.value)} />
                </label>
                <label>
                  <span>{t.creator}</span>
                  <input value={creator} onChange={(e) => setCreator(e.target.value)} />
                </label>
                <label>
                  <span>{t.hp}</span>
                  <input
                    type="number"
                    value={hp}
                    readOnly
                    className="creator-fixed-input"
                  />
                </label>
                <label>
                  <span>{t.mp}</span>
                  <input
                    type="number"
                    value={mp}
                    readOnly
                    className="creator-fixed-input"
                  />
                </label>
              </div>
              <section className="creator-portrait-section">
                <div className="creator-portrait-preview">
                  {portrait.dataUrl ? (
                    <img src={portrait.dataUrl} alt={portrait.fileName || t.portrait} />
                  ) : (
                    <div className="creator-portrait-placeholder">
                      <span>{t.portraitEmpty}</span>
                    </div>
                  )}
                </div>
                <div className="creator-portrait-meta">
                  <span>{t.portrait}</span>
                  <strong>{portrait.fileName || t.portraitFormat}</strong>
                  <p className="creator-portrait-guide">{t.portraitGuide}</p>
                  <div className="creator-portrait-actions">
                    <button type="button" onClick={uploadPortrait}>{t.uploadPortrait}</button>
                    <button
                      type="button"
                      onClick={() => setPortrait({ fileName: "", mimeType: "", dataUrl: "" })}
                      disabled={!portrait.dataUrl}
                    >
                      {t.clearPortrait}
                    </button>
                  </div>
                </div>
              </section>
              <label className="creator-wide-field">
                <span>{t.description}</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </label>
              <label className="creator-wide-field">
                <span>{t.notes}</span>
                <textarea value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)} rows={3} />
              </label>
            </section>

            <section className="creator-section">
              <div className="creator-section-title">{t.combat}</div>
              <div className="creator-tabs" role="tablist" aria-label={t.combat}>
                {skillKinds.map((kind) => (
                  <button
                    key={kind}
                    className={kind === activeSkill ? "creator-tab creator-tab-active" : "creator-tab"}
                    type="button"
                    onClick={() => setActiveSkill(kind)}
                  >
                    {t[kind]}
                  </button>
                ))}
              </div>
              {renderSkillEditor()}
            </section>
          </div>

          <aside className="creator-column creator-preview-column">
            <section className="creator-section creator-validation">
              <div className="creator-section-title">{t.validation}</div>
              {validationIssues.length === 0 ? (
                <p className="creator-valid">{t.ok}</p>
              ) : (
                <ul>
                  {validationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="creator-section creator-preview">
              <div className="creator-preview-head">
                <div>
                  <div className="creator-section-title">{t.preview}</div>
                  <p>
                    {t.packageLabel} / {t.characterLabel} / {t.skillsLabel}
                  </p>
                </div>
                <button className="creator-primary-button" type="button" onClick={exportPackage}>
                  {t.export}
                </button>
              </div>
              <pre>{previewText}</pre>
              {status && <div className="creator-status">{status}</div>}
            </section>
          </aside>
        </section>
      </main>
    </UCWindow>
  );
}
