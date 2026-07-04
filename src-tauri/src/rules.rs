use crate::loader::Loader;
use crate::models::rules::Rules;

pub struct RuleEngine {
    pub rules: Rules,
}

impl RuleEngine {
    pub fn load(season: &str) -> Result<Self, String> {
        let loader = Loader::new();
        let rules = loader.load_rules(season)?;
        Ok(Self { rules })
    }

    pub fn max_rounds(&self) -> i32 {
        self.rules.r#match.max_rounds
    }

    pub fn max_turns_per_round(&self) -> i32 {
        self.rules.r#match.max_turns_per_round
    }

    pub fn arena_radius(&self) -> f64 {
        self.rules.arena.radius
    }

    pub fn max_hp(&self) -> i32 {
        self.rules.character_defaults.max_hp
    }

    pub fn max_mp(&self) -> i32 {
        self.rules.character_defaults.max_mp
    }

    pub fn basic_attack_damage(&self) -> i32 {
        self.rules.skill_constraints.basic_attack.base_damage
    }

    pub fn basic_attack_max_mp_boost(&self) -> i32 {
        self.rules.skill_constraints.basic_attack.max_mp_boost
    }

    pub fn basic_attack_damage_for_mp_boost(&self, mp_boost: i32) -> i32 {
        let spend = mp_boost.clamp(0, self.basic_attack_max_mp_boost());
        let spend = (spend / 5) * 5;

        match spend {
            0 => self.basic_attack_damage(),
            5 => 20,
            10 => 26,
            15 => 31,
            20 => 35,
            25 => 38,
            _ => 40,
        }
    }

    pub fn melee_default_mp_cost(&self) -> i32 {
        self.rules.skill_constraints.melee_skill.default_mp_cost
    }

    pub fn melee_max_mp_cost(&self) -> i32 {
        self.rules.skill_constraints.melee_skill.max_mp_cost
    }

    pub fn melee_max_damage(&self) -> i32 {
        self.rules.skill_constraints.melee_skill.max_damage
    }

    pub fn ranged_default_mp_cost(&self) -> i32 {
        self.rules.skill_constraints.ranged_skill.default_mp_cost
    }

    pub fn ranged_default_damage(&self) -> i32 {
        self.rules.skill_constraints.ranged_skill.default_damage
    }

    pub fn ranged_default_hit_rate(&self) -> f64 {
        self.rules.skill_constraints.ranged_skill.default_hit_rate
    }

    pub fn ranged_max_knockback(&self) -> i32 {
        self.rules.skill_constraints.ranged_skill.max_knockback
    }

    pub fn block_default_reduction(&self) -> f64 {
        self.rules
            .skill_constraints
            .block_skill
            .default_damage_reduction
    }

    pub fn block_max_reduction(&self) -> f64 {
        self.rules
            .skill_constraints
            .block_skill
            .max_damage_reduction
    }

    pub fn dodge_mp_cost(&self) -> i32 {
        self.rules.skill_constraints.dodge_skill.default_mp_cost
    }

    pub fn dodge_retreat_distance(&self) -> i32 {
        self.rules.skill_constraints.dodge_skill.retreat_distance
    }
}
