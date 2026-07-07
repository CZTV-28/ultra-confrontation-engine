import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import { normalizePortraitDataUrl } from "../../utils/portraitImage";
import {
  S1_ROSTER_SIZE,
  findS1RosterSlot,
  getFirstEmptyS1RosterSlot,
  getS1RosterStats,
  loadS1Roster,
  normalizeS1Roster,
  readS1Roster,
  saveS1RosterEntry,
  writeS1Roster,
  type S1ReviewDecision,
  type S1RosterSlot,
} from "../../services/s1Roster";
import "./ReviewPage.css";

interface ReviewPageProps {
  goBack: () => void;
}

type Language = "zh" | "en";
type ReviewSeverity = "pass" | "warning" | "error";

const OFFICIAL_REVISION_REQUEST_KEY = "uce:review:official-revision-character-id";
const CURRENT_UCE_VERSION = "0.1.3";

interface ReviewItem {
  severity: ReviewSeverity;
  title: string;
  detail: string;
}

interface ChecksumStatus {
  stored: string;
  calculated: string;
  matched: boolean;
  available: boolean;
}

interface CharacterResource {
  id?: unknown;
  id_scope?: unknown;
  season_contestant_id?: unknown;
  season_contestant_id_status?: unknown;
  permanent_character_id?: unknown;
  project_name?: unknown;
  name?: unknown;
  creator?: unknown;
  description?: unknown;
  portrait?: unknown;
  hp?: unknown;
  mp?: unknown;
  skills?: unknown;
  passive?: unknown;
}

interface SkillResource {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  mp_cost?: unknown;
  damage?: unknown;
  hit_rate?: unknown;
  range?: unknown;
  damage_reduction?: unknown;
  retreat_distance?: unknown;
}

interface SubmissionPackage {
  package_type?: unknown;
  file_extension?: unknown;
  schema_version?: unknown;
  engine_version?: unknown;
  target_season?: unknown;
  ruleset_version?: unknown;
  generated_by?: unknown;
  submission?: unknown;
  character?: CharacterResource;
  combat_design?: unknown;
  passive?: unknown;
  skills?: unknown;
  training?: unknown;
  export?: {
    format?: unknown;
    exported_at?: unknown;
    checksum_algorithm?: unknown;
    checksum?: unknown;
  };
}

interface OfficialImportPackage {
  package_type?: unknown;
  schema_version?: unknown;
  generated_at?: unknown;
  source?: unknown;
  review?: {
    base_status?: unknown;
    official_decision?: unknown;
    official_notes?: unknown;
    errors?: unknown;
    warnings?: unknown;
  };
  roster?: {
    season?: unknown;
    slot?: unknown;
    status?: unknown;
    updated_at?: unknown;
  } | null;
  asset_targets?: unknown;
  official_assets?: {
    character?: CharacterResource;
    skills?: unknown;
    passive?: unknown;
    combat_design?: unknown;
    training?: unknown;
  };
}

interface OfficialAssetsDraft {
  character: CharacterResource | null;
  skills: SkillResource[];
  passive: unknown;
  combat_design: unknown;
  training: unknown;
}

