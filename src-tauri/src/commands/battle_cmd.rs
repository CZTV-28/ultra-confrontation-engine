use crate::battle::{Action, BattleEngine};
use crate::loader::Loader;
use crate::models::arena::Arena;
use crate::models::character::Character;
use crate::models::rules::Rules;
use crate::models::skill::Skill;
use crate::rules::RuleEngine;
use crate::validator::{
    format_validation_errors, validate_assets as validate_asset_library, AssetValidationReport,
};
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
    official_assets: OfficialImportAssets,
}

#[derive(Debug, Deserialize)]
struct OfficialImportReview {
    official_decision: String,
    #[serde(default)]
    errors: usize,
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
    characters.sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
    Ok(characters)
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
    }

    let mut written_files = Vec::new();
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
    }

    Ok(OfficialImportResult {
        character_id: character.id,
        skill_ids,
        passive_id,
        written_files,
        validation,
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
    let (winner, loss_reason, turns, rounds_played, final_hp_a, final_hp_b) = {
        let sessions = SESSIONS.lock().unwrap();
        let session = sessions.get(&session_id).ok_or("Session not found")?;

        let winner = session
            .engine
            .get_winner()
            .unwrap_or_else(|| "draw".to_string());
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
        let arenas = list_arenas().expect("arenas should load");
        let rulesets = list_rulesets().expect("rulesets should load");
        let skills = list_skills().expect("skills should load");

        assert!(!characters.is_empty());
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
