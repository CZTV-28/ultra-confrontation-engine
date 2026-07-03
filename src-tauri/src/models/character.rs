use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub creator: String,
    pub hp: i32,
    pub mp: i32,
    pub skills: CharacterSkills,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterSkills {
    pub melee: String,
    pub ranged: String,
    pub block: String,
    pub dodge: String,
    pub passive: Option<String>,
}
