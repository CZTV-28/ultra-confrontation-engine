use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rules {
    pub season: String,
    pub name: String,
    pub r#match: MatchConfig,
    pub arena: ArenaConfig,
    pub character_defaults: CharacterDefaults,
    pub skill_constraints: SkillConstraints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchConfig {
    pub max_rounds: i32,
    pub max_turns_per_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaConfig {
    #[serde(rename = "type")]
    pub arena_type: String,
    pub radius: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterDefaults {
    pub max_hp: i32,
    pub max_mp: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillConstraints {
    pub basic_attack: BasicAttackConstraints,
    pub melee_skill: MeleeConstraints,
    pub ranged_skill: RangedConstraints,
    pub block_skill: BlockConstraints,
    pub dodge_skill: DodgeConstraints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicAttackConstraints {
    pub base_damage: i32,
    pub max_mp_boost: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeleeConstraints {
    pub default_mp_cost: i32,
    pub max_mp_cost: i32,
    pub max_damage: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RangedConstraints {
    pub default_mp_cost: i32,
    pub default_damage: i32,
    pub min_mp_cost: i32,
    pub max_mp_cost: i32,
    pub min_damage: i32,
    pub max_damage: i32,
    pub default_hit_rate: f64,
    pub min_hit_rate: f64,
    pub max_hit_rate: f64,
    pub max_knockback: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockConstraints {
    pub default_damage_reduction: f64,
    pub max_damage_reduction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DodgeConstraints {
    pub default_mp_cost: i32,
    pub retreat_distance: i32,
}
