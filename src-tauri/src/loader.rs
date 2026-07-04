use crate::models::arena::Arena;
use crate::models::character::Character;
use crate::models::rules::Rules;
use crate::models::skill::Skill;
use serde::de::DeserializeOwned;
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

    fn load_collection<T>(&self, folder: &str) -> Result<Vec<T>, String>
    where
        T: DeserializeOwned,
    {
        let dir = self.assets_dir.join(folder);
        let entries = fs::read_dir(&dir)
            .map_err(|e| format!("Failed to read asset directory {}: {}", dir.display(), e))?;

        let mut assets = Vec::new();
        for entry in entries.flatten() {
            let path = entry.path();
            if !path
                .extension()
                .map(|extension| extension == "json")
                .unwrap_or(false)
            {
                continue;
            }

            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read asset file {}: {}", path.display(), e))?;
            let asset = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse asset file {}: {}", path.display(), e))?;
            assets.push(asset);
        }

        Ok(assets)
    }

    pub fn load_characters(&self) -> Result<Vec<Character>, String> {
        self.load_collection("characters")
    }

    pub fn load_arenas(&self) -> Result<Vec<Arena>, String> {
        self.load_collection("arenas")
    }

    pub fn load_rulesets(&self) -> Result<Vec<Rules>, String> {
        self.load_collection("rules")
    }

    pub fn load_skills(&self) -> Result<Vec<Skill>, String> {
        self.load_collection("skills")
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
