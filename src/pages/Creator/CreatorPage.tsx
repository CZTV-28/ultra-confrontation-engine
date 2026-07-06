import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import {
  getSeasonTemplate,
  seasonTemplates,
  type SeasonId,
  type SeasonTemplate,
} from "../../services/seasonTemplates";
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

const UCE_VERSION = "0.1.2";
const CHARACTER_SCHEMA_VERSION = "0.1.2";

const copy = {
  zh: {
    title: "角色设计",
    subtitle: "赛季制参赛角色文件生成器",
    seasonTemplate: "赛季模板",
    templateRuleset: "规则版本",
    templateLocked: "当前赛季模板",
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
    dodgeNote: "闪避默认消耗当前赛季模板规定的蓝量并按模板后撤，可选择双倍后撤或冲刺反击，二者不可同时选择。",
    passiveNote: "被动技能由玩家自定义，在角色进入模拟前生效，并在模拟中持续存在。当前赛季模板不预设固定类型，但必须只填写一个单一效果元素；如果要写恢复、DEBUFF、强化等方向，只能选择其中一种并写清楚效果，交由官方审核。",
  },
  en: {
    title: "Character Forge",
    subtitle: "Season-based Participant Character Generator",
    seasonTemplate: "Season Template",
    templateRuleset: "Ruleset Version",
    templateLocked: "Current Season Template",
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
    dodgeNote: "Dodge uses the current season template's default MP cost and retreat distance. Double retreat and dash counter are mutually exclusive.",
    passiveNote: "Passive skills are player-defined, become active before simulation starts, and remain active during simulation. The current season template does not predefine fixed passive types, but each passive may contain only one single effect element. Recovery, debuff, buff, or other concepts must be written as one effect for official review.",
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

function isStep(value: number, step: number) {
  return Number.isInteger(value) && value % step === 0;
}

function basicDamage(mpSpend: number, template: SeasonTemplate) {
  const spend = clamp(
    roundToStep(mpSpend, template.basicAttack.mpStep),
    template.basicAttack.minMpSpend,
    template.basicAttack.maxMpSpend,
  );
  return template.basicAttack.damageTable[spend] ?? template.basicAttack.baseDamage;
}

function rangedMpCost(ranged: RangedDraft, template: SeasonTemplate) {
  const rules = template.ranged;
  const damageDelta =
    ranged.damage >= rules.defaultDamage
      ? ((ranged.damage - rules.defaultDamage) / (rules.maxDamage - rules.defaultDamage)) * rules.damageCostAtMax
      : -((rules.defaultDamage - ranged.damage) / (rules.defaultDamage - rules.minDamage)) * rules.damageCostAtMax;
  const hitDelta =
    ((ranged.hitRate - rules.minHitRate) / (rules.maxHitRate - rules.minHitRate)) * rules.hitCostAtMax;
  const rangeDelta =
    ((ranged.range - rules.minRange) / (rules.maxRange - rules.minRange)) * rules.rangeCostAtMax;
  const boostedCount = [
    ranged.damage > rules.defaultDamage,
    ranged.hitRate > rules.defaultHitRate,
    ranged.range > rules.defaultRange,
  ].filter(Boolean).length;
  return clamp(
    roundToStep(
      rules.defaultMpCost + damageDelta + hitDelta + rangeDelta + boostedCount * rules.boostedAttributeCost,
      rules.mpStep,
    ),
    rules.minMpCost,
    rules.maxMpCost,
  );
}

function blockMpCost(block: BlockDraft, template: SeasonTemplate) {
  const rules = template.block;
  const reductionCost =
    ((block.damageReduction - rules.minReduction) / (rules.maxReduction - rules.minReduction)) *
    rules.reductionCostAtMax;
  const counterCost = block.perfectCounter
    ? rules.counterBaseCost + (block.counterDamage / rules.counterDamageMax) * rules.counterCostAtMax
    : 0;
  return clamp(roundToStep(reductionCost + counterCost, rules.mpStep), rules.minMpCost, rules.maxMpCost);
}

function dodgeMpCost(dodge: DodgeDraft, template: SeasonTemplate) {
  if (dodge.mode === "double_retreat") {
    return template.dodge.doubleRetreatMpCost;
  }
  if (dodge.mode === "counter") {
    return clamp(
      roundToStep(
          template.dodge.normalMpCost +
          template.dodge.counterExtraBaseCost +
          (dodge.counterDamage / template.dodge.counterDamageMax) * template.dodge.counterCostAtMax,
        template.dodge.mpStep,
      ),
      template.dodge.counterMinMpCost,
      template.dodge.counterMaxMpCost,
    );
  }
  return template.dodge.normalMpCost;
}

function dodgeRetreatDistance(dodge: DodgeDraft, template: SeasonTemplate) {
  return dodge.mode === "double_retreat" ? template.dodge.doubleRetreatDistance : template.dodge.normalRetreatDistance;
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
  const [selectedSeasonId, setSelectedSeasonId] = useState<SeasonId>("S1");
  const seasonTemplate = useMemo(() => getSeasonTemplate(selectedSeasonId), [selectedSeasonId]);
  const seasonDraft = seasonTemplate.draftDefaults[lang];

  const [projectName, setProjectName] = useState(seasonDraft.projectName);
  const [characterName, setCharacterName] = useState(seasonDraft.characterName);
  const [creator, setCreator] = useState("creator_name");
  const [description, setDescription] = useState(seasonDraft.description);
  const [trainingNotes, setTrainingNotes] = useState(seasonDraft.trainingNotes);
  const [portrait, setPortrait] = useState<PortraitDraft>({
    fileName: "",
    mimeType: "",
    dataUrl: "",
  });
  const hp = seasonTemplate.characterDefaults.hp;
  const mp = seasonTemplate.characterDefaults.mp;
  const [activeSkill, setActiveSkill] = useState<SkillKind>("basic");
  const [basic, setBasic] = useState<BasicDraft>({ maxMpSpend: seasonTemplate.skillDefaults.basic.maxMpSpend });
  const [melee, setMelee] = useState<MeleeDraft>({
    id: seasonTemplate.skillDefaults.melee.id,
    name: seasonTemplate.skillDefaults.melee.name,
    mode: "damage",
    mpCost: seasonTemplate.skillDefaults.melee.mpCost,
    damage: seasonTemplate.skillDefaults.melee.damage,
    debuffName: "",
    debuffEffect: "",
  });
  const [ranged, setRanged] = useState<RangedDraft>({
    id: seasonTemplate.skillDefaults.ranged.id,
    name: seasonTemplate.skillDefaults.ranged.name,
    damage: seasonTemplate.skillDefaults.ranged.damage,
    hitRate: seasonTemplate.skillDefaults.ranged.hitRate,
    range: seasonTemplate.skillDefaults.ranged.range,
  });
  const [block, setBlock] = useState<BlockDraft>({
    id: seasonTemplate.skillDefaults.block.id,
    name: seasonTemplate.skillDefaults.block.name,
    damageReduction: seasonTemplate.block.defaultReduction,
    perfectCounter: false,
    counterDamage: seasonTemplate.skillDefaults.block.counterDamage,
  });
  const [dodge, setDodge] = useState<DodgeDraft>({
    id: seasonTemplate.skillDefaults.dodge.id,
    name: seasonTemplate.skillDefaults.dodge.name,
    mode: "normal",
    counterDamage: seasonTemplate.skillDefaults.dodge.counterDamage,
  });
  const [passive, setPassive] = useState<PassiveDraft>({
    id: seasonTemplate.skillDefaults.passive.id,
    name: seasonTemplate.skillDefaults.passive.name,
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

  const applySeasonTemplate = (seasonId: SeasonId) => {
    const nextTemplate = getSeasonTemplate(seasonId);
    const nextDraft = nextTemplate.draftDefaults[lang];

    setSelectedSeasonId(nextTemplate.id);
    setProjectName(nextDraft.projectName);
    setCharacterName(nextDraft.characterName);
    setDescription(nextDraft.description);
    setTrainingNotes(nextDraft.trainingNotes);
    setBasic({ maxMpSpend: nextTemplate.skillDefaults.basic.maxMpSpend });
    setMelee({
      id: nextTemplate.skillDefaults.melee.id,
      name: nextTemplate.skillDefaults.melee.name,
      mode: "damage",
      mpCost: nextTemplate.skillDefaults.melee.mpCost,
      damage: nextTemplate.skillDefaults.melee.damage,
      debuffName: "",
      debuffEffect: "",
    });
    setRanged({
      id: nextTemplate.skillDefaults.ranged.id,
      name: nextTemplate.skillDefaults.ranged.name,
      damage: nextTemplate.skillDefaults.ranged.damage,
      hitRate: nextTemplate.skillDefaults.ranged.hitRate,
      range: nextTemplate.skillDefaults.ranged.range,
    });
    setBlock({
      id: nextTemplate.skillDefaults.block.id,
      name: nextTemplate.skillDefaults.block.name,
      damageReduction: nextTemplate.block.defaultReduction,
      perfectCounter: false,
      counterDamage: nextTemplate.skillDefaults.block.counterDamage,
    });
    setDodge({
      id: nextTemplate.skillDefaults.dodge.id,
      name: nextTemplate.skillDefaults.dodge.name,
      mode: "normal",
      counterDamage: nextTemplate.skillDefaults.dodge.counterDamage,
    });
    setPassive({
      id: nextTemplate.skillDefaults.passive.id,
      name: nextTemplate.skillDefaults.passive.name,
      mode: "none",
      effectCategory: "",
      effectName: "",
      triggerCondition: "",
      value: "",
      valueUnit: "",
      effectDescription: "",
      description: "",
    });
    setActiveSkill("basic");
    setStatus("");
  };

  const resourceId = normalizeId(`${projectName}_${characterName}`);
  const rangedCost = rangedMpCost(ranged, seasonTemplate);
  const blockCost = blockMpCost(block, seasonTemplate);
  const dodgeCost = dodgeMpCost(dodge, seasonTemplate);
  const dodgeRetreat = dodgeRetreatDistance(dodge, seasonTemplate);
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
        base_damage: seasonTemplate.basicAttack.baseDamage,
        max_mp_spend: basic.maxMpSpend,
        mp_step: seasonTemplate.basicAttack.mpStep,
        damage_range: seasonTemplate.basicAttack.damageRange,
        damage_table: Object.entries(seasonTemplate.basicAttack.damageTable).map(([mpSpend, damage]) => ({
          mp_spend: Number(mpSpend),
          damage,
        })),
        ai_can_spend_mp_in_battle: true,
      },
      melee: {
        id: normalizeId(melee.id),
        name: melee.name.trim(),
        type: "melee",
        range: seasonTemplate.melee.range,
        cone_angle_degrees: seasonTemplate.melee.coneAngleDegrees,
        mode: melee.mode,
        mp_cost: melee.mpCost,
        base_damage: seasonTemplate.melee.baseDamage,
        damage: melee.mode === "damage" ? melee.damage : seasonTemplate.melee.baseDamage,
        damage_range: [seasonTemplate.melee.minDamage, seasonTemplate.melee.maxDamage],
        mp_range: [seasonTemplate.melee.minMpCost, seasonTemplate.melee.maxMpCost],
        mp_step: seasonTemplate.melee.mpStep,
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
        cost_curve: "season_template_ranged_curve",
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
    [
      basic.maxMpSpend,
      block,
      blockCost,
      dodge,
      dodgeCost,
      dodgeRetreat,
      melee,
      passiveResource,
      ranged,
      rangedCost,
      seasonTemplate,
    ],
  );

  const skillResources = useMemo(
    () => [
      {
        id: normalizeId(melee.id),
        name: melee.name.trim(),
        type: "melee",
        mp_cost: melee.mpCost,
        damage: melee.mode === "damage" ? melee.damage : seasonTemplate.melee.baseDamage,
        min_mp_cost: seasonTemplate.melee.minMpCost,
        max_mp_cost: seasonTemplate.melee.maxMpCost,
        min_damage: seasonTemplate.melee.minDamage,
        max_damage: seasonTemplate.melee.maxDamage,
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
        min_mp_cost: seasonTemplate.ranged.minMpCost,
        max_mp_cost: seasonTemplate.ranged.maxMpCost,
        min_damage: seasonTemplate.ranged.minDamage,
        max_damage: seasonTemplate.ranged.maxDamage,
        min_hit_rate: seasonTemplate.ranged.minHitRate,
        max_hit_rate: seasonTemplate.ranged.maxHitRate,
        min_range: seasonTemplate.ranged.minRange,
        max_range: seasonTemplate.ranged.maxRange,
        min_knockback: 0,
        max_knockback: seasonTemplate.ranged.maxKnockback,
      },
      {
        id: normalizeId(block.id),
        name: block.name.trim(),
        type: "block",
        mp_cost: blockCost,
        damage_reduction: block.damageReduction,
        max_damage_reduction: seasonTemplate.block.maxReduction,
      },
      {
        id: normalizeId(dodge.id),
        name: dodge.name.trim(),
        type: "dodge",
        mp_cost: dodgeCost,
        retreat_distance: dodgeRetreat,
      },
    ],
    [block, blockCost, dodge.id, dodgeCost, dodgeRetreat, melee, ranged, rangedCost, seasonTemplate],
  );

  const infoPackage = useMemo(
    () => ({
      package_type: "uce_character_submission",
      file_extension: ".ucechar",
      schema_version: CHARACTER_SCHEMA_VERSION,
      engine_version: UCE_VERSION,
      target_season: seasonTemplate.id,
      ruleset_version: seasonTemplate.rulesetVersion,
      season_template: {
        id: seasonTemplate.id,
        name: seasonTemplate.name,
        ruleset_version: seasonTemplate.rulesetVersion,
        character_defaults: seasonTemplate.characterDefaults,
      },
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
    [characterResource, combatDesign, passiveResource, seasonTemplate, skillResources, trainingNotes],
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
    if (hp !== seasonTemplate.characterDefaults.hp) {
      issues.push(
        lang === "en"
          ? `${seasonTemplate.id} HP is fixed at ${seasonTemplate.characterDefaults.hp}.`
          : `${seasonTemplate.id} 生命固定为 ${seasonTemplate.characterDefaults.hp}。`,
      );
    }
    if (mp !== seasonTemplate.characterDefaults.mp) {
      issues.push(
        lang === "en"
          ? `${seasonTemplate.id} MP is fixed at ${seasonTemplate.characterDefaults.mp}.`
          : `${seasonTemplate.id} 能量固定为 ${seasonTemplate.characterDefaults.mp}。`,
      );
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

    if (
      !isStep(basic.maxMpSpend, seasonTemplate.basicAttack.mpStep) ||
      basic.maxMpSpend < seasonTemplate.basicAttack.minMpSpend ||
      basic.maxMpSpend > seasonTemplate.basicAttack.maxMpSpend
    ) {
      issues.push(
        lang === "en"
          ? `Basic attack MP spend must be ${seasonTemplate.basicAttack.minMpSpend}-${seasonTemplate.basicAttack.maxMpSpend} in steps of ${seasonTemplate.basicAttack.mpStep}.`
          : `平A附带蓝量必须是 ${seasonTemplate.basicAttack.minMpSpend}-${seasonTemplate.basicAttack.maxMpSpend}，且以 ${seasonTemplate.basicAttack.mpStep} 为单位。`,
      );
    }
    if (
      !isStep(melee.mpCost, seasonTemplate.melee.mpStep) ||
      melee.mpCost < seasonTemplate.melee.minMpCost ||
      melee.mpCost > seasonTemplate.melee.maxMpCost
    ) {
      issues.push(
        lang === "en"
          ? `Melee MP must be ${seasonTemplate.melee.minMpCost}-${seasonTemplate.melee.maxMpCost} in steps of ${seasonTemplate.melee.mpStep}.`
          : `近战耗蓝必须是 ${seasonTemplate.melee.minMpCost}-${seasonTemplate.melee.maxMpCost}，且以 ${seasonTemplate.melee.mpStep} 为单位。`,
      );
    }
    if (melee.name.trim().length === 0) {
      issues.push(lang === "en" ? "Melee skill name cannot be empty." : "近战技能名不能为空。");
    }
    if (
      melee.mode === "damage" &&
      (melee.damage < seasonTemplate.melee.minDamage || melee.damage > seasonTemplate.melee.maxDamage)
    ) {
      issues.push(
        lang === "en"
          ? `Melee damage must be between ${seasonTemplate.melee.minDamage} and ${seasonTemplate.melee.maxDamage}.`
          : `近战伤害必须在 ${seasonTemplate.melee.minDamage} 到 ${seasonTemplate.melee.maxDamage} 之间。`,
      );
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
    if (ranged.damage < seasonTemplate.ranged.minDamage || ranged.damage > seasonTemplate.ranged.maxDamage) {
      issues.push(
        lang === "en"
          ? `Ranged damage must be between ${seasonTemplate.ranged.minDamage} and ${seasonTemplate.ranged.maxDamage}.`
          : `远程伤害必须在 ${seasonTemplate.ranged.minDamage} 到 ${seasonTemplate.ranged.maxDamage} 之间。`,
      );
    }
    if (ranged.hitRate < seasonTemplate.ranged.minHitRate || ranged.hitRate > seasonTemplate.ranged.maxHitRate) {
      issues.push(
        lang === "en"
          ? `Ranged hit rate must be between ${Math.round(seasonTemplate.ranged.minHitRate * 100)}% and ${Math.round(seasonTemplate.ranged.maxHitRate * 100)}%.`
          : `远程命中率必须在 ${Math.round(seasonTemplate.ranged.minHitRate * 100)}% 到 ${Math.round(seasonTemplate.ranged.maxHitRate * 100)}% 之间。`,
      );
    }
    if (ranged.range < seasonTemplate.ranged.minRange || ranged.range > seasonTemplate.ranged.maxRange) {
      issues.push(
        lang === "en"
          ? `Ranged range must be between ${seasonTemplate.ranged.minRange} and ${seasonTemplate.ranged.maxRange}.`
          : `远程射程必须在 ${seasonTemplate.ranged.minRange} 到 ${seasonTemplate.ranged.maxRange} 之间。`,
      );
    }
    if (block.name.trim().length === 0) {
      issues.push(lang === "en" ? "Block skill name cannot be empty." : "格挡技能名不能为空。");
    }
    if (block.damageReduction < seasonTemplate.block.minReduction || block.damageReduction > seasonTemplate.block.maxReduction) {
      issues.push(
        lang === "en"
          ? `Block reduction must be between ${Math.round(seasonTemplate.block.minReduction * 100)}% and ${Math.round(seasonTemplate.block.maxReduction * 100)}%.`
          : `格挡减伤必须在 ${Math.round(seasonTemplate.block.minReduction * 100)}% 到 ${Math.round(seasonTemplate.block.maxReduction * 100)}% 之间。`,
      );
    }
    if (
      block.perfectCounter &&
      (block.counterDamage < seasonTemplate.block.counterDamageMin ||
        block.counterDamage > seasonTemplate.block.counterDamageMax)
    ) {
      issues.push(
        lang === "en"
          ? `Perfect guard counter damage must be ${seasonTemplate.block.counterDamageMin}-${seasonTemplate.block.counterDamageMax}.`
          : `完美格挡反击伤害必须在 ${seasonTemplate.block.counterDamageMin} 到 ${seasonTemplate.block.counterDamageMax} 之间。`,
      );
    }
    if (dodge.name.trim().length === 0) {
      issues.push(lang === "en" ? "Dodge skill name cannot be empty." : "闪避技能名不能为空。");
    }
    if (
      dodge.mode === "counter" &&
      (dodge.counterDamage < seasonTemplate.dodge.counterDamageMin ||
        dodge.counterDamage > seasonTemplate.dodge.counterDamageMax)
    ) {
      issues.push(
        lang === "en"
          ? `Dodge counter damage must be ${seasonTemplate.dodge.counterDamageMin}-${seasonTemplate.dodge.counterDamageMax}.`
          : `闪避反击伤害必须在 ${seasonTemplate.dodge.counterDamageMin} 到 ${seasonTemplate.dodge.counterDamageMax} 之间。`,
      );
    }

    return issues;
  }, [
    basic,
    block,
    characterResource,
    dodge,
    hp,
    lang,
    melee,
    mp,
    passive,
    projectName,
    ranged,
    resourceId,
    seasonTemplate,
  ]);

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
                min={seasonTemplate.basicAttack.minMpSpend}
                max={seasonTemplate.basicAttack.maxMpSpend}
                step={seasonTemplate.basicAttack.mpStep}
                value={basic.maxMpSpend}
                onChange={(e) =>
                  setBasic({ maxMpSpend: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.basic.maxMpSpend) })
                }
              />
            </label>
            <div className="creator-derived">
              <span>{t.damage}</span>
              <strong>{basicDamage(basic.maxMpSpend, seasonTemplate)}</strong>
            </div>
          </div>
          <div className="creator-mini-table">
            {Object.entries(seasonTemplate.basicAttack.damageTable).map(([mpSpend, damage]) => (
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
                min={seasonTemplate.melee.minMpCost}
                max={seasonTemplate.melee.maxMpCost}
                step={seasonTemplate.melee.mpStep}
                value={melee.mpCost}
                onChange={(e) => setMelee((current) => ({ ...current, mpCost: numberInput(Number(e.target.value)) }))}
              />
            </label>
            {melee.mode === "damage" ? (
              <label>
                <span>{t.damage}</span>
                <input
                  type="number"
                  min={seasonTemplate.melee.minDamage}
                  max={seasonTemplate.melee.maxDamage}
                  value={melee.damage}
                  onChange={(e) =>
                    setMelee((current) => ({
                      ...current,
                      damage: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.melee.damage),
                    }))
                  }
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
                min={seasonTemplate.ranged.minDamage}
                max={seasonTemplate.ranged.maxDamage}
                value={ranged.damage}
                onChange={(e) =>
                  setRanged((current) => ({
                    ...current,
                    damage: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.ranged.damage),
                  }))
                }
              />
            </label>
            <label>
              <span>{t.hitRate}</span>
              <input
                type="number"
                min={Math.round(seasonTemplate.ranged.minHitRate * 100)}
                max={Math.round(seasonTemplate.ranged.maxHitRate * 100)}
                step="0.1"
                value={Math.round(ranged.hitRate * 100)}
                onChange={(e) =>
                  setRanged((current) => ({
                    ...current,
                    hitRate: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.ranged.hitRate * 100) / 100,
                  }))
                }
              />
            </label>
            <label>
              <span>{t.range}</span>
              <input
                type="number"
                min={seasonTemplate.ranged.minRange}
                max={seasonTemplate.ranged.maxRange}
                value={ranged.range}
                onChange={(e) =>
                  setRanged((current) => ({
                    ...current,
                    range: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.ranged.range),
                  }))
                }
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
                min={Math.round(seasonTemplate.block.minReduction * 100)}
                max={Math.round(seasonTemplate.block.maxReduction * 100)}
                step="1"
                value={Math.round(block.damageReduction * 100)}
                onChange={(e) =>
                  setBlock((current) => ({
                    ...current,
                    damageReduction: numberInput(Number(e.target.value), seasonTemplate.block.defaultReduction * 100) / 100,
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
                  min={seasonTemplate.block.counterDamageMin}
                  max={seasonTemplate.block.counterDamageMax}
                  value={block.counterDamage}
                  onChange={(e) =>
                    setBlock((current) => ({
                      ...current,
                      counterDamage: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.block.counterDamage),
                    }))
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
                min={seasonTemplate.dodge.counterDamageMin}
                max={seasonTemplate.dodge.counterDamageMax}
                value={dodge.counterDamage}
                onChange={(e) =>
                  setDodge((current) => ({
                    ...current,
                    counterDamage: numberInput(Number(e.target.value), seasonTemplate.skillDefaults.dodge.counterDamage),
                  }))
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
              <div className="creator-season-template">
                <div>
                  <span>{t.seasonTemplate}</span>
                  <strong>{seasonTemplate.name[lang]}</strong>
                  <em>{t.templateRuleset}: {seasonTemplate.rulesetVersion}</em>
                </div>
                <div className="creator-season-options" role="group" aria-label={t.seasonTemplate}>
                  {seasonTemplates.map((template) => (
                    <button
                      className={
                        template.id === selectedSeasonId
                          ? "creator-season-option creator-season-option-active"
                          : "creator-season-option"
                      }
                      key={template.id}
                      type="button"
                      onClick={() => applySeasonTemplate(template.id)}
                    >
                      {template.id}
                    </button>
                  ))}
                </div>
              </div>
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
