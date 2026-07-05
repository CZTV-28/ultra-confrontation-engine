use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    pub name: String,
    pub creator: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub portrait: Option<CharacterPortrait>,
    pub hp: i32,
    pub mp: i32,
    pub skills: CharacterSkills,
    #[serde(default)]
    pub passive: Option<CharacterPassive>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterPortrait {
    pub file_name: String,
    pub mime_type: String,
    pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterSkills {
    pub melee: String,
    pub ranged: String,
    pub block: String,
    pub dodge: String,
    pub passive: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CharacterPassive {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub passive_type: String,
    pub timing: String,
    pub single_effect: bool,
    pub effect: CharacterPassiveEffect,
    pub official_review_required: bool,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CharacterPassiveEffect {
    pub category: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub trigger_condition: Option<String>,
    #[serde(default)]
    pub value: Option<f64>,
    #[serde(default)]
    pub value_unit: Option<String>,
    #[serde(default)]
    pub balance_notes: Option<String>,
}
