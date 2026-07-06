use crate::battle::{Action, BattleEngine};
use crate::loader::Loader;
use crate::models::arena::Arena;
use crate::models::character::{Character, CharacterPortrait};
use crate::models::rules::Rules;
use crate::models::skill::Skill;
use crate::rules::RuleEngine;
use crate::validator::{
    format_validation_errors, validate_assets as validate_asset_library, AssetValidationReport,
};
use chrono::Utc;
use rand::rngs::StdRng;
use rand::SeedableRng;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_REPLAYS: usize = 20;
const UCR_MAGIC: &[u8; 3] = b"UCR";
const UCR_VERSION: u8 = 1;
const S1_ROSTER_SIZE: usize = 32;
const S1_ROSTER_SEASON: &str = "S1";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TurnRecord {
    pub turn: i32,
    pub round: i32,
    pub action_a: String,
    pub action_b: String,
    pub damage_to_a: i32,
    pub damage_to_b: i32,
    pub hp_a: i32,
    pub hp_b: i32,
    pub mp_a: i32,
    pub mp_b: i32,
    pub pos_a_x: f64,
    pub pos_a_y: f64,
    pub pos_b_x: f64,
    pub pos_b_y: f64,
    pub dist: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReplayData {
    pub id: String,
    pub timestamp: String,
    pub winner: String,
    pub rounds_played: i32,
    pub turns_played: i32,
    pub final_hp_a: i32,
    pub final_hp_b: i32,
    pub loss_reason: String,
    pub turns: Vec<TurnRecord>,
    pub recorded_at: u64,
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BattleCommandResult {
    pub winner: String,
    pub winner_character_id: String,
    pub rounds_played: i32,
    pub turns_played: i32,
    pub final_hp_a: i32,
    pub final_hp_b: i32,
    pub loss_reason: String,
    pub replay_id: String,
    pub turns: Vec<TurnRecord>,
}

#[derive(Debug, Deserialize)]
struct OfficialImportPackage {
    package_type: String,
    review: OfficialImportReview,
    #[serde(default)]
    source: Option<Value>,
    #[serde(default)]
    roster: Option<OfficialImportRoster>,
    official_assets: OfficialImportAssets,
}

#[derive(Debug, Deserialize)]
struct OfficialImportReview {
    #[serde(default)]
    base_status: String,
    official_decision: String,
    #[serde(default)]
    official_notes: String,
    #[serde(default)]
    errors: usize,
}

#[derive(Debug, Deserialize)]
struct OfficialImportRoster {
    #[serde(default)]
    season: String,
    #[serde(default)]
    slot: Option<usize>,
}

#[derive(Debug, Deserialize)]
struct OfficialImportAssets {
    character: Value,
    skills: Vec<Value>,
    #[serde(default)]
    passive: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct OfficialImportResult {
    pub character_id: String,
    pub skill_ids: Vec<String>,
    pub passive_id: Option<String>,
    pub written_files: Vec<String>,
    pub validation: AssetValidationReport,
    pub roster: Vec<S1RosterSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S1RosterSlot {
    pub slot: usize,
    pub status: String,
    pub character_id: String,
    pub character_name: String,
    pub project_name: String,
    pub creator: String,
    pub source_path: String,
    pub review_decision: String,
    pub official_notes: String,
    pub checksum: String,
    pub review_package_status: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1RosterFile {
    season: String,
    name: String,
    capacity: usize,
    updated_at: String,
    slots: Vec<S1RosterSlot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1TournamentFile {
    season: String,
    name: String,
    format: String,
    status: String,
    capacity: usize,
    updated_at: String,
    bracket: S1TournamentBracket,
    placements: S1TournamentPlacements,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1TournamentBracket {
    left: Vec<S1TournamentRound>,
    right: Vec<S1TournamentRound>,
    #[serde(rename = "final")]
    final_match: S1TournamentMatch,
    third_place: S1TournamentMatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1TournamentRound {
    id: String,
    title: Value,
    matches: Vec<S1TournamentMatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1TournamentMatch {
    id: String,
    status: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    slots: Vec<usize>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    sources: Vec<String>,
    winner_slot: Option<usize>,
    loser_slot: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    replay_id: Option<String>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct S1TournamentPlacements {
    champion_slot: Option<usize>,
    runner_up_slot: Option<usize>,
    third_place_slot: Option<usize>,
    fourth_place_slot: Option<usize>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S1MatchResultInput {
    pub left_character_id: String,
    pub right_character_id: String,
    pub winner_character_id: String,
    #[serde(default)]
    pub replay_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct S1MatchRecordResult {
    pub match_id: String,
    pub winner_slot: usize,
    pub loser_slot: usize,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BattleConfig {
    pub left_character_id: String,
    pub right_character_id: String,
    pub arena_id: String,
    pub ruleset_id: String,
}

pub struct BattleSession {
    pub engine: BattleEngine,
    pub rng: StdRng,
    pub char_a_id: String,
    pub char_b_id: String,
    pub char_a_name: String,
    pub char_b_name: String,
    pub turns: Vec<TurnRecord>,
    pub finished: bool,
}

lazy_static::lazy_static! {
    static ref SESSIONS: Mutex<HashMap<String, BattleSession>> = Mutex::new(HashMap::new());
}

fn build_asset_validation_report(loader: &Loader) -> Result<AssetValidationReport, String> {
    let characters = loader.load_characters()?;
    let arenas = loader.load_arenas()?;
    let rulesets = loader.load_rulesets()?;
    let skills = loader.load_skills()?;

    Ok(validate_asset_library(
        &characters,
        &arenas,
        &rulesets,
        &skills,
    ))
}

fn runtime_assets_dir() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("assets")
}

fn source_assets_dir() -> Option<PathBuf> {
    let current = std::env::current_dir().ok()?;
    if current
        .file_name()
        .is_some_and(|name| name.to_string_lossy() == "src-tauri")
    {
        return current.parent().map(|parent| parent.join("assets"));
    }

    if current.join("src-tauri").is_dir() {
        return Some(current.join("assets"));
    }

    None
}

fn official_asset_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![runtime_assets_dir()];
    if let Some(source_dir) = source_assets_dir() {
        if !dirs.iter().any(|dir| dir == &source_dir) {
            dirs.push(source_dir);
        }
    }
    dirs
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn empty_s1_roster_slot(slot: usize) -> S1RosterSlot {
    S1RosterSlot {
        slot,
        status: "empty".to_string(),
        character_id: String::new(),
        character_name: String::new(),
        project_name: String::new(),
        creator: String::new(),
        source_path: String::new(),
        review_decision: "pending".to_string(),
        official_notes: String::new(),
        checksum: String::new(),
        review_package_status: String::new(),
        updated_at: String::new(),
    }
}

fn empty_s1_roster_file() -> S1RosterFile {
    S1RosterFile {
        season: S1_ROSTER_SEASON.to_string(),
        name: "S1: Origin".to_string(),
        capacity: S1_ROSTER_SIZE,
        updated_at: String::new(),
        slots: (1..=S1_ROSTER_SIZE).map(empty_s1_roster_slot).collect(),
    }
}

fn s1_roster_path(base_dir: &Path) -> PathBuf {
    base_dir.join("rosters").join("S1.json")
}

fn s1_tournament_path(base_dir: &Path) -> PathBuf {
    base_dir.join("tournaments").join("S1.json")
}

fn normalize_s1_roster_file(mut roster: S1RosterFile) -> S1RosterFile {
    roster.season = S1_ROSTER_SEASON.to_string();
    roster.name = if roster.name.trim().is_empty() {
        "S1: Origin".to_string()
    } else {
        roster.name
    };
    roster.capacity = S1_ROSTER_SIZE;

    let mut normalized_slots: Vec<S1RosterSlot> =
        (1..=S1_ROSTER_SIZE).map(empty_s1_roster_slot).collect();
    for mut slot in roster.slots {
        if !(1..=S1_ROSTER_SIZE).contains(&slot.slot) {
            continue;
        }

        let slot_number = slot.slot;
        if slot.character_id.trim().is_empty() {
            slot = empty_s1_roster_slot(slot_number);
        } else if slot.status.trim().is_empty() {
            slot.status = "pending_review".to_string();
        }

        normalized_slots[slot_number - 1] = slot;
    }
    roster.slots = normalized_slots;
    roster
}

fn read_s1_roster_file(base_dir: &Path) -> Result<S1RosterFile, String> {
    let path = s1_roster_path(base_dir);
    if !path.exists() {
        return Ok(empty_s1_roster_file());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取 S1 名单失败 {}: {}", path.display(), e))?;
    let roster: S1RosterFile = serde_json::from_str(&content)
        .map_err(|e| format!("解析 S1 名单失败 {}: {}", path.display(), e))?;
    Ok(normalize_s1_roster_file(roster))
}

fn read_s1_tournament_file(base_dir: &Path) -> Result<Value, String> {
    let path = s1_tournament_path(base_dir);
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取 S1 赛事数据失败 {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("解析 S1 赛事数据失败 {}: {}", path.display(), e))
}

fn read_s1_tournament_struct(base_dir: &Path) -> Result<S1TournamentFile, String> {
    let path = s1_tournament_path(base_dir);
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取 S1 赛事数据失败 {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("解析 S1 赛事数据失败 {}: {}", path.display(), e))
}

fn write_s1_roster_file(base_dir: &Path, roster: &S1RosterFile) -> Result<PathBuf, String> {
    let path = s1_roster_path(base_dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建 S1 名单目录失败 {}: {}", parent.display(), e))?;
    }

    let content =
        serde_json::to_string_pretty(roster).map_err(|e| format!("序列化 S1 名单失败: {}", e))?;
    fs::write(&path, format!("{}\n", content))
        .map_err(|e| format!("写入 S1 名单失败 {}: {}", path.display(), e))?;
    Ok(path)
}

fn write_s1_tournament_file(
    base_dir: &Path,
    tournament: &S1TournamentFile,
) -> Result<PathBuf, String> {
    let path = s1_tournament_path(base_dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建 S1 赛事目录失败 {}: {}", parent.display(), e))?;
    }

    let content = serde_json::to_string_pretty(tournament)
        .map_err(|e| format!("序列化 S1 赛事数据失败: {}", e))?;
    fs::write(&path, format!("{}\n", content))
        .map_err(|e| format!("写入 S1 赛事数据失败 {}: {}", path.display(), e))?;
    Ok(path)
}

fn s1_roster_slot_for_character(
    roster: &S1RosterFile,
    character_id: &str,
) -> Result<usize, String> {
    roster
        .slots
        .iter()
        .find(|slot| slot.character_id == character_id)
        .map(|slot| slot.slot)
        .ok_or_else(|| format!("角色不在 S1 官方名单中: {}", character_id))
}

fn split_tournament_source(source: &str) -> (&str, bool) {
    source
        .strip_suffix(":loser")
        .map(|match_id| (match_id, true))
        .unwrap_or((source, false))
}

fn find_s1_match<'a>(
    tournament: &'a S1TournamentFile,
    match_id: &str,
) -> Option<&'a S1TournamentMatch> {
    tournament
        .bracket
        .left
        .iter()
        .chain(tournament.bracket.right.iter())
        .flat_map(|round| round.matches.iter())
        .chain(std::iter::once(&tournament.bracket.final_match))
        .chain(std::iter::once(&tournament.bracket.third_place))
        .find(|match_data| match_data.id == match_id)
}

fn find_s1_match_mut<'a>(
    tournament: &'a mut S1TournamentFile,
    match_id: &str,
) -> Option<&'a mut S1TournamentMatch> {
    for round in tournament
        .bracket
        .left
        .iter_mut()
        .chain(tournament.bracket.right.iter_mut())
    {
        if let Some(match_data) = round
            .matches
            .iter_mut()
            .find(|match_data| match_data.id == match_id)
        {
            return Some(match_data);
        }
    }

    if tournament.bracket.final_match.id == match_id {
        return Some(&mut tournament.bracket.final_match);
    }

    if tournament.bracket.third_place.id == match_id {
        return Some(&mut tournament.bracket.third_place);
    }

    None
}

fn s1_match_participant_slots(
    tournament: &S1TournamentFile,
    match_data: &S1TournamentMatch,
) -> Vec<usize> {
    if !match_data.slots.is_empty() {
        return match_data.slots.clone();
    }

    match_data
        .sources
        .iter()
        .filter_map(|source| {
            let (match_id, use_loser) = split_tournament_source(source);
            let source_match = find_s1_match(tournament, match_id)?;
            if use_loser {
                source_match.loser_slot
            } else {
                source_match.winner_slot
            }
        })
        .collect()
}

fn find_s1_match_for_slots(
    tournament: &S1TournamentFile,
    left_slot: usize,
    right_slot: usize,
) -> Option<String> {
    tournament
        .bracket
        .left
        .iter()
        .chain(tournament.bracket.right.iter())
        .flat_map(|round| round.matches.iter())
        .chain(std::iter::once(&tournament.bracket.final_match))
        .chain(std::iter::once(&tournament.bracket.third_place))
        .find(|match_data| {
            let participants = s1_match_participant_slots(tournament, match_data);
            participants.contains(&left_slot) && participants.contains(&right_slot)
        })
        .map(|match_data| match_data.id.clone())
}

fn s1_all_required_matches_completed(tournament: &S1TournamentFile) -> bool {
    tournament.bracket.final_match.status == "completed"
        && tournament.bracket.third_place.status == "completed"
}

fn apply_s1_match_result(
    tournament: &mut S1TournamentFile,
    roster: &S1RosterFile,
    input: &S1MatchResultInput,
) -> Result<S1MatchRecordResult, String> {
    if input.winner_character_id != input.left_character_id
        && input.winner_character_id != input.right_character_id
    {
        return Err("胜者不属于本场对局。".to_string());
    }

    let left_slot = s1_roster_slot_for_character(roster, &input.left_character_id)?;
    let right_slot = s1_roster_slot_for_character(roster, &input.right_character_id)?;
    let winner_slot = s1_roster_slot_for_character(roster, &input.winner_character_id)?;
    let loser_slot = if winner_slot == left_slot {
        right_slot
    } else {
        left_slot
    };

    let match_id = find_s1_match_for_slots(tournament, left_slot, right_slot)
        .ok_or_else(|| "没有找到包含这两个席位的 S1 对局。".to_string())?;
    let updated_at = now_iso();
    let target = find_s1_match_mut(tournament, &match_id)
        .ok_or_else(|| format!("没有找到 S1 对局: {}", match_id))?;

    target.status = "completed".to_string();
    target.winner_slot = Some(winner_slot);
    target.loser_slot = Some(loser_slot);
    target.replay_id = if input.replay_id.trim().is_empty() {
        None
    } else {
        Some(input.replay_id.trim().to_string())
    };
    target.updated_at = updated_at.clone();

    if match_id == tournament.bracket.final_match.id {
        tournament.placements.champion_slot = Some(winner_slot);
        tournament.placements.runner_up_slot = Some(loser_slot);
    } else if match_id == tournament.bracket.third_place.id {
        tournament.placements.third_place_slot = Some(winner_slot);
        tournament.placements.fourth_place_slot = Some(loser_slot);
    }

    tournament.status = if s1_all_required_matches_completed(tournament) {
        "completed".to_string()
    } else {
        "running".to_string()
    };
    tournament.updated_at = updated_at.clone();

    Ok(S1MatchRecordResult {
        match_id,
        winner_slot,
        loser_slot,
        updated_at,
    })
}

fn package_source_path(package: &OfficialImportPackage) -> String {
    package
        .source
        .as_ref()
        .and_then(|source| source.get("path"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string()
}

fn package_checksum(package: &OfficialImportPackage) -> String {
    package
        .source
        .as_ref()
        .and_then(|source| source.get("checksum"))
        .and_then(|checksum| {
            checksum
                .get("calculated")
                .or_else(|| checksum.get("stored"))
                .and_then(Value::as_str)
        })
        .unwrap_or("")
        .trim()
        .to_string()
}

fn requested_s1_roster_slot(package: &OfficialImportPackage) -> Result<Option<usize>, String> {
    let Some(roster) = package.roster.as_ref() else {
        return Ok(None);
    };

    if !roster.season.trim().is_empty() && roster.season.trim() != S1_ROSTER_SEASON {
        return Err(format!("官方包赛季不是 S1: {}", roster.season));
    }

    Ok(roster
        .slot
        .filter(|slot| (1..=S1_ROSTER_SIZE).contains(slot)))
}

fn select_s1_roster_slot(
    roster: &S1RosterFile,
    character_id: &str,
    requested_slot: Option<usize>,
) -> Result<usize, String> {
    if let Some(existing) = roster
        .slots
        .iter()
        .find(|slot| slot.character_id == character_id)
    {
        return Ok(existing.slot);
    }

    if let Some(slot) = requested_slot {
        return Ok(slot);
    }

    roster
        .slots
        .iter()
        .find(|slot| slot.status == "empty" || slot.character_id.trim().is_empty())
        .map(|slot| slot.slot)
        .ok_or_else(|| "S1 名单已满，无法自动登记。".to_string())
}

fn upsert_s1_roster_asset(
    base_dir: &Path,
    package: &OfficialImportPackage,
    character: &Character,
    overwrite: bool,
) -> Result<(S1RosterFile, PathBuf), String> {
    let mut roster = read_s1_roster_file(base_dir)?;
    let requested_slot = requested_s1_roster_slot(package)?;
    let slot = select_s1_roster_slot(&roster, &character.id, requested_slot)?;
    let target_index = slot - 1;
    let current = &roster.slots[target_index];

    if !current.character_id.trim().is_empty() && current.character_id != character.id && !overwrite
    {
        return Err(format!(
            "S1 名单席位 #{} 已被 {} 占用，未开启覆盖。",
            slot, current.character_id
        ));
    }

    let updated_at = now_iso();
    roster.updated_at = updated_at.clone();
    roster.slots[target_index] = S1RosterSlot {
        slot,
        status: "imported".to_string(),
        character_id: character.id.clone(),
        character_name: character.name.clone(),
        project_name: character.project_name.clone().unwrap_or_default(),
        creator: character.creator.clone(),
        source_path: package_source_path(package),
        review_decision: "approved".to_string(),
        official_notes: package.review.official_notes.trim().to_string(),
        checksum: package_checksum(package),
        review_package_status: if package.review.base_status.trim().is_empty() {
            "base_rules_passed".to_string()
        } else {
            package.review.base_status.trim().to_string()
        },
        updated_at,
    };

    let path = write_s1_roster_file(base_dir, &roster)?;
    Ok((roster, path))
}

fn ensure_can_upsert_s1_roster_asset(
    base_dir: &Path,
    package: &OfficialImportPackage,
    character: &Character,
    overwrite: bool,
) -> Result<(), String> {
    let roster = read_s1_roster_file(base_dir)?;
    let requested_slot = requested_s1_roster_slot(package)?;
    let slot = select_s1_roster_slot(&roster, &character.id, requested_slot)?;
    let current = &roster.slots[slot - 1];

    if !current.character_id.trim().is_empty() && current.character_id != character.id && !overwrite
    {
        return Err(format!(
            "S1 名单席位 #{} 已被 {} 占用，未开启覆盖。",
            slot, current.character_id
        ));
    }

    Ok(())
}

fn public_s1_roster_slot(mut slot: S1RosterSlot) -> S1RosterSlot {
    let public_status = match slot.status.as_str() {
        "approved" | "imported" | "trained" => slot.status.clone(),
        "pending_review" => "pending_review".to_string(),
        _ => "empty".to_string(),
    };

    if public_status == "empty" || public_status == "pending_review" {
        slot.character_id.clear();
        slot.character_name.clear();
        slot.project_name.clear();
        slot.creator.clear();
        slot.updated_at.clear();
    }

    slot.status = public_status;
    slot.source_path.clear();
    slot.review_decision = if matches!(slot.status.as_str(), "approved" | "imported" | "trained") {
        "approved".to_string()
    } else {
        "pending".to_string()
    };
    slot.official_notes.clear();
    slot.checksum.clear();
    slot.review_package_status.clear();
    slot
}

fn is_file_safe_asset_id(value: &str) -> bool {
    let len = value.len();
    len >= 3
        && len <= 64
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_' || byte == b'-'
        })
        && value
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
}

fn skill_asset_id(skill: &Skill) -> &str {
    match skill {
        Skill::Melee(skill) => &skill.id,
        Skill::Ranged(skill) => &skill.id,
        Skill::Block(skill) => &skill.id,
        Skill::Dodge(skill) => &skill.id,
    }
}

fn passive_asset_id(value: &Value) -> Option<String> {
    value
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(ToOwned::to_owned)
}

fn asset_file_path(base_dir: &Path, folder: &str, id: &str) -> Result<PathBuf, String> {
    if !is_file_safe_asset_id(id) {
        return Err(format!("资源 ID 不合法，无法写入文件: {}", id));
    }

    Ok(base_dir.join(folder).join(format!("{}.json", id)))
}

fn ensure_can_write_asset(
    base_dir: &Path,
    folder: &str,
    id: &str,
    overwrite: bool,
) -> Result<(), String> {
    let path = asset_file_path(base_dir, folder, id)?;
    if path.exists() && !overwrite {
        return Err(format!("资源文件已存在，未开启覆盖: {}", path.display()));
    }
    Ok(())
}

fn write_json_asset(
    base_dir: &Path,
    folder: &str,
    id: &str,
    value: &Value,
) -> Result<PathBuf, String> {
    let path = asset_file_path(base_dir, folder, id)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建资源目录失败 {}: {}", parent.display(), e))?;
    }

    let content =
        serde_json::to_string_pretty(value).map_err(|e| format!("序列化资源失败 {}: {}", id, e))?;
    fs::write(&path, format!("{}\n", content))
        .map_err(|e| format!("写入资源文件失败 {}: {}", path.display(), e))?;
    Ok(path)
}

fn ensure_assets_valid(loader: &Loader) -> Result<(), String> {
    let report = build_asset_validation_report(loader)?;
    if report.valid {
        Ok(())
    } else {
        Err(format_validation_errors(&report))
    }
}

fn action_name(action: &Action) -> String {
    match action {
        Action::Wait => "Wait".to_string(),
        Action::MoveToward => "MoveToward".to_string(),
        Action::MoveAway => "MoveAway".to_string(),
        Action::BasicAttack { .. } => "BasicAttack".to_string(),
        Action::MeleeSkill { .. } => "MeleeSkill".to_string(),
        Action::RangedSkill { .. } => "RangedSkill".to_string(),
        Action::Block { .. } => "Block".to_string(),
        Action::Dodge => "Dodge".to_string(),
    }
}

fn replays_dir() -> PathBuf {
    let dir = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .join("replays");
    fs::create_dir_all(&dir).ok();
    dir
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

fn generate_signature(replay: &ReplayData) -> String {
    let mut hasher = Sha256::new();
    hasher.update(replay.id.as_bytes());
    hasher.update(replay.winner.as_bytes());
    hasher.update(replay.rounds_played.to_string().as_bytes());
    hasher.update(replay.turns_played.to_string().as_bytes());
    hasher.update(replay.final_hp_a.to_string().as_bytes());
    hasher.update(replay.final_hp_b.to_string().as_bytes());
    hasher.update(replay.loss_reason.as_bytes());
    hasher.update(replay.recorded_at.to_string().as_bytes());
    for turn in &replay.turns {
        hasher.update(turn.turn.to_string().as_bytes());
        hasher.update(turn.round.to_string().as_bytes());
        hasher.update(turn.action_a.as_bytes());
        hasher.update(turn.action_b.as_bytes());
        hasher.update(turn.damage_to_a.to_string().as_bytes());
        hasher.update(turn.damage_to_b.to_string().as_bytes());
        hasher.update(turn.hp_a.to_string().as_bytes());
        hasher.update(turn.hp_b.to_string().as_bytes());
        hasher.update(turn.mp_a.to_string().as_bytes());
        hasher.update(turn.mp_b.to_string().as_bytes());
        hasher.update(turn.pos_a_x.to_string().as_bytes());
        hasher.update(turn.pos_a_y.to_string().as_bytes());
        hasher.update(turn.pos_b_x.to_string().as_bytes());
        hasher.update(turn.pos_b_y.to_string().as_bytes());
    }
    hex::encode(hasher.finalize())
}

fn encode_ucr(replay: &ReplayData) -> Result<Vec<u8>, String> {
    let json = serde_json::to_string(replay).map_err(|e| format!("序列化失败: {}", e))?;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::best());
    encoder
        .write_all(json.as_bytes())
        .map_err(|e| format!("压缩失败: {}", e))?;
    let compressed = encoder.finish().map_err(|e| format!("压缩失败: {}", e))?;

    let sig_bytes = hex::decode(&replay.signature).map_err(|e| format!("签名解析失败: {}", e))?;
    let data_len = compressed.len() as u32;

    let mut ucr = Vec::new();
    ucr.extend_from_slice(UCR_MAGIC);
    ucr.push(UCR_VERSION);
    ucr.extend_from_slice(&replay.recorded_at.to_le_bytes());
    ucr.extend_from_slice(&data_len.to_le_bytes());
    ucr.extend_from_slice(&compressed);
    ucr.extend_from_slice(&sig_bytes);

    Ok(ucr)
}

fn decode_ucr(data: &[u8]) -> Result<ReplayData, String> {
    if data.len() < 48 {
        return Err("文件太小，不是有效的 UCR 格式".to_string());
    }
    if &data[0..3] != UCR_MAGIC {
        return Err("魔数不匹配，不是 UCR 文件".to_string());
    }
    let version = data[3];
    if version != UCR_VERSION {
        return Err(format!("不支持的 UCR 版本: {}", version));
    }

    let recorded_at = u64::from_le_bytes(data[4..12].try_into().unwrap());
    let data_len = u32::from_le_bytes(data[12..16].try_into().unwrap()) as usize;

    if data.len() < 48 + data_len {
        return Err("文件数据不完整".to_string());
    }

    let compressed = &data[16..16 + data_len];
    let stored_sig = hex::encode(&data[16 + data_len..16 + data_len + 32]);

    let mut decoder = flate2::read::GzDecoder::new(compressed);
    let mut json = String::new();
    decoder
        .read_to_string(&mut json)
        .map_err(|e| format!("解压失败: {}", e))?;

    let mut replay: ReplayData =
        serde_json::from_str(&json).map_err(|e| format!("解析失败: {}", e))?;

    if replay.recorded_at != recorded_at {
        return Err("时间戳被篡改".to_string());
    }

    replay.signature = stored_sig.clone();
    let expected_sig = generate_signature(&replay);
    if stored_sig != expected_sig {
        return Err("数据被篡改，签名校验失败".to_string());
    }

    Ok(replay)
}

fn save_replay(replay: &mut ReplayData) {
    replay.recorded_at = now_secs();
    replay.signature = generate_signature(replay);

    let dir = replays_dir();
    let path = dir.join(format!("{}.ucr", replay.id));
    if let Ok(ucr) = encode_ucr(replay) {
        fs::write(path, ucr).ok();
    }

    let mut files: Vec<_> = fs::read_dir(&dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "ucr")
                .unwrap_or(false)
        })
        .collect();

    files.sort_by_key(|e| {
        e.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });

    while files.len() > MAX_REPLAYS {
        if let Some(old) = files.first() {
            fs::remove_file(old.path()).ok();
            files.remove(0);
        }
    }
}

#[tauri::command]
pub fn list_characters() -> Result<Vec<Character>, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    let mut characters = loader.load_characters()?;
    for character in &mut characters {
        if let Some(portrait) = &mut character.portrait {
            portrait.data_url.clear();
        }
    }
    characters.sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
    Ok(characters)
}

#[tauri::command]
pub fn get_character_portrait(character_id: String) -> Result<Option<CharacterPortrait>, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    loader
        .load_character(&character_id)
        .map(|character| character.portrait)
}

#[tauri::command]
pub fn list_arenas() -> Result<Vec<Arena>, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    let mut arenas = loader.load_arenas()?;
    arenas.sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
    Ok(arenas)
}

#[tauri::command]
pub fn list_rulesets() -> Result<Vec<Rules>, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    let mut rulesets = loader.load_rulesets()?;
    rulesets.sort_by(|a, b| a.season.cmp(&b.season));
    Ok(rulesets)
}

#[tauri::command]
pub fn list_skills() -> Result<Vec<Skill>, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    loader.load_skills()
}

#[tauri::command]
pub fn validate_assets() -> Result<AssetValidationReport, String> {
    let loader = Loader::new();
    build_asset_validation_report(&loader)
}

#[tauri::command]
pub fn list_s1_roster() -> Result<Vec<S1RosterSlot>, String> {
    Ok(read_s1_roster_file(&runtime_assets_dir())?.slots)
}

#[tauri::command]
pub fn list_s1_public_roster() -> Result<Vec<S1RosterSlot>, String> {
    Ok(read_s1_roster_file(&runtime_assets_dir())?
        .slots
        .into_iter()
        .map(public_s1_roster_slot)
        .collect())
}

#[tauri::command]
pub fn get_s1_tournament() -> Result<Value, String> {
    read_s1_tournament_file(&runtime_assets_dir())
}

#[tauri::command]
pub fn record_s1_match_result(input: S1MatchResultInput) -> Result<S1MatchRecordResult, String> {
    let asset_dirs = official_asset_dirs();
    let mut prepared_updates = Vec::new();

    for dir in &asset_dirs {
        let roster = read_s1_roster_file(dir)?;
        let mut tournament = read_s1_tournament_struct(dir)?;
        let result = apply_s1_match_result(&mut tournament, &roster, &input)?;
        prepared_updates.push((dir.clone(), tournament, result));
    }

    let mut latest_result = None;
    for (dir, tournament, result) in prepared_updates {
        write_s1_tournament_file(&dir, &tournament)?;
        latest_result = Some(result);
    }

    latest_result.ok_or_else(|| "没有可写入的 S1 赛事资源目录。".to_string())
}

#[tauri::command]
pub fn import_official_package(
    payload: Value,
    overwrite: bool,
) -> Result<OfficialImportResult, String> {
    let package: OfficialImportPackage =
        serde_json::from_value(payload).map_err(|e| format!("官方导入包格式不正确: {}", e))?;

    if package.package_type != "uce_official_import_package" {
        return Err("文件不是 UCE 官方导入包。".to_string());
    }

    if package.review.official_decision != "approved" {
        return Err("只有官方审核通过的导入包才能写入资源库。".to_string());
    }

    if package.review.errors > 0 {
        return Err("该导入包仍包含硬性错误，不能写入资源库。".to_string());
    }

    let character: Character = serde_json::from_value(package.official_assets.character.clone())
        .map_err(|e| format!("解析角色资源失败: {}", e))?;

    if !is_file_safe_asset_id(&character.id) {
        return Err(format!("角色 ID 不合法: {}", character.id));
    }

    let mut imported_skills = Vec::new();
    let mut skill_ids = Vec::new();
    for skill_value in &package.official_assets.skills {
        let skill: Skill = serde_json::from_value(skill_value.clone())
            .map_err(|e| format!("解析技能资源失败: {}", e))?;
        let skill_id = skill_asset_id(&skill).to_string();
        if !is_file_safe_asset_id(&skill_id) {
            return Err(format!("技能 ID 不合法: {}", skill_id));
        }
        skill_ids.push(skill_id);
        imported_skills.push(skill);
    }

    let passive_value = package
        .official_assets
        .passive
        .as_ref()
        .filter(|value| !value.is_null())
        .or_else(|| {
            package
                .official_assets
                .character
                .get("passive")
                .filter(|value| value.is_object())
        });
    let passive_id = passive_value.and_then(passive_asset_id);
    if let Some(passive_id) = passive_id.as_ref() {
        if !is_file_safe_asset_id(passive_id) {
            return Err(format!("被动 ID 不合法: {}", passive_id));
        }
    }

    let loader = Loader::new();
    let mut characters = loader.load_characters()?;
    let arenas = loader.load_arenas()?;
    let rulesets = loader.load_rulesets()?;
    let mut skills = loader.load_skills()?;

    if overwrite {
        characters.retain(|existing| existing.id != character.id);
        skills.retain(|existing| !skill_ids.iter().any(|id| id == skill_asset_id(existing)));
    }

    characters.push(character.clone());
    skills.extend(imported_skills.clone());

    let validation = validate_asset_library(&characters, &arenas, &rulesets, &skills);
    if !validation.valid {
        return Err(format_validation_errors(&validation));
    }

    let asset_dirs = official_asset_dirs();
    for dir in &asset_dirs {
        ensure_can_write_asset(dir, "characters", &character.id, overwrite)?;
        for skill_id in &skill_ids {
            ensure_can_write_asset(dir, "skills", skill_id, overwrite)?;
        }
        if let Some(passive_id) = passive_id.as_ref() {
            ensure_can_write_asset(dir, "passives", passive_id, overwrite)?;
        }
        ensure_can_upsert_s1_roster_asset(dir, &package, &character, overwrite)?;
    }

    let mut written_files = Vec::new();
    let mut latest_roster = None;
    for dir in &asset_dirs {
        written_files.push(
            write_json_asset(
                dir,
                "characters",
                &character.id,
                &package.official_assets.character,
            )?
            .display()
            .to_string(),
        );

        for (skill_id, skill_value) in skill_ids.iter().zip(package.official_assets.skills.iter()) {
            written_files.push(
                write_json_asset(dir, "skills", skill_id, skill_value)?
                    .display()
                    .to_string(),
            );
        }

        if let (Some(passive_id), Some(passive_value)) = (passive_id.as_ref(), passive_value) {
            written_files.push(
                write_json_asset(dir, "passives", passive_id, passive_value)?
                    .display()
                    .to_string(),
            );
        }

        let (roster, roster_path) = upsert_s1_roster_asset(dir, &package, &character, overwrite)?;
        written_files.push(roster_path.display().to_string());
        latest_roster = Some(roster);
    }

    Ok(OfficialImportResult {
        character_id: character.id,
        skill_ids,
        passive_id,
        written_files,
        validation,
        roster: latest_roster.unwrap_or_else(empty_s1_roster_file).slots,
    })
}

#[tauri::command]
pub fn init_battle(config: BattleConfig) -> Result<String, String> {
    let loader = Loader::new();
    ensure_assets_valid(&loader)?;
    let rules = RuleEngine::load(&config.ruleset_id)?;

    let char_a = loader.load_character(&config.left_character_id)?;
    let char_b = loader.load_character(&config.right_character_id)?;
    let arena = loader.load_arena(&config.arena_id)?;
    let skill_melee_a = loader.load_skill(&char_a.skills.melee)?;
    let skill_ranged_a = loader.load_skill(&char_a.skills.ranged)?;
    let skill_block_a = loader.load_skill(&char_a.skills.block)?;
    let _skill_dodge_a = loader.load_skill(&char_a.skills.dodge)?;
    let skill_melee_b = loader.load_skill(&char_b.skills.melee)?;
    let skill_ranged_b = loader.load_skill(&char_b.skills.ranged)?;
    let skill_block_b = loader.load_skill(&char_b.skills.block)?;
    let _skill_dodge_b = loader.load_skill(&char_b.skills.dodge)?;

    let engine = BattleEngine::new(
        char_a.clone(),
        char_b.clone(),
        skill_melee_a,
        skill_ranged_a,
        skill_block_a,
        skill_melee_b,
        skill_ranged_b,
        skill_block_b,
        arena,
        rules,
    );

    let rng = StdRng::from_entropy();
    let session_id = format!(
        "battle_{}",
        rand::Rng::gen_range(&mut rand::thread_rng(), 0..99999)
    );

    let session = BattleSession {
        engine,
        rng,
        char_a_id: char_a.id.clone(),
        char_b_id: char_b.id.clone(),
        char_a_name: char_a.name.clone(),
        char_b_name: char_b.name.clone(),
        turns: Vec::new(),
        finished: false,
    };

    SESSIONS.lock().unwrap().insert(session_id.clone(), session);

    Ok(session_id)
}

#[tauri::command]
pub fn step_battle(session_id: String) -> Result<TurnRecord, String> {
    let mut sessions = SESSIONS.lock().unwrap();
    let session = sessions.get_mut(&session_id).ok_or("Session not found")?;

    if session.finished {
        return Err("Battle already finished".to_string());
    }

    let all_actions = vec![
        Action::MoveToward,
        Action::MoveToward,
        Action::MoveToward,
        Action::MoveToward,
        Action::BasicAttack { mp_boost: 5 },
        Action::BasicAttack { mp_boost: 15 },
        Action::BasicAttack { mp_boost: 0 },
        Action::MeleeSkill {
            mp_cost: 0,
            damage: 25,
        },
        Action::MeleeSkill {
            mp_cost: 10,
            damage: 35,
        },
        Action::RangedSkill {
            mp_cost: 50,
            damage: 75,
            hit_rate: 0.6,
            knockback: 0,
        },
        Action::RangedSkill {
            mp_cost: 70,
            damage: 110,
            hit_rate: 0.75,
            knockback: 0,
        },
        Action::Block {
            mp_cost: 0,
            reduction: 0.5,
        },
        Action::Block {
            mp_cost: 10,
            reduction: 0.65,
        },
        Action::Dodge,
    ];

    let idx_a: usize = rand::Rng::gen_range(&mut session.rng, 0..all_actions.len());
    let idx_b: usize = rand::Rng::gen_range(&mut session.rng, 0..all_actions.len());

    let action_a = all_actions[idx_a].clone();
    let action_b = all_actions[idx_b].clone();

    let result = session
        .engine
        .execute_turn(action_a, action_b, &mut session.rng);

    let dist = crate::physics::distance(
        &session.engine.fighter_a.position,
        &session.engine.fighter_b.position,
    );

    let record = TurnRecord {
        turn: result.turn,
        round: result.round,
        action_a: action_name(&result.action_a),
        action_b: action_name(&result.action_b),
        damage_to_a: result.damage_to_a,
        damage_to_b: result.damage_to_b,
        hp_a: result.hp_a_after,
        hp_b: result.hp_b_after,
        mp_a: result.mp_a_after,
        mp_b: result.mp_b_after,
        pos_a_x: result.position_a_after.x,
        pos_a_y: result.position_a_after.y,
        pos_b_x: result.position_b_after.x,
        pos_b_y: result.position_b_after.y,
        dist,
    };

    session.turns.push(record.clone());

    if session.engine.is_finished() {
        session.finished = true;
    }

    Ok(record)
}

#[tauri::command]
pub fn finish_battle(session_id: String) -> Result<BattleCommandResult, String> {
    let (winner, winner_character_id, loss_reason, turns, rounds_played, final_hp_a, final_hp_b) = {
        let sessions = SESSIONS.lock().unwrap();
        let session = sessions.get(&session_id).ok_or("Session not found")?;

        let winner = session
            .engine
            .get_winner()
            .unwrap_or_else(|| "draw".to_string());
        let winner_character_id = if winner == session.char_a_name {
            session.char_a_id.clone()
        } else if winner == session.char_b_name {
            session.char_b_id.clone()
        } else {
            String::new()
        };
        let rounds_played = session
            .turns
            .last()
            .map(|turn| turn.round)
            .unwrap_or(session.engine.round);
        let loss_reason = if winner == session.char_a_name {
            session
                .engine
                .loss_reason(&session.engine.fighter_b, &session.char_b_name)
                .unwrap_or_else(|| "未知".to_string())
        } else if winner == session.char_b_name {
            session
                .engine
                .loss_reason(&session.engine.fighter_a, &session.char_a_name)
                .unwrap_or_else(|| "未知".to_string())
        } else {
            "平局".to_string()
        };

        (
            winner,
            winner_character_id,
            loss_reason,
            session.turns.clone(),
            rounds_played,
            session.engine.fighter_a.hp,
            session.engine.fighter_b.hp,
        )
    };

    let mut replay = ReplayData {
        id: session_id.clone(),
        timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        winner: winner.clone(),
        rounds_played,
        turns_played: turns.len() as i32,
        final_hp_a,
        final_hp_b,
        loss_reason: loss_reason.clone(),
        turns: turns.clone(),
        recorded_at: 0,
        signature: String::new(),
    };

    save_replay(&mut replay);

    Ok(BattleCommandResult {
        winner,
        winner_character_id,
        rounds_played,
        turns_played: turns.len() as i32,
        final_hp_a,
        final_hp_b,
        loss_reason,
        replay_id: session_id.clone(),
        turns,
    })
}

#[tauri::command]
pub fn list_replays() -> Result<Vec<ReplayData>, String> {
    let dir = replays_dir();
    let mut replays = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if entry
                .path()
                .extension()
                .map(|e| e == "ucr")
                .unwrap_or(false)
            {
                if let Ok(data) = fs::read(entry.path()) {
                    if let Ok(replay) = decode_ucr(&data) {
                        replays.push(replay);
                    }
                }
            }
        }
    }

    replays.sort_by(|a, b| b.recorded_at.cmp(&a.recorded_at));
    Ok(replays)
}

