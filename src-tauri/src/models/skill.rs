use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Skill {
    #[serde(rename = "melee")]
    Melee(MeleeSkill),
    #[serde(rename = "ranged")]
    Ranged(RangedSkill),
    #[serde(rename = "block")]
    Block(BlockSkill),
    #[serde(rename = "dodge")]
    Dodge(DodgeSkill),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeleeSkill {
    pub id: String,
    pub name: String,
    pub mp_cost: i32,
    pub damage: i32,
    pub min_mp_cost: Option<i32>,
    pub max_mp_cost: Option<i32>,
    pub min_damage: Option<i32>,
    pub max_damage: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RangedSkill {
    pub id: String,
    pub name: String,
    pub mp_cost: i32,
    pub damage: i32,
    pub hit_rate: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub range: Option<i32>,
    pub knockback: i32,
    pub min_mp_cost: Option<i32>,
    pub max_mp_cost: Option<i32>,
    pub min_damage: Option<i32>,
    pub max_damage: Option<i32>,
    pub min_hit_rate: Option<f64>,
    pub max_hit_rate: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min_range: Option<i32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_range: Option<i32>,
    pub min_knockback: Option<i32>,
    pub max_knockback: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockSkill {
    pub id: String,
    pub name: String,
    pub mp_cost: i32,
    pub damage_reduction: f64,
    pub max_damage_reduction: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DodgeSkill {
    pub id: String,
    pub name: String,
    pub mp_cost: i32,
    pub retreat_distance: i32,
}