interface OfficialImportResult {
  character_id: string;
  skill_ids: string[];
  passive_id: string | null;
  written_files: string[];
  roster: S1RosterSlot[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

const copy = {
  zh: {
    eyebrow: "UCE OFFICIAL REVIEW",
    title: "官方审核中心",
    subtitle: "导入参赛者 .ucechar 文件，检查 S1 硬性规则、校验码和需要人工复核的设计项。",
    import: "I 导入 .ucechar",
    export: "E 导出官方导入包",
    back: "返回",
    noFile: "尚未导入参赛者文件。",
    noFileHint: "点击导入，选择参赛者提交的 .ucechar 文件。审核通过后可以登记到 S1 名单并导出官方导入包。",
    source: "来源文件",
    packageInfo: "提交信息",
    character: "角色资料",
    officialId: "赛季参赛选手 ID",
    projectName: "项目名称",
    characterName: "角色名",
    creator: "作者",
    description: "简介",
    hp: "生命",
    mp: "能量",
    skills: "技能资源",
    skillName: "技能名",
    mpCost: "耗蓝",
    damage: "伤害",
    hitRate: "命中率",
    range: "射程",
    reduction: "减伤",
    retreat: "后撤距离",
    passive: "被动技能",
    passiveRuntimeNote: "当前自定义被动为审核描述，需后续映射到代码后才会参与战斗结算。",
    effectCategory: "效果类别",
    effectName: "效果名称",
    triggerCondition: "触发条件",
    passiveValue: "数值",
    valueUnit: "数值单位",
    effectDescription: "效果说明",
    passiveDescription: "被动介绍",
    training: "训练备注",
    officialPreview: "官方资源预览",
    officialAssetsEditor: "官方资源编辑",
    officialAssetsEditorHint: "这里是最终写入资源库的官方稿，可修改所有文字和数值。",
    officialAssetsInvalid: "官方资源编辑稿不是合法 JSON。",
    officialIdRequired: "请先填写赛季参赛选手 ID，再登记到 S1 名单。",
    resetOfficialAssets: "重置官方稿",
    audit: "审核结果",
    canApprove: "基础规则通过",
    needsReview: "需要人工复核",
    blocked: "不可通过",
    checksumOk: "校验码一致",
    checksumMissing: "缺少校验码",
    checksumBad: "校验码不一致",
    exported: "审核包已导出。",
    importFailed: "导入失败，请确认文件格式。",
    exportFailed: "导出失败，请确认文件权限。",
    pass: "通过",
    warning: "复核",
    error: "错误",
    empty: "无",
    assetTargets: "建议写入路径",
    officialDecision: "官方决定",
    decisionPending: "待复核",
    decisionApproved: "通过",
    decisionRejected: "驳回",
    officialNotes: "官方备注",
    notesPlaceholder: "填写审核意见、需要返工的原因，或进入官方资源库前的处理说明。",
    rosterSlot: "S1 名单席位",
    rosterOverview: "S1 名单概览",
    rosterOccupied: "已登记",
    rosterApproved: "已通过",
    rosterPending: "待复核",
    selectedSlot: "当前席位",
    slotEmpty: "当前席位为空。",
    slotOccupied: "当前席位已存在角色。",
    registerRoster: "R 登记到 S1 名单",
    registered: "已登记到 S1 名单。",
    rosterFull: "S1 名单已满，请手动选择要覆盖的席位。",
    exportDisabledHint: "只有官方决定为通过，且不存在硬性错误时，才能导出官方导入包。",
    importOfficial: "O 导入官方包",
    applyOfficial: "W 写入资源库",
    officialImportTitle: "官方导入",
    officialImportHint: "导入已审核通过的官方包，确认后写入 assets 资源库。",
    officialPackage: "官方包",
    officialPackageMissing: "尚未导入官方包。",
    overwriteAssets: "允许覆盖同 ID 资源",
    packageAccepted: "官方包已载入。",
    packageRejected: "官方包格式不正确，或尚未通过官方审核。",
    assetsImported: "官方资源已写入。",
    importAssetsFailed: "写入资源库失败，请查看错误信息。",
    validationWarnings: "资源库警告",
    writtenFiles: "写入文件",
    controls: "I 导入参赛文件 / R 登记名单 / E 导出官方包 / O 导入官方包 / W 写入资源库 / X 返回",
  },
  en: {
    eyebrow: "UCE OFFICIAL REVIEW",
    title: "Official Review Center",
    subtitle: "Import participant .ucechar files and check S1 hard limits, checksums, and manual review items.",
    import: "I Import .ucechar",
    export: "E Export Official Package",
    back: "Back",
    noFile: "No participant file imported.",
    noFileHint: "Import a participant .ucechar submission. After review, register it to the S1 roster and export an official import package.",
    source: "Source File",
    packageInfo: "Submission Info",
    character: "Character",
    officialId: "Season Contestant ID",
    projectName: "Project Name",
    characterName: "Character Name",
    creator: "Creator",
    description: "Description",
    hp: "HP",
    mp: "MP",
    skills: "Skill Resources",
    skillName: "Skill Name",
    mpCost: "MP Cost",
    damage: "Damage",
    hitRate: "Hit Rate",
    range: "Range",
    reduction: "Reduction",
    retreat: "Retreat",
    passive: "Passive",
    passiveRuntimeNote: "Custom passives are review descriptions until they are mapped to executable battle logic.",
    effectCategory: "Effect Category",
    effectName: "Effect Name",
    triggerCondition: "Trigger Condition",
    passiveValue: "Value",
    valueUnit: "Value Unit",
    effectDescription: "Effect Description",
    passiveDescription: "Passive Intro",
    training: "Training Notes",
    officialPreview: "Official Asset Preview",
    officialAssetsEditor: "Official Resource Editor",
    officialAssetsEditorHint: "This is the official draft that will be written to the asset library. Text and numeric values can be edited here.",
    officialAssetsInvalid: "The official resource draft is not valid JSON.",
    officialIdRequired: "Enter the season contestant ID before registering to the S1 roster.",
    resetOfficialAssets: "Reset Official Draft",
    audit: "Review Result",
    canApprove: "Base Rules Passed",
    needsReview: "Manual Review Required",
    blocked: "Blocked",
    checksumOk: "Checksum matched",
    checksumMissing: "Checksum missing",
    checksumBad: "Checksum mismatch",
    exported: "Official import package exported.",
    importFailed: "Import failed. Check the file format.",
    exportFailed: "Export failed. Check file permissions.",
    pass: "Pass",
    warning: "Review",
    error: "Error",
    empty: "None",
    assetTargets: "Suggested Asset Targets",
    officialDecision: "Official Decision",
    decisionPending: "Pending",
    decisionApproved: "Approved",
    decisionRejected: "Rejected",
    officialNotes: "Official Notes",
    notesPlaceholder: "Write review notes, required fixes, or handling notes before official import.",
    rosterSlot: "S1 Roster Slot",
    rosterOverview: "S1 Roster Overview",
    rosterOccupied: "Registered",
    rosterApproved: "Approved",
    rosterPending: "Pending",
    selectedSlot: "Selected Slot",
    slotEmpty: "The selected slot is empty.",
    slotOccupied: "The selected slot already contains a character.",
    registerRoster: "R Register to S1 Roster",
    registered: "Registered to the S1 roster.",
    rosterFull: "The S1 roster is full. Select a slot to overwrite manually.",
    exportDisabledHint: "Official packages can only be exported after approval and when no hard errors remain.",
    importOfficial: "O Import Official Package",
    applyOfficial: "W Write Assets",
    officialImportTitle: "Official Import",
    officialImportHint: "Import an approved official package, then write it into the assets library.",
    officialPackage: "Official Package",
    officialPackageMissing: "No official package imported.",
    overwriteAssets: "Allow overwrite for same IDs",
    packageAccepted: "Official package loaded.",
    packageRejected: "Invalid official package, or it has not been approved.",
    assetsImported: "Official assets written.",
    importAssetsFailed: "Failed to write assets. Check the error details.",
    validationWarnings: "Validation Warnings",
    writtenFiles: "Written Files",
    controls: "I Import Submission / R Register Roster / E Export Official Package / O Import Official Package / W Write Assets / X Back",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resourceIdWithSuffix(prefix: string, suffix: string) {
  const safeSuffix = normalizeId(suffix) || "resource";
  const fallbackPrefix = "official_character";
  const maxPrefixLength = Math.max(1, 64 - safeSuffix.length - 1);
  const safePrefix = (normalizeId(prefix) || fallbackPrefix)
    .slice(0, maxPrefixLength)
    .replace(/[-_]+$/g, "") || fallbackPrefix.slice(0, maxPrefixLength);
  return `${safePrefix}_${safeSuffix}`;
}

function isFiveStep(value: number) {
  return Number.isInteger(value) && value % 5 === 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function rangedMpCost(damage: number, hitRate: number, range: number) {
  const damageDelta = damage >= 75 ? ((damage - 75) / 75) * 25 : -((75 - damage) / 50) * 25;
  const hitDelta = ((hitRate - 0.6) / 0.4) * 25;
  const rangeDelta = ((range - 100) / 100) * 15;
  const boostedCount = [damage > 75, hitRate > 0.6, range > 100].filter(Boolean).length;
  return clamp(roundToStep(50 + damageDelta + hitDelta + rangeDelta + boostedCount * 5, 5), 25, 100);
}

function blockMpCost(reduction: number, perfectCounter: boolean, counterDamage: number) {
  const reductionCost = ((reduction - 0.5) / 0.25) * 30;
  const counterCost = perfectCounter ? 15 + (counterDamage / 75) * 35 : 0;
  return clamp(roundToStep(reductionCost + counterCost, 5), 0, 80);
}

function dodgeMpCost(mode: string, counterDamage: number) {
  if (mode === "double_retreat") {
    return 50;
  }
  if (mode === "counter") {
    return clamp(roundToStep(25 + 15 + (counterDamage / 75) * 35, 5), 40, 80);
  }
  return 25;
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function cloneWithNullChecksum(submission: SubmissionPackage) {
  const clone = JSON.parse(JSON.stringify(submission)) as SubmissionPackage;
  if (isRecord(clone.export)) {
    clone.export.checksum = null;
  }
  return clone;
}

async function verifyChecksum(submission: SubmissionPackage): Promise<ChecksumStatus> {
  const stored = asString(submission.export?.checksum);
  const calculated = await sha256Hex(JSON.stringify(cloneWithNullChecksum(submission)));

  return {
    stored,
    calculated,
    matched: Boolean(stored) && stored === calculated,
    available: Boolean(stored),
  };
}

function getSkills(submission: SubmissionPackage): SkillResource[] {
  if (!Array.isArray(submission.skills)) {
    return [];
  }
  return submission.skills.filter(isRecord) as SkillResource[];
}

function getOfficialSkills(officialPackage: OfficialImportPackage | null): SkillResource[] {
  const skills = officialPackage?.official_assets?.skills;
  if (!Array.isArray(skills)) {
    return [];
  }
  return skills.filter(isRecord) as SkillResource[];
}

function createOfficialAssetsDraft(submission: SubmissionPackage): OfficialAssetsDraft {
  return {
    character: submission.character ?? null,
    skills: getSkills(submission),
    passive: submission.passive ?? null,
    combat_design: submission.combat_design ?? null,
    training: submission.training ?? null,
  };
}

function normalizeOfficialAssetIds(assets: OfficialAssetsDraft): OfficialAssetsDraft {
  const characterId = normalizeId(asString(assets.character?.id));
  if (!characterId || !assets.character) {
    return assets;
  }

  const skillTypes = ["melee", "ranged", "block", "dodge"] as const;
  const skillIds = Object.fromEntries(
    skillTypes.map((type) => [type, resourceIdWithSuffix(characterId, type)]),
  ) as Record<(typeof skillTypes)[number], string>;
  const passive = isRecord(assets.passive)
    ? {
        ...assets.passive,
        id: resourceIdWithSuffix(characterId, "passive"),
        execution_status: assets.passive.execution_status ?? "pending_code_mapping",
      }
    : assets.passive;

  const character = {
    ...assets.character,
    id: characterId,
    id_scope: "season_contestant",
    season_contestant_id: characterId,
    season_contestant_id_status: "assigned",
    permanent_character_id: assets.character.permanent_character_id ?? null,
    skills: {
      ...(isRecord(assets.character.skills) ? assets.character.skills : {}),
      ...skillIds,
      passive: isRecord(passive) ? asString(passive.id) : null,
    },
    passive,
  };

  const skills = assets.skills.map((skill) => {
    const type = asString(skill.type);
    if (!skillTypes.includes(type as (typeof skillTypes)[number])) {
      return { ...skill };
    }
    return {
      ...skill,
      id: skillIds[type as (typeof skillTypes)[number]],
    };
  });

  const combatDesign = isRecord(assets.combat_design) ? { ...assets.combat_design } : assets.combat_design;
  if (isRecord(combatDesign)) {
    for (const type of skillTypes) {
      const design = combatDesign[type];
      if (isRecord(design)) {
        combatDesign[type] = {
          ...design,
          id: skillIds[type],
        };
      }
    }
    combatDesign.passive = passive;
  }

  return {
    ...assets,
    character,
    skills,
    passive,
    combat_design: combatDesign,
  };
}

function parseOfficialAssetsDraft(text: string): { draft: OfficialAssetsDraft | null; error: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) {
      return { draft: null, error: "not_object" };
    }

    return {
      draft: {
        character: isRecord(parsed.character) ? (parsed.character as CharacterResource) : null,
        skills: Array.isArray(parsed.skills) ? (parsed.skills.filter(isRecord) as SkillResource[]) : [],
        passive: Object.prototype.hasOwnProperty.call(parsed, "passive") ? parsed.passive : null,
        combat_design: Object.prototype.hasOwnProperty.call(parsed, "combat_design") ? parsed.combat_design : null,
        training: Object.prototype.hasOwnProperty.call(parsed, "training") ? parsed.training : null,
      },
      error: "",
    };
  } catch {
    return { draft: null, error: "invalid_json" };
  }
}

function isApprovedOfficialPackage(value: unknown): value is OfficialImportPackage {
  if (!isRecord(value)) {
    return false;
  }

  const review = isRecord(value.review) ? value.review : null;
  const officialAssets = isRecord(value.official_assets) ? value.official_assets : null;
  return (
    asString(value.package_type) === "uce_official_import_package" &&
    review !== null &&
    asString(review.official_decision) === "approved" &&
    asNumber(review.errors) === 0 &&
    officialAssets !== null &&
    isRecord(officialAssets.character) &&
    Array.isArray(officialAssets.skills)
  );
}

function allowsLegacyChecksumMismatch(submission: SubmissionPackage) {
  return asString(submission.schema_version) === "0.1.0" || asString(submission.engine_version) === "0.1.0";
}

function isOfficialRevisionSubmission(submission: SubmissionPackage | null) {
  return Boolean(
    submission
      && (asString(submission.generated_by) === "official_revision"
        || asString(submission.export?.format) === "official_revision"),
  );
}

function officialAssetsDraftFromPackage(officialPackage: OfficialImportPackage): OfficialAssetsDraft {
  const officialAssets = officialPackage.official_assets ?? {};
  return {
    character: isRecord(officialAssets.character) ? officialAssets.character : null,
    skills: Array.isArray(officialAssets.skills) ? (officialAssets.skills.filter(isRecord) as SkillResource[]) : [],
    passive: Object.prototype.hasOwnProperty.call(officialAssets, "passive") ? officialAssets.passive : null,
    combat_design: Object.prototype.hasOwnProperty.call(officialAssets, "combat_design")
      ? officialAssets.combat_design
      : null,
    training: Object.prototype.hasOwnProperty.call(officialAssets, "training") ? officialAssets.training : null,
  };
}

function submissionFromOfficialPackage(officialPackage: OfficialImportPackage): SubmissionPackage {
  const draft = officialAssetsDraftFromPackage(officialPackage);
  return {
    package_type: "uce_character_submission",
    file_extension: ".ucechar",
    schema_version: asString(officialPackage.schema_version, CURRENT_UCE_VERSION),
    engine_version: CURRENT_UCE_VERSION,
    target_season: asString(officialPackage.roster?.season, "S1"),
    ruleset_version: "0.1.0",
    generated_by: "official_revision",
    submission: {
      source: "official_assets",
      mode: "revision",
    },
    character: draft.character ?? undefined,
    combat_design: draft.combat_design,
    passive: draft.passive,
    skills: draft.skills,
    training: draft.training,
    export: {
      format: "official_revision",
      exported_at: asString(officialPackage.generated_at, new Date().toISOString()),
      checksum_algorithm: "sha256",
      checksum: null,
    },
  };
}

function getRecordField(source: unknown, key: string) {
  return isRecord(source) ? source[key] : undefined;
}

function findSkill(skills: SkillResource[], type: string) {
  return skills.find((skill) => asString(skill.type) === type);
}

function hasText(value: unknown) {
  return asString(value).trim().length > 0;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function reviewSubmission(
  submission: SubmissionPackage,
  checksum: ChecksumStatus,
  options: { skipChecksum?: boolean } = {},
): ReviewItem[] {
  const items: ReviewItem[] = [];
  const pass = (title: string, detail: string) => items.push({ severity: "pass", title, detail });
  const warning = (title: string, detail: string) => items.push({ severity: "warning", title, detail });
  const error = (title: string, detail: string) => items.push({ severity: "error", title, detail });
  const officialRevision = isOfficialRevisionSubmission(submission);
  const balanceError = (title: string, detail: string) => {
    if (officialRevision) {
      warning(title, `${detail} 官方修正版可由赛事官方人工覆盖。`);
    } else {
      error(title, detail);
    }
  };

  if (asString(submission.package_type) === "uce_character_submission") {
    pass("提交包类型", "package_type 正确。");
  } else {
    error("提交包类型", "package_type 必须是 uce_character_submission。");
  }

  if (asString(submission.target_season) === "S1") {
    pass("目标赛季", "target_season 为 S1。");
  } else {
    error("目标赛季", "当前审核中心只接受 S1 赛季提交。");
  }

  if (asString(submission.ruleset_version) === "0.1.0") {
    pass("规则版本", "ruleset_version 与当前 S1 规则一致。");
  } else {
    warning("规则版本", "ruleset_version 不是 0.1.0，需要确认是否来自旧版或新版规则。");
  }

  if (options.skipChecksum) {
    pass("官方草稿校验", "当前审核结果基于官方编辑草稿，原始投稿 checksum 仅保留在来源记录中。");
  } else if (!checksum.available) {
    warning("SHA-256 校验", "文件没有携带 checksum，无法判断是否被手动改动。");
  } else if (checksum.matched) {
    pass("SHA-256 校验", "导出校验码与当前文件内容一致。");
  } else if (allowsLegacyChecksumMismatch(submission)) {
    warning("SHA-256 历史包校验", "该角色来自 0.1.0 旧版通过流程，checksum 不一致不会阻断官方修正或导入。");
  } else {
    error("SHA-256 校验", "导出校验码与当前文件内容不一致，文件可能被手动改动。");
  }

  const character = submission.character;
  if (!isRecord(character)) {
    error("角色资料", "缺少 character 对象。");
    return items;
  }

  const characterId = asString(character.id);
  if (characterId && characterId === normalizeId(characterId)) {
    pass("赛季参赛选手 ID", "赛季参赛选手 ID 适合作为当季赛事资源文件名。");
  } else {
    error("赛季参赛选手 ID", "赛季参赛选手 ID 不能为空，且只能包含小写字母、数字、下划线或连字符。");
  }

  if (hasText(character.project_name) && hasText(character.name) && hasText(character.creator)) {
    pass("角色署名", "项目名称、角色名称与作者字段已填写。");
  } else {
    error("角色署名", "项目名称、角色名称和作者不能为空。");
  }

  if (asNumber(character.hp) === 500 && asNumber(character.mp) === 250) {
    pass("S1 固定数值", "HP 500 / MP 250，符合 S1 限制。");
  } else {
    balanceError("S1 固定数值", "S1 角色必须固定为 500 HP / 250 MP。");
  }

  const skills = getSkills(submission);
  if (skills.length >= 4) {
    pass("技能数量", "提交包包含技能资源。");
  } else {
    error("技能数量", "提交包至少需要 melee、ranged、block、dodge 四类技能资源。");
  }

  const characterSkills = isRecord(character.skills) ? character.skills : {};
  const requiredSkillRefs = [
    ["melee", asString(characterSkills.melee)],
    ["ranged", asString(characterSkills.ranged)],
    ["block", asString(characterSkills.block)],
    ["dodge", asString(characterSkills.dodge)],
  ] as const;

  for (const [type, id] of requiredSkillRefs) {
    const matched = skills.some((skill) => asString(skill.id) === id && asString(skill.type) === type);
    if (matched) {
      pass(`${type} 引用`, `${id} 已匹配同类型技能。`);
    } else {
      error(`${type} 引用`, `角色 skills.${type} 未匹配到同类型技能资源。`);
    }
  }

  const melee = findSkill(skills, "melee");
  if (melee) {
    const mpCost = asNumber(melee.mp_cost);
    const damage = asNumber(melee.damage);
    if (mpCost !== null && mpCost >= 0 && mpCost <= 50 && isFiveStep(mpCost)) {
      pass("近战蓝耗", "近战蓝耗在 0-50 且为 5 的整数倍。");
    } else {
      balanceError("近战蓝耗", "近战蓝耗必须在 0-50，并以 5 为单位。");
    }
    if (damage !== null && damage >= 10 && damage <= 75) {
      pass("近战伤害", "近战伤害在 10-75 范围内。");
    } else {
      balanceError("近战伤害", "近战伤害必须在 10-75。");
    }
  }

  const combatDesign = isRecord(submission.combat_design) ? submission.combat_design : {};
  const meleeDesign = getRecordField(combatDesign, "melee");
  if (isRecord(meleeDesign) && asString(meleeDesign.mode) === "debuff") {
    const debuff = getRecordField(meleeDesign, "debuff");
    warning("近战 DEBUFF", "该角色选择了近战 DEBUFF，必须由赛事官方人工审核具体效果。");
    if (!isRecord(debuff) || !hasText(debuff.name) || !hasText(debuff.effect)) {
      error("近战 DEBUFF 文本", "DEBUFF 必须填写名称和具体效果。");
    }
  }

  const ranged = findSkill(skills, "ranged");
  if (ranged) {
    const damage = asNumber(ranged.damage);
    const hitRate = asNumber(ranged.hit_rate);
    const range = asNumber(ranged.range);
    const mpCost = asNumber(ranged.mp_cost);
    if (damage !== null && damage >= 25 && damage <= 150) {
      pass("远程伤害", "远程伤害在 25-150 范围内。");
    } else {
      balanceError("远程伤害", "远程伤害必须在 25-150。");
    }
    if (hitRate !== null && hitRate >= 0.6 && hitRate <= 1) {
      pass("远程命中率", "远程命中率在 60%-100% 范围内。");
    } else {
      balanceError("远程命中率", "远程命中率必须在 60%-100%。");
    }
    if (range !== null && range >= 100 && range <= 200) {
      pass("远程射程", "远程射程在 100-200 范围内。");
    } else {
      balanceError("远程射程", "远程射程必须在 100-200。");
    }
    if (damage !== null && hitRate !== null && range !== null && mpCost !== null) {
      const expected = rangedMpCost(damage, hitRate, range);
      if (mpCost === expected) {
        pass("远程自动蓝耗", `远程蓝耗 ${mpCost} 与平衡曲线一致。`);
      } else {
        balanceError("远程自动蓝耗", `远程蓝耗应为 ${expected}，当前为 ${mpCost}。`);
      }
    }
  }

  const block = findSkill(skills, "block");
  const blockDesign = getRecordField(combatDesign, "block");
  if (block) {
    const reduction = asNumber(block.damage_reduction);
    const mpCost = asNumber(block.mp_cost);
    const perfectCounter = isRecord(blockDesign) && isRecord(blockDesign.perfect_counter)
      ? Boolean(blockDesign.perfect_counter.enabled)
      : false;
    const counterDamage = isRecord(blockDesign) && isRecord(blockDesign.perfect_counter)
      ? asNumber(blockDesign.perfect_counter.damage) ?? 0
      : 0;

    if (reduction !== null && reduction >= 0.5 && reduction <= 0.75) {
      pass("格挡减伤", "格挡减伤在 50%-75% 范围内。");
    } else {
      balanceError("格挡减伤", "格挡减伤必须在 50%-75%。");
    }
    if (reduction !== null && mpCost !== null) {
      const expected = blockMpCost(reduction, perfectCounter, counterDamage);
      if (mpCost === expected) {
        pass("格挡蓝耗", `格挡蓝耗 ${mpCost} 与平衡曲线一致。`);
      } else {
        balanceError("格挡蓝耗", `格挡蓝耗应为 ${expected}，当前为 ${mpCost}。`);
      }
    }
    if (perfectCounter) {
      warning("完美格挡反击", "该角色设计了格挡反击，需要人工审核反击伤害与触发描述。");
    }
  }

  const dodge = findSkill(skills, "dodge");
  const dodgeDesign = getRecordField(combatDesign, "dodge");
  if (dodge) {
    const mode = isRecord(dodgeDesign) ? asString(dodgeDesign.mode, "normal") : "normal";
    const mpCost = asNumber(dodge.mp_cost);
    const retreat = asNumber(dodge.retreat_distance);
    const counter = isRecord(dodgeDesign) && isRecord(dodgeDesign.counter) && Boolean(dodgeDesign.counter.enabled);
    const counterDamage = isRecord(dodgeDesign) && isRecord(dodgeDesign.counter)
      ? asNumber(dodgeDesign.counter.damage) ?? 0
      : 0;
    const expected = dodgeMpCost(mode, counterDamage);

    if (mpCost === expected) {
      pass("闪避蓝耗", `闪避蓝耗 ${mpCost} 与当前模式一致。`);
    } else {
      balanceError("闪避蓝耗", `闪避蓝耗应为 ${expected}，当前为 ${mpCost ?? "缺失"}。`);
    }
    if (retreat === 100 || retreat === 200) {
      pass("闪避距离", "闪避后撤距离符合 100/200 规则。");
    } else {
      balanceError("闪避距离", "闪避后撤距离必须为 100 或 200。");
    }
    if (counter) {
      warning("闪避冲刺反击", "该角色设计了闪避反击，需要人工审核反击伤害与触发描述。");
    }
  }

  const passive = isRecord(submission.passive)
    ? submission.passive
    : isRecord(character.passive)
      ? character.passive
      : null;
  if (passive) {
    warning("自定义被动", "该角色包含自定义被动，必须人工审核是否只有单一效果元素。");
    if (passive.single_effect === true) {
      pass("被动单一效果标记", "single_effect 为 true。");
    } else {
      error("被动单一效果标记", "被动必须设置 single_effect: true。");
    }
    if (passive.official_review_required === true) {
      pass("被动审核标记", "official_review_required 为 true。");
    } else {
      error("被动审核标记", "被动必须设置 official_review_required: true。");
    }
    const effect = passive.effect;
    if (isRecord(effect) && hasText(effect.category) && hasText(effect.name) && hasText(effect.description)) {
      pass("被动效果说明", "被动效果核心字段已填写。");
    } else {
      error("被动效果说明", "被动 effect 必须填写 category、name、description。");
    }
  } else {
    pass("自定义被动", "该角色未启用被动。");
  }

  const training = isRecord(submission.training) ? submission.training : {};
  if (hasText(training.notes)) {
    pass("训练备注", "参赛者填写了训练备注。");
  } else {
    warning("训练备注", "训练备注为空，后续训练 AI 时可能缺少行为意图。");
  }

  return items;
}

function buildOfficialBundle(
  submission: SubmissionPackage,
  officialAssets: OfficialAssetsDraft,
  sourcePath: string,
  checksum: ChecksumStatus | null,
  items: ReviewItem[],
  officialDecision: S1ReviewDecision,
  officialNotes: string,
  rosterSlot: S1RosterSlot | null,
) {
  const normalizedOfficialAssets = normalizeOfficialAssetIds(officialAssets);
  const characterId = asString(normalizedOfficialAssets.character?.id, "unknown_character");
  const skills = normalizedOfficialAssets.skills;
  const errors = items.filter((item) => item.severity === "error").length;
  const warnings = items.filter((item) => item.severity === "warning").length;
  const baseStatus = errors > 0 ? "blocked" : warnings > 0 ? "manual_review_required" : "base_rules_passed";

  return {
    package_type: "uce_official_import_package",
    schema_version: "0.1.0",
    generated_at: new Date().toISOString(),
    source: {
      path: sourcePath,
      package_type: submission.package_type ?? null,
      schema_version: submission.schema_version ?? null,
      engine_version: submission.engine_version ?? null,
      ruleset_version: submission.ruleset_version ?? null,
      checksum: checksum
        ? {
            stored: checksum.stored || null,
            calculated: checksum.calculated,
            matched: checksum.matched,
          }
        : null,
    },
    review: {
      base_status: baseStatus,
      official_decision: officialDecision,
      official_notes: officialNotes.trim(),
      errors,
      warnings,
      items,
    },
    roster: rosterSlot
      ? {
          season: "S1",
          slot: rosterSlot.slot,
          status: rosterSlot.status,
          updated_at: rosterSlot.updatedAt || null,
        }
      : null,
    asset_targets: {
      character: `assets/characters/${characterId}.json`,
      skills: skills.map((skill) => `assets/skills/${asString(skill.id, "unknown_skill")}.json`),
      passive: isRecord(normalizedOfficialAssets.passive)
        ? `assets/passives/${asString(normalizedOfficialAssets.passive.id, `${characterId}_passive`)}.json`
        : null,
    },
    official_assets: {
      character: normalizedOfficialAssets.character,
      skills,
      passive: normalizedOfficialAssets.passive,
      combat_design: normalizedOfficialAssets.combat_design,
      training: normalizedOfficialAssets.training,
    },
  };
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function redactPreviewValue(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    if (key === "data_url" || key === "dataUrl" || key === "base64") {
      return `[omitted embedded asset data: ${value.length} chars]`;
    }

    if (value.length > 600) {
      return `${value.slice(0, 240)}... [omitted ${value.length - 240} chars]`;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactPreviewValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactPreviewValue(entryValue, entryKey)]),
    );
  }

  return value;
}

function formatPreviewJson(value: unknown) {
  return formatJson(redactPreviewValue(value));
}

async function normalizeSubmissionPortrait(submission: SubmissionPackage): Promise<SubmissionPackage> {
  const portrait = isRecord(submission.character?.portrait) ? submission.character.portrait : null;
  const dataUrl = asString(portrait?.data_url);
  if (!portrait || !dataUrl) {
    return submission;
  }

  const mimeType = asString(portrait.mime_type, "image/png");
  const normalizedDataUrl = await normalizePortraitDataUrl(dataUrl, mimeType);
  if (normalizedDataUrl === dataUrl) {
    return submission;
  }

  return {
    ...submission,
    character: {
      ...submission.character,
      portrait: {
        ...portrait,
        data_url: normalizedDataUrl,
      },
    },
  };
}

function getSuggestedRosterSlot(roster: S1RosterSlot[], characterId: string) {
  return findS1RosterSlot(roster, characterId)?.slot ?? getFirstEmptyS1RosterSlot(roster)?.slot ?? 1;
}

export default function ReviewPage({ goBack }: ReviewPageProps) {
  const { i18n } = useTranslation();
  const lang: Language = i18n.language.startsWith("en") ? "en" : "zh";
  const t = copy[lang];
  const [submission, setSubmission] = useState<SubmissionPackage | null>(null);
  const [sourcePath, setSourcePath] = useState("");
  const [checksum, setChecksum] = useState<ChecksumStatus | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [status, setStatus] = useState("");
  const [roster, setRoster] = useState<S1RosterSlot[]>(() => readS1Roster());
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [officialDecision, setOfficialDecision] = useState<S1ReviewDecision>("pending");
  const [officialNotes, setOfficialNotes] = useState("");
  const [officialAssetsDraftText, setOfficialAssetsDraftText] = useState("");
  const [officialPackage, setOfficialPackage] = useState<OfficialImportPackage | null>(null);
  const [officialPackagePath, setOfficialPackagePath] = useState("");
  const [overwriteAssets, setOverwriteAssets] = useState(false);
  const [officialImportResult, setOfficialImportResult] = useState<OfficialImportResult | null>(null);
  const [officialImportError, setOfficialImportError] = useState("");

  const officialPackageCharacter = officialPackage?.official_assets?.character;
  const officialPackageSkills = getOfficialSkills(officialPackage);
  const officialAssetsDraftState = useMemo(
    () => (officialAssetsDraftText ? parseOfficialAssetsDraft(officialAssetsDraftText) : { draft: null, error: "" }),
    [officialAssetsDraftText],
  );
  const officialAssetsDraft = officialAssetsDraftState.draft;
  const officialAssetsDraftError = officialAssetsDraftState.error;
  const normalizedOfficialAssetsDraft = useMemo(
    () => (officialAssetsDraft ? normalizeOfficialAssetIds(officialAssetsDraft) : null),
    [officialAssetsDraft],
  );
  const officialAssetsView = normalizedOfficialAssetsDraft ?? (submission ? createOfficialAssetsDraft(submission) : null);
  const character = officialAssetsView?.character ?? null;
  const characterId = asString(character?.id);
  const checksumDisplay = isOfficialRevisionSubmission(submission)
    ? lang === "en" ? "Official revision" : "官方修正版"
    : !checksum?.available
      ? t.checksumMissing
      : checksum.matched
        ? t.checksumOk
        : allowsLegacyChecksumMismatch(submission ?? {})
          ? lang === "en" ? "Legacy accepted" : "历史包放行"
          : t.checksumBad;
  const skills = officialAssetsView?.skills ?? [];
  const passive = isRecord(officialAssetsView?.passive) ? officialAssetsView.passive : null;
  const training = isRecord(officialAssetsView?.training) ? officialAssetsView.training : null;
  const officialReviewSubmission = useMemo<SubmissionPackage | null>(
    () =>
      submission && officialAssetsDraft
        ? {
            ...submission,
            character: normalizedOfficialAssetsDraft?.character ?? undefined,
            skills: normalizedOfficialAssetsDraft?.skills ?? [],
            passive: normalizedOfficialAssetsDraft?.passive,
            combat_design: normalizedOfficialAssetsDraft?.combat_design,
            training: normalizedOfficialAssetsDraft?.training,
          }
        : null,
    [normalizedOfficialAssetsDraft, officialAssetsDraft, submission],
  );
  const effectiveItems = useMemo(
    () =>
      officialReviewSubmission
        ? reviewSubmission(officialReviewSubmission, {
            available: false,
            stored: "",
            calculated: "",
            matched: false,
          }, { skipChecksum: true })
        : items,
    [items, officialReviewSubmission],
  );
  const errors = effectiveItems.filter((item) => item.severity === "error").length;
  const warnings = effectiveItems.filter((item) => item.severity === "warning").length;
  const passes = effectiveItems.filter((item) => item.severity === "pass").length;
  const reviewState = errors > 0 ? "blocked" : warnings > 0 ? "needsReview" : "canApprove";
  const registeredRosterSlot = useMemo(
    () => findS1RosterSlot(roster, characterId) ?? null,
    [characterId, roster],
  );
  const selectedRosterSlot = roster.find((slot) => slot.slot === selectedSlot) ?? null;
  const rosterStats = useMemo(() => getS1RosterStats(roster), [roster]);
  const selectedSlotOccupied = Boolean(selectedRosterSlot?.characterId.trim());
  const canApproveOfficial = errors === 0;
  const canRegisterRoster = Boolean(
    submission
      && normalizedOfficialAssetsDraft
      && !officialAssetsDraftError
      && isRecord(normalizedOfficialAssetsDraft.character)
      && asString(normalizedOfficialAssetsDraft.character.id),
  );

  const officialBundle = useMemo(
    () =>
      submission
      && normalizedOfficialAssetsDraft
        ? buildOfficialBundle(
            submission,
            normalizedOfficialAssetsDraft,
            sourcePath,
            checksum,
            effectiveItems,
            officialDecision,
            officialNotes,
            registeredRosterSlot ?? selectedRosterSlot,
          )
        : null,
    [
      checksum,
      effectiveItems,
      normalizedOfficialAssetsDraft,
      officialDecision,
      officialNotes,
      registeredRosterSlot,
      selectedRosterSlot,
      sourcePath,
      submission,
    ],
  );
  const canExportOfficialPackage = Boolean(
    officialDecision === "approved" && canApproveOfficial && officialBundle && !officialAssetsDraftError,
  );
  const hasEditableOfficialDraft = Boolean(submission && normalizedOfficialAssetsDraft);
  const officialPackageToApply = hasEditableOfficialDraft ? officialBundle : officialPackage;
  const canApplyOfficialPackage = hasEditableOfficialDraft
    ? canExportOfficialPackage
    : Boolean(officialPackage);

  const updateOfficialAssetsDraft = (updater: (draft: OfficialAssetsDraft) => OfficialAssetsDraft) => {
    const baseDraft = officialAssetsDraft ?? (submission ? createOfficialAssetsDraft(submission) : null);
    if (!baseDraft) {
      return;
    }

    setOfficialAssetsDraftText(formatJson(updater(baseDraft)));
  };

  const updateOfficialCharacterField = (key: keyof CharacterResource, value: unknown) => {
    updateOfficialAssetsDraft((draft) => {
      const nextCharacter = {
        ...(isRecord(draft.character) ? draft.character : {}),
        [key]: value,
      };

      if (key === "id") {
        const seasonContestantId = normalizeId(asString(value));
        nextCharacter.id_scope = "season_contestant";
        nextCharacter.season_contestant_id = seasonContestantId || null;
        nextCharacter.season_contestant_id_status = seasonContestantId ? "assigned" : "pending_assignment";
        nextCharacter.permanent_character_id = nextCharacter.permanent_character_id ?? null;
      }

      return {
        ...draft,
        character: nextCharacter as CharacterResource,
      };
    });
  };

  const updateOfficialCharacterNumberField = (key: keyof CharacterResource, value: string) => {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    updateOfficialCharacterField(key, trimmedValue && Number.isFinite(numericValue) ? numericValue : null);
  };

  const updateOfficialPassive = (nextPassive: Record<string, unknown>) => {
    updateOfficialAssetsDraft((draft) => {
      const nextCharacter = isRecord(draft.character)
        ? {
            ...draft.character,
            passive: nextPassive,
          }
        : draft.character;
      const nextCombatDesign = isRecord(draft.combat_design)
        ? {
            ...draft.combat_design,
            passive: nextPassive,
          }
        : draft.combat_design;

      return {
        ...draft,
        character: nextCharacter as CharacterResource | null,
        passive: nextPassive,
        combat_design: nextCombatDesign,
      };
    });
  };

  const updateOfficialPassiveField = (key: string, value: unknown) => {
    if (!isRecord(passive)) {
      return;
    }
    updateOfficialPassive({
      ...passive,
      [key]: value,
    });
  };

  const updateOfficialPassiveEffectField = (key: string, value: unknown) => {
    if (!isRecord(passive)) {
      return;
    }

    const effect = isRecord(passive.effect) ? passive.effect : {};
    updateOfficialPassive({
      ...passive,
      effect: {
        ...effect,
        [key]: value,
      },
    });
  };

  const updateOfficialPassiveNumberEffectField = (key: string, value: string) => {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    updateOfficialPassiveEffectField(key, trimmedValue && Number.isFinite(numericValue) ? numericValue : null);
  };

  const updateOfficialSkillField = (skillIndex: number, key: keyof SkillResource, value: unknown) => {
    updateOfficialAssetsDraft((draft) => {
      const currentSkill = draft.skills[skillIndex];
      if (!currentSkill) {
        return draft;
      }

      const nextSkill = {
        ...currentSkill,
        [key]: value,
      };
      const nextSkills = draft.skills.map((skill, index) => (index === skillIndex ? nextSkill : skill));
      const skillType = asString(currentSkill.type);
      let nextCombatDesign = draft.combat_design;

      if (skillType && isRecord(nextCombatDesign) && isRecord(nextCombatDesign[skillType])) {
        nextCombatDesign = {
          ...nextCombatDesign,
          [skillType]: {
            ...(nextCombatDesign[skillType] as Record<string, unknown>),
            [key]: value,
          },
        };
      }

      return {
        ...draft,
        skills: nextSkills,
        combat_design: nextCombatDesign,
      };
    });
  };

  const updateOfficialSkillNumberField = (skillIndex: number, key: keyof SkillResource, value: string) => {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    updateOfficialSkillField(skillIndex, key, trimmedValue && Number.isFinite(numericValue) ? numericValue : null);
  };

  const loadOfficialRevision = async (revisionCharacterId: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const parsed = await invoke<unknown>("get_s1_official_revision_package", {
        characterId: revisionCharacterId,
      });
      if (!isApprovedOfficialPackage(parsed)) {
        throw new Error("Invalid official revision package");
      }

      const draft = officialAssetsDraftFromPackage(parsed);
      const revisionSubmission = await normalizeSubmissionPortrait(submissionFromOfficialPackage(parsed));
      const noChecksum = {
        available: false,
        stored: "",
        calculated: "",
        matched: false,
      };
      const nextRoster = await loadS1Roster();
      const requestedSlot = asNumber(parsed.roster?.slot);
      const existingSlot = findS1RosterSlot(nextRoster, revisionCharacterId);
      const source = isRecord(parsed.source) ? parsed.source : {};
      const sourceDisplay = asString(source.path, `assets/characters/${revisionCharacterId}.json`);

      setSubmission(revisionSubmission);
      setOfficialAssetsDraftText(formatJson(draft));
      setSourcePath(sourceDisplay);
      setChecksum(noChecksum);
      setItems(reviewSubmission(revisionSubmission, noChecksum, { skipChecksum: true }));
      setRoster(nextRoster);
      setSelectedSlot(requestedSlot ?? existingSlot?.slot ?? getSuggestedRosterSlot(nextRoster, revisionCharacterId));
      setOfficialDecision("approved");
      setOfficialNotes(asString(parsed.review?.official_notes, "official_revision"));
      setOfficialPackage(parsed);
      setOfficialPackagePath(sourceDisplay);
      setOverwriteAssets(true);
      setOfficialImportResult(null);
      setOfficialImportError("");
      setStatus(t.packageAccepted);
    } catch (error) {
      console.error(error);
      setStatus(t.packageRejected);
      setOfficialImportError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    const revisionCharacterId = window.sessionStorage.getItem(OFFICIAL_REVISION_REQUEST_KEY);
    if (!revisionCharacterId) {
      return;
    }

    window.sessionStorage.removeItem(OFFICIAL_REVISION_REQUEST_KEY);
    void loadOfficialRevision(revisionCharacterId);
  }, []);

  const renderSkillTextField = (skillIndex: number, skill: SkillResource, key: keyof SkillResource, label: string) => (
    <label className="review-skill-field">
      <span>{label}</span>
      <input
        value={asString(skill[key])}
        onChange={(event) => updateOfficialSkillField(skillIndex, key, event.target.value)}
      />
    </label>
  );

  const renderSkillNumberField = (
    skillIndex: number,
    skill: SkillResource,
    key: keyof SkillResource,
    label: string,
    step = "1",
  ) => (
    <label className="review-skill-field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={asNumber(skill[key]) ?? ""}
        onChange={(event) => updateOfficialSkillNumberField(skillIndex, key, event.target.value)}
      />
    </label>
  );

  const renderCharacterTextField = (
    key: keyof CharacterResource,
    label: string,
    options: { multiline?: boolean; wide?: boolean } = {},
  ) => (
    <label className={options.wide ? "review-character-field review-character-field-wide" : "review-character-field"}>
      <span>{label}</span>
      {options.multiline ? (
        <textarea
          value={asString(character?.[key])}
          onChange={(event) => updateOfficialCharacterField(key, event.target.value)}
          rows={4}
        />
      ) : (
        <input
          value={asString(character?.[key])}
          onChange={(event) => updateOfficialCharacterField(key, event.target.value)}
        />
      )}
    </label>
  );

  const renderCharacterNumberField = (key: keyof CharacterResource, label: string) => (
    <label className="review-character-field">
      <span>{label}</span>
      <input
        type="number"
        value={asNumber(character?.[key]) ?? ""}
        onChange={(event) => updateOfficialCharacterNumberField(key, event.target.value)}
      />
    </label>
  );

  const renderPassiveTextField = (
    key: string,
    label: string,
    options: { multiline?: boolean; wide?: boolean } = {},
  ) => (
    <label className={options.wide ? "review-passive-field review-passive-field-wide" : "review-passive-field"}>
      <span>{label}</span>
      {options.multiline ? (
        <textarea
          value={asString(passive?.[key])}
          onChange={(event) => updateOfficialPassiveField(key, event.target.value)}
          rows={4}
        />
      ) : (
        <input
          value={asString(passive?.[key])}
          onChange={(event) => updateOfficialPassiveField(key, event.target.value)}
        />
      )}
    </label>
  );

  const renderPassiveEffectTextField = (
    key: string,
    label: string,
    options: { multiline?: boolean; wide?: boolean } = {},
  ) => {
    const effect = isRecord(passive?.effect) ? passive.effect : {};
    return (
      <label className={options.wide ? "review-passive-field review-passive-field-wide" : "review-passive-field"}>
        <span>{label}</span>
        {options.multiline ? (
          <textarea
            value={asString(effect[key])}
            onChange={(event) => updateOfficialPassiveEffectField(key, event.target.value)}
            rows={4}
          />
        ) : (
          <input
            value={asString(effect[key])}
            onChange={(event) => updateOfficialPassiveEffectField(key, event.target.value)}
          />
        )}
      </label>
    );
  };

  const renderPassiveEffectNumberField = (key: string, label: string) => {
    const effect = isRecord(passive?.effect) ? passive.effect : {};
    return (
      <label className="review-passive-field">
        <span>{label}</span>
        <input
          type="number"
          value={asNumber(effect[key]) ?? ""}
          onChange={(event) => updateOfficialPassiveNumberEffectField(key, event.target.value)}
        />
      </label>
    );
  };

  useEffect(() => {
    let cancelled = false;
    const refreshRoster = () => {
      void loadS1Roster().then((nextRoster) => {
        if (!cancelled) {
          setRoster(nextRoster);
        }
      });
    };

    refreshRoster();
    window.addEventListener("uce:s1-roster-updated", refreshRoster);
    return () => {
      cancelled = true;
      window.removeEventListener("uce:s1-roster-updated", refreshRoster);
    };
  }, []);

  useEffect(() => {
    if (errors > 0 && officialDecision === "approved") {
      setOfficialDecision("pending");
    }
  }, [errors, officialDecision]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        importSubmission();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        exportReviewBundle();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        void registerRosterEntry();
      } else if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        importOfficialPackage();
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        applyOfficialPackage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const importSubmission = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({
        multiple: false,
        filters: [{ name: "UCE Character Submission", extensions: ["ucechar", "json"] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!selectedPath) {
        return;
      }

      const text = await readTextFile(selectedPath);
      const parsed = JSON.parse(text) as unknown;
      if (!isRecord(parsed)) {
        throw new Error("Invalid package");
      }

      const nextSubmission = parsed as SubmissionPackage;
      const nextChecksum = await verifyChecksum(nextSubmission);
      const nextItems = reviewSubmission(nextSubmission, nextChecksum);
      const normalizedSubmission = await normalizeSubmissionPortrait(nextSubmission);
      const nextOfficialAssetsDraft = createOfficialAssetsDraft(normalizedSubmission);
      const nextRoster = readS1Roster();
      const nextCharacterId = asString(nextSubmission.character?.id);
      const existingSlot = findS1RosterSlot(nextRoster, nextCharacterId);

      setSubmission(normalizedSubmission);
      setOfficialAssetsDraftText(formatJson(nextOfficialAssetsDraft));
      setSourcePath(selectedPath);
      setChecksum(nextChecksum);
      setItems(nextItems);
      setRoster(nextRoster);
      setSelectedSlot(existingSlot?.slot ?? getSuggestedRosterSlot(nextRoster, nextCharacterId));
      setOfficialDecision(existingSlot?.reviewDecision ?? "pending");
      setOfficialNotes(existingSlot?.officialNotes ?? "");
      setStatus("");
    } catch (error) {
      console.error(error);
      setOfficialAssetsDraftText("");
      setStatus(t.importFailed);
    }
  };

  const registerRosterEntry = async () => {
    if (!submission || !normalizedOfficialAssetsDraft || officialAssetsDraftError) {
      setStatus(t.officialAssetsInvalid);
      return;
    }

    if (!canRegisterRoster) {
      setStatus(t.officialIdRequired);
      return;
    }

    if (officialDecision === "approved" && !canApproveOfficial) {
      setStatus(t.exportDisabledHint);
      return;
    }

    try {
      const nextRoster = await saveS1RosterEntry({
        slot: selectedSlot,
        characterId: asString(normalizedOfficialAssetsDraft.character?.id, "unknown_character"),
        characterName: asString(normalizedOfficialAssetsDraft.character?.name, "Unnamed Character"),
        projectName: asString(normalizedOfficialAssetsDraft.character?.project_name),
        creator: asString(normalizedOfficialAssetsDraft.character?.creator, "Unknown Creator"),
        sourcePath,
        reviewDecision: officialDecision,
        officialNotes,
        checksum: checksum?.calculated ?? checksum?.stored ?? "",
        reviewPackageStatus: reviewState,
      });

      setRoster(nextRoster);
      setStatus(t.registered);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const importOfficialPackage = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({
        multiple: false,
        filters: [{ name: "UCE Official Import Package", extensions: ["json"] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!selectedPath) {
        return;
      }

      const text = await readTextFile(selectedPath);
      const parsed = JSON.parse(text) as unknown;
      if (!isApprovedOfficialPackage(parsed)) {
        throw new Error("Invalid official package");
      }

      setOfficialPackage(parsed);
      setOfficialPackagePath(selectedPath);
      setOfficialImportResult(null);
      setOfficialImportError("");
      setStatus(t.packageAccepted);
    } catch (error) {
      console.error(error);
      setOfficialPackage(null);
      setOfficialPackagePath("");
      setOfficialImportResult(null);
      setOfficialImportError(t.packageRejected);
      setStatus(t.packageRejected);
    }
  };

  const applyOfficialPackage = async () => {
    if (!officialPackageToApply || !canApplyOfficialPackage) {
      setOfficialImportError(hasEditableOfficialDraft ? t.exportDisabledHint : t.officialPackageMissing);
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<OfficialImportResult>("import_official_package", {
        payload: officialPackageToApply,
        overwrite: overwriteAssets || hasEditableOfficialDraft,
      });

      setOfficialImportResult(result);
      setOfficialImportError("");
      const importedRoster = normalizeS1Roster(result.roster);
      writeS1Roster(importedRoster);
      setRoster(importedRoster);
      setStatus(`${t.assetsImported} ${result.character_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(error);
      setOfficialImportResult(null);
      setOfficialImportError(message || t.importAssetsFailed);
      setStatus(t.importAssetsFailed);
    }
  };

  const exportReviewBundle = async () => {
    if (!officialBundle || !canExportOfficialPackage) {
      setStatus(t.exportDisabledHint);
      return;
    }

    try {
      const characterId = asString(officialBundle.official_assets.character?.id, "uce_character");
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const selectedPath = await save({
        defaultPath: `${characterId}_official_import_package.json`,
        filters: [{ name: "UCE Official Import Package", extensions: ["json"] }],
      });
      if (!selectedPath) {
        return;
      }

      await writeTextFile(selectedPath, formatJson(officialBundle));
      setStatus(t.exported);
    } catch (error) {
      console.error(error);
      setStatus(t.exportFailed);
    }
  };

  const renderRosterOverview = () => (
    <div className="review-roster-overview">
      <div>
        <span>{t.rosterOverview}</span>
        <strong>{rosterStats.occupied} / {rosterStats.total}</strong>
      </div>
      <dl>
        <div><dt>{t.rosterApproved}</dt><dd>{rosterStats.approved}</dd></div>
        <div><dt>{t.rosterPending}</dt><dd>{rosterStats.pending}</dd></div>
        <div><dt>{t.rosterOccupied}</dt><dd>{rosterStats.occupied}</dd></div>
      </dl>
      <article className={`review-selected-slot ${selectedSlotOccupied ? "review-selected-slot-occupied" : ""}`}>
        <span>{t.selectedSlot} #{String(selectedSlot).padStart(2, "0")}</span>
        <strong>
          {selectedSlotOccupied
            ? selectedRosterSlot?.characterName || selectedRosterSlot?.characterId
            : t.slotEmpty}
        </strong>
        {selectedSlotOccupied && (
          <em>
            {selectedRosterSlot?.projectName || selectedRosterSlot?.creator || t.slotOccupied}
          </em>
        )}
      </article>
    </div>
  );

  const renderOfficialImportPanel = () => (
    <section className="review-panel review-official-import-panel">
      <div className="review-panel-head">
        <div>
          <h2>{t.officialImportTitle}</h2>
          <p>{t.officialImportHint}</p>
        </div>
        <div className="review-inline-actions">
          <button type="button" onClick={importOfficialPackage}>{t.importOfficial}</button>
          <button type="button" onClick={applyOfficialPackage} disabled={!canApplyOfficialPackage}>{t.applyOfficial}</button>
        </div>
      </div>

      <label className="review-checkbox-field">
        <input
          type="checkbox"
          checked={overwriteAssets}
          onChange={(event) => setOverwriteAssets(event.target.checked)}
        />
        <span>{t.overwriteAssets}</span>
      </label>

      {!officialPackage ? (
        <div className="review-official-empty">{t.officialPackageMissing}</div>
      ) : (
        <div className="review-official-grid">
          <section className="review-official-card">
            <h3>{t.officialPackage}</h3>
            <dl className="review-meta">
              <div><dt>{t.source}</dt><dd title={officialPackagePath}>{officialPackagePath}</dd></div>
              <div><dt>package</dt><dd>{asString(officialPackage.package_type, "-")}</dd></div>
              <div><dt>decision</dt><dd>{asString(officialPackage.review?.official_decision, "-")}</dd></div>
              <div><dt>errors</dt><dd>{String(asNumber(officialPackage.review?.errors) ?? 0)}</dd></div>
              <div><dt>slot</dt><dd>{String(asNumber(officialPackage.roster?.slot) ?? "-")}</dd></div>
            </dl>
          </section>

          <section className="review-official-card">
            <h3>{t.character}</h3>
            <dl className="review-meta">
              <div><dt>ID</dt><dd>{asString(officialPackageCharacter?.id, "-")}</dd></div>
              <div><dt>Project</dt><dd>{asString(officialPackageCharacter?.project_name, "-")}</dd></div>
              <div><dt>Name</dt><dd>{asString(officialPackageCharacter?.name, "-")}</dd></div>
              <div><dt>Creator</dt><dd>{asString(officialPackageCharacter?.creator, "-")}</dd></div>
              <div><dt>HP / MP</dt><dd>{String(asNumber(officialPackageCharacter?.hp) ?? "-")} / {String(asNumber(officialPackageCharacter?.mp) ?? "-")}</dd></div>
            </dl>
          </section>

          <section className="review-official-card review-official-wide">
            <h3>{t.skills}</h3>
            <div className="review-skill-grid">
              {officialPackageSkills.map((skill) => (
                <article className="review-skill" key={asString(skill.id)}>
                  <strong>{asString(skill.name, asString(skill.id, "-"))}</strong>
                  <span>{asString(skill.type, "-")}</span>
                  <em>
                    MP {String(asNumber(skill.mp_cost) ?? "-")} / DMG {String(asNumber(skill.damage) ?? "-")}
                  </em>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {officialImportError && <div className="review-import-error">{officialImportError}</div>}

      {officialImportResult && (
        <div className="review-import-result">
          <strong>{t.assetsImported}</strong>
          {officialImportResult.validation.warnings.length > 0 && (
            <>
              <span>{t.validationWarnings}</span>
              <pre>{formatJson(officialImportResult.validation.warnings)}</pre>
            </>
          )}
          <span>{t.writtenFiles}</span>
          <pre>{formatJson(officialImportResult.written_files)}</pre>
        </div>
      )}
    </section>
  );

  return (
    <UCWindow>
      <main className="review-shell">
        <header className="review-header">
          <div>
            <p>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <span>{t.subtitle}</span>
          </div>
          <div className="review-actions">
            <button type="button" onClick={importSubmission}>{t.import}</button>
            <button type="button" onClick={() => void registerRosterEntry()} disabled={!canRegisterRoster}>{t.registerRoster}</button>
            <button type="button" onClick={exportReviewBundle} disabled={!canExportOfficialPackage}>{t.export}</button>
            <button type="button" onClick={importOfficialPackage}>{t.importOfficial}</button>
            <button type="button" onClick={applyOfficialPackage} disabled={!canApplyOfficialPackage}>{t.applyOfficial}</button>
            <button type="button" onClick={goBack}>{t.back}</button>
          </div>
        </header>

        {!submission ? (
          <section className="review-empty">
            <h2>{t.noFile}</h2>
            <p>{t.noFileHint}</p>
            <button type="button" onClick={importSubmission}>{t.import}</button>
            <div className="review-empty-panels">
              {renderRosterOverview()}
              {renderOfficialImportPanel()}
            </div>
          </section>
        ) : (
          <section className="review-workspace">
            <aside className="review-left">
              <section className={`review-status review-status-${reviewState}`}>
                <span>{reviewState === "blocked" ? t.blocked : reviewState === "needsReview" ? t.needsReview : t.canApprove}</span>
                <strong>{errors} {t.error} / {warnings} {t.warning} / {passes} {t.pass}</strong>
              </section>

              <section className="review-panel review-official-panel">
                <h2>{t.officialDecision}</h2>
                <div className="review-decision-group">
                  {(["pending", "approved", "rejected"] as const).map((decision) => (
                    <button
                      key={decision}
                      className={officialDecision === decision ? "review-decision-active" : ""}
                      type="button"
                      onClick={() => setOfficialDecision(decision)}
                      disabled={decision === "approved" && !canApproveOfficial}
                    >
                      {decision === "pending"
                        ? t.decisionPending
                        : decision === "approved"
                          ? t.decisionApproved
                          : t.decisionRejected}
                    </button>
                  ))}
                </div>

                <label className="review-field">
                  <span>{t.rosterSlot}</span>
                  <select
                    value={selectedSlot}
                    onChange={(event) => setSelectedSlot(Number(event.target.value))}
                  >
                    {Array.from({ length: S1_ROSTER_SIZE }, (_, index) => {
                      const slot = roster[index];
                      const label = slot?.characterName || slot?.characterId || t.empty;
                      return (
                        <option key={index + 1} value={index + 1}>
                          #{String(index + 1).padStart(2, "0")} / {label}
                        </option>
                      );
                    })}
                  </select>
                </label>

                {renderRosterOverview()}

                <label className="review-field">
                  <span>{t.officialNotes}</span>
                  <textarea
                    value={officialNotes}
                    onChange={(event) => setOfficialNotes(event.target.value)}
                    placeholder={t.notesPlaceholder}
                  />
                </label>

                <button className="review-register-button" type="button" onClick={() => void registerRosterEntry()} disabled={!canRegisterRoster}>
                  {t.registerRoster}
                </button>
                {!canExportOfficialPackage && <p className="review-hint">{t.exportDisabledHint}</p>}
              </section>

              <section className="review-panel">
                <h2>{t.packageInfo}</h2>
                <dl className="review-meta">
                  <div><dt>{t.source}</dt><dd title={sourcePath}>{sourcePath}</dd></div>
                  <div><dt>package</dt><dd>{asString(submission.package_type, "-")}</dd></div>
                  <div><dt>schema</dt><dd>{asString(submission.schema_version, "-")}</dd></div>
                  <div><dt>engine</dt><dd>{asString(submission.engine_version, "-")}</dd></div>
                  <div><dt>rules</dt><dd>{asString(submission.ruleset_version, "-")}</dd></div>
                  <div>
                    <dt>checksum</dt>
                    <dd>{checksumDisplay}</dd>
                  </div>
                </dl>
              </section>

              <section className="review-panel review-audit-panel">
                <h2>{t.audit}</h2>
                <div className="review-issue-list">
                  {effectiveItems.map((item, index) => (
                    <article className={`review-issue review-issue-${item.severity}`} key={`${item.title}-${index}`}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </article>
                  ))}
                </div>
              </section>
            </aside>

            <section className="review-right">
              <div className="review-summary-grid">
                <section className="review-panel">
                  <h2>{t.character}</h2>
                  <div className="review-character-editor-grid">
                    {renderCharacterTextField("id", t.officialId, { wide: true })}
                    {renderCharacterTextField("project_name", t.projectName)}
                    {renderCharacterTextField("name", t.characterName)}
                    {renderCharacterTextField("creator", t.creator)}
                    {renderCharacterNumberField("hp", t.hp)}
                    {renderCharacterNumberField("mp", t.mp)}
                    {renderCharacterTextField("description", t.description, { multiline: true, wide: true })}
                  </div>
                </section>

                <section className="review-panel">
                  <h2>{t.training}</h2>
                  <p className="review-description">{asString(training?.notes, t.empty)}</p>
                </section>
              </div>

              <section className="review-panel">
                <h2>{t.skills}</h2>
                <div className="review-skill-editor-grid">
                  {skills.map((skill, index) => {
                    const skillType = asString(skill.type);
                    return (
                      <article className="review-skill-editor" key={`${asString(skill.id, "skill")}-${index}`}>
                        <div className="review-skill-editor-head">
                          <strong>{asString(skill.name, asString(skill.id, "-"))}</strong>
                          <span>{skillType || "-"}</span>
                        </div>
                        <div className="review-skill-fields">
                          {renderSkillTextField(index, skill, "name", t.skillName)}
                          {renderSkillNumberField(index, skill, "mp_cost", t.mpCost, "1")}
                          {(skillType === "melee" || skillType === "ranged") &&
                            renderSkillNumberField(index, skill, "damage", t.damage, "1")}
                          {skillType === "ranged" && (
                            <>
                              {renderSkillNumberField(index, skill, "hit_rate", t.hitRate, "0.01")}
                              {renderSkillNumberField(index, skill, "range", t.range, "1")}
                            </>
                          )}
                          {skillType === "block" &&
                            renderSkillNumberField(index, skill, "damage_reduction", t.reduction, "0.01")}
                          {skillType === "dodge" &&
                            renderSkillNumberField(index, skill, "retreat_distance", t.retreat, "1")}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="review-panel">
                <h2>{t.passive}</h2>
                {passive ? (
                  <div className="review-passive-editor">
                    <p>{t.passiveRuntimeNote}</p>
                    <div className="review-passive-editor-grid">
                      {renderPassiveTextField("name", t.skillName)}
                      {renderPassiveEffectTextField("category", t.effectCategory)}
                      {renderPassiveEffectTextField("name", t.effectName)}
                      {renderPassiveEffectTextField("trigger_condition", t.triggerCondition, { wide: true })}
                      {renderPassiveEffectNumberField("value", t.passiveValue)}
                      {renderPassiveEffectTextField("value_unit", t.valueUnit)}
                      {renderPassiveEffectTextField("description", t.effectDescription, { multiline: true, wide: true })}
                      {renderPassiveTextField("description", t.passiveDescription, { multiline: true, wide: true })}
                    </div>
                  </div>
                ) : (
                  <p className="review-description">{t.empty}</p>
                )}
              </section>

              <section className="review-panel">
                <h2>{t.assetTargets}</h2>
                <pre>{officialBundle ? formatJson(officialBundle.asset_targets) : t.empty}</pre>
              </section>

              <section className="review-panel review-assets-editor">
                <div className="review-panel-head">
                  <div>
                    <h2>{t.officialAssetsEditor}</h2>
                    <p>{t.officialAssetsEditorHint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      submission && setOfficialAssetsDraftText(formatJson(createOfficialAssetsDraft(submission)))
                    }
                    disabled={!submission}
                  >
                    {t.resetOfficialAssets}
                  </button>
                </div>
                <textarea
                  value={officialAssetsDraftText}
                  onChange={(event) => setOfficialAssetsDraftText(event.target.value)}
                  spellCheck={false}
                />
                {officialAssetsDraftError && <p className="review-hint">{t.officialAssetsInvalid}</p>}
              </section>

              <section className="review-panel review-preview">
                <h2>{t.officialPreview}</h2>
                <pre>{officialBundle ? formatPreviewJson(officialBundle.official_assets) : t.empty}</pre>
              </section>

              {renderOfficialImportPanel()}
            </section>
          </section>
        )}

        <footer className="review-footer">
          <span>{t.controls}</span>
          {status && <strong>{status}</strong>}
        </footer>
      </main>
    </UCWindow>
  );
}