#[tauri::command]
pub fn get_replay(replay_id: String) -> Result<ReplayData, String> {
    let dir = replays_dir();
    let path = dir.join(format!("{}.ucr", replay_id));
    let data = fs::read(&path).map_err(|e| format!("回放文件不存在: {}", e))?;
    decode_ucr(&data)
}

#[tauri::command]
pub fn delete_replay(replay_id: String) -> Result<(), String> {
    let dir = replays_dir();
    let path = dir.join(format!("{}.ucr", replay_id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("删除失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_replay(replay_id: String) -> Result<Vec<u8>, String> {
    let dir = replays_dir();
    let path = dir.join(format!("{}.ucr", replay_id));
    let data = fs::read(&path).map_err(|e| format!("读取失败: {}", e))?;
    Ok(data)
}

#[tauri::command]
pub fn import_replay(data: Vec<u8>) -> Result<ReplayData, String> {
    let replay = decode_ucr(&data)?;
    let mut validated = replay.clone();
    save_replay(&mut validated);
    Ok(replay)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configured_battle_can_start_from_listed_assets() {
        let report = validate_assets().expect("asset validation should run");
        assert!(
            report.valid,
            "asset validation should pass: {:?}",
            report.errors
        );

        let characters = list_characters().expect("characters should load");
        let roster = list_s1_roster().expect("S1 roster should load");
        let public_roster = list_s1_public_roster().expect("public S1 roster should load");
        let tournament = get_s1_tournament().expect("S1 tournament should load");
        let arenas = list_arenas().expect("arenas should load");
        let rulesets = list_rulesets().expect("rulesets should load");
        let skills = list_skills().expect("skills should load");

        assert!(!characters.is_empty());
        assert_eq!(roster.len(), S1_ROSTER_SIZE);
        assert_eq!(public_roster.len(), S1_ROSTER_SIZE);
        assert!(roster.iter().any(|slot| slot.character_id == "dcpe_sans"));
        assert_eq!(tournament.get("season").and_then(Value::as_str), Some("S1"));
        assert!(public_roster.iter().all(|slot| {
            slot.source_path.is_empty()
                && slot.official_notes.is_empty()
                && slot.checksum.is_empty()
                && slot.review_package_status.is_empty()
        }));
        assert!(!arenas.is_empty());
        assert!(!rulesets.is_empty());
        assert!(!skills.is_empty());

        let left = &characters[0];
        let right = characters.get(1).unwrap_or(left);
        let arena = &arenas[0];
        let ruleset = &rulesets[0];

        let session_id = init_battle(BattleConfig {
            left_character_id: left.id.clone(),
            right_character_id: right.id.clone(),
            arena_id: arena.id.clone(),
            ruleset_id: ruleset.season.clone(),
        })
        .expect("configured battle should start");

        let turn = step_battle(session_id).expect("configured battle should step");
        assert_eq!(turn.round, 1);
        assert_eq!(turn.turn, 1);
    }
}
