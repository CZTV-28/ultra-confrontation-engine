use crate::models::arena::Arena;
use crate::models::character::Character;
use crate::models::rules::Rules;
use crate::models::skill::Skill;
use std::fs;
use std::path::PathBuf;

pub struct Loader {
    assets_dir: PathBuf,
}

impl Loader {
    pub fn new() -> Self {
        let assets_dir = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("assets");
        Self { assets_dir }
    }

    pub fn load_rules(&self, season: &str) -> Result<Rules, String> {
        let path = self
            .assets_dir
            .join("rules")
            .join(format!("{}.json", season));
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("读取规则文件失败 {}: {}", path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析规则文件失败: {}", e))
    }

    pub fn load_arena(&self, arena_id: &str) -> Result<Arena, String> {
        let path = self
            .assets_dir
            .join("arenas")
            .join(format!("{}.json", arena_id));
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("读取地图文件失败 {}: {}", path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析地图文件失败: {}", e))
    }

    pub fn load_character(&self, char_id: &str) -> Result<Character, String> {
        let path = self
            .assets_dir
            .join("characters")
            .join(format!("{}.json", char_id));
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("读取角色文件失败 {}: {}", path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析角色文件失败: {}", e))
    }

    pub fn load_skill(&self, skill_id: &str) -> Result<Skill, String> {
        let path = self
            .assets_dir
            .join("skills")
            .join(format!("{}.json", skill_id));
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("读取技能文件失败 {}: {}", path.display(), e))?;
        serde_json::from_str(&content).map_err(|e| format!("解析技能文件失败: {}", e))
    }
}
