use crate::models::arena::Arena;
use crate::models::character::Character;
use crate::models::rules::Rules;
use crate::models::skill::Skill;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

const MP_STEP: i32 = 5;
const MELEE_MIN_DAMAGE: i32 = 10;
const RANGED_MIN_RANGE: i32 = 100;
const RANGED_MAX_RANGE: i32 = 200;
const BLOCK_MIN_REDUCTION: f64 = 0.5;
const DODGE_MIN_MP_COST: i32 = 25;
const DODGE_MAX_MP_COST: i32 = 80;
const DODGE_BOOSTED_RETREAT_DISTANCE: i32 = 200;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetValidationReport {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl AssetValidationReport {
    fn new() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    fn error(&mut self, message: impl Into<String>) {
        self.valid = false;
        self.errors.push(message.into());
    }

    fn warning(&mut self, message: impl Into<String>) {
        self.warnings.push(message.into());
    }
}

pub fn validate_assets(
    characters: &[Character],
    arenas: &[Arena],
    rulesets: &[Rules],
    skills: &[Skill],
) -> AssetValidationReport {
    let mut report = AssetValidationReport::new();

    if rulesets.is_empty() {
        report.error("assets/rules must contain at least one ruleset JSON.");
    }
    if characters.is_empty() {
        report.error("assets/characters must contain at least one character JSON.");
    }
    if arenas.is_empty() {
        report.error("assets/arenas must contain at least one arena JSON.");
    }
    if skills.is_empty() {
        report.error("assets/skills must contain at least one skill JSON.");
    }

    validate_unique_rulesets(rulesets, &mut report);
    validate_unique_arenas(arenas, &mut report);
    validate_unique_skills(skills, &mut report);
    validate_unique_characters(characters, &mut report);

    for rules in rulesets {
        validate_ruleset(rules, &mut report);
    }

    let Some(active_rules) = rulesets
        .iter()
        .find(|rules| rules.season == "S1")
        .or_else(|| rulesets.first())
    else {
        return report;
    };

    let skills_by_id: HashMap<&str, &Skill> = skills
        .iter()
        .map(|skill| (skill_id(skill), skill))
        .collect();
    for skill in skills {
        validate_skill(skill, active_rules, &mut report);
    }

    for arena in arenas {
        validate_arena(arena, active_rules, &mut report);
    }

    for character in characters {
        validate_character(character, active_rules, &skills_by_id, &mut report);
    }

    report
}

pub fn format_validation_errors(report: &AssetValidationReport) -> String {
    if report.errors.is_empty() {
        return "Asset validation passed.".to_string();
    }

    format!("Asset validation failed:\n{}", report.errors.join("\n"))
}

fn validate_unique_rulesets(rulesets: &[Rules], report: &mut AssetValidationReport) {
    let mut seen = HashSet::new();
    for rules in rulesets {
        let season = rules.season.trim();
        if season.is_empty() {
            report.error("Ruleset season cannot be empty.");
        } else if !seen.insert(season.to_string()) {
            report.error(format!("Duplicate ruleset season: {}", season));
        }
    }
}

fn validate_unique_arenas(arenas: &[Arena], report: &mut AssetValidationReport) {
    let mut seen = HashSet::new();
    for arena in arenas {
        let id = arena.id.trim();
        if id.is_empty() {
            report.error("Arena id cannot be empty.");
        } else if !seen.insert(id.to_string()) {
            report.error(format!("Duplicate arena id: {}", id));
        }
    }
}

fn validate_unique_skills(skills: &[Skill], report: &mut AssetValidationReport) {
    let mut seen = HashSet::new();
    for skill in skills {
        let id = skill_id(skill).trim();
        if id.is_empty() {
            report.error("Skill id cannot be empty.");
        } else if !seen.insert(id.to_string()) {
            report.error(format!("Duplicate skill id: {}", id));
        }
    }
}

fn validate_unique_characters(characters: &[Character], report: &mut AssetValidationReport) {
    let mut seen = HashSet::new();
    for character in characters {
        let id = character.id.trim();
        if id.is_empty() {
            report.error("Character id cannot be empty.");
        } else if !seen.insert(id.to_string()) {
            report.error(format!("Duplicate character id: {}", id));
        }
    }
}

fn validate_ruleset(rules: &Rules, report: &mut AssetValidationReport) {
    if rules.name.trim().is_empty() {
        report.error(format!("Ruleset {} name cannot be empty.", rules.season));
    }
    if rules.r#match.max_rounds <= 0 {
        report.error(format!(
            "Ruleset {} match.max_rounds must be greater than 0.",
            rules.season
        ));
    }
    if rules.r#match.max_turns_per_round < 0 {
        report.error(format!(
            "Ruleset {} match.max_turns_per_round cannot be negative.",
            rules.season
        ));
    }
    if rules.character_defaults.max_hp <= 0 || rules.character_defaults.max_mp <= 0 {
        report.error(format!(
            "Ruleset {} character default HP/MP must be greater than 0.",
            rules.season
        ));
    }
    if rules.arena.radius <= 0.0 {
        report.error(format!(
            "Ruleset {} arena.radius must be greater than 0.",
            rules.season
        ));
    }
    if rules.skill_constraints.basic_attack.base_damage < 0 {
        report.error(format!(
            "Ruleset {} basic_attack.base_damage cannot be negative.",
            rules.season
        ));
    }
    if rules.skill_constraints.basic_attack.max_mp_boost < 0 {
        report.error(format!(
            "Ruleset {} basic_attack.max_mp_boost cannot be negative.",
            rules.season
        ));
    }
    if rules.skill_constraints.melee_skill.max_mp_cost < 0
        || rules.skill_constraints.melee_skill.max_damage < 0
    {
        report.error(format!(
            "Ruleset {} melee skill max MP/damage cannot be negative.",
            rules.season
        ));
    }
    if rules.skill_constraints.ranged_skill.min_mp_cost
        > rules.skill_constraints.ranged_skill.max_mp_cost
    {
        report.error(format!(
            "Ruleset {} ranged min_mp_cost cannot exceed max_mp_cost.",
            rules.season
        ));
    }
    if rules.skill_constraints.ranged_skill.min_damage
        > rules.skill_constraints.ranged_skill.max_damage
    {
        report.error(format!(
            "Ruleset {} ranged min_damage cannot exceed max_damage.",
            rules.season
        ));
    }
    if rules.skill_constraints.ranged_skill.min_hit_rate
        > rules.skill_constraints.ranged_skill.max_hit_rate
    {
        report.error(format!(
            "Ruleset {} ranged min_hit_rate cannot exceed max_hit_rate.",
            rules.season
        ));
    }
    if !(0.0..=1.0).contains(&rules.skill_constraints.ranged_skill.min_hit_rate)
        || !(0.0..=1.0).contains(&rules.skill_constraints.ranged_skill.max_hit_rate)
    {
        report.error(format!(
            "Ruleset {} ranged hit-rate limits must be between 0 and 1.",
            rules.season
        ));
    }
    if !(0.0..=1.0).contains(&rules.skill_constraints.block_skill.default_damage_reduction)
        || !(0.0..=1.0).contains(&rules.skill_constraints.block_skill.max_damage_reduction)
    {
        report.error(format!(
            "Ruleset {} block reductions must be between 0 and 1.",
            rules.season
        ));
    }
}

fn validate_skill(skill: &Skill, rules: &Rules, report: &mut AssetValidationReport) {
    if skill_name(skill).trim().is_empty() {
        report.error(format!("Skill {} name cannot be empty.", skill_id(skill)));
    }

    match skill {
        Skill::Melee(skill) => {
            let constraints = &rules.skill_constraints.melee_skill;
            validate_optional_range(
                skill.min_mp_cost,
                skill.max_mp_cost,
                &format!("Skill {} MP range", skill.id),
                report,
            );
            validate_optional_range(
                skill.min_damage,
                skill.max_damage,
                &format!("Skill {} damage range", skill.id),
                report,
            );
            if skill.mp_cost < 0 || skill.mp_cost > constraints.max_mp_cost {
                report.error(format!(
                    "Melee skill {} mp_cost must be between 0 and {}.",
                    skill.id, constraints.max_mp_cost
                ));
            }
            if skill.mp_cost % MP_STEP != 0 {
                report.error(format!(
                    "Melee skill {} mp_cost must use {}-MP steps.",
                    skill.id, MP_STEP
                ));
            }
            if skill.damage < MELEE_MIN_DAMAGE || skill.damage > constraints.max_damage {
                report.error(format!(
                    "Melee skill {} damage must be between {} and {}.",
                    skill.id, MELEE_MIN_DAMAGE, constraints.max_damage
                ));
            }
        }
        Skill::Ranged(skill) => {
            let constraints = &rules.skill_constraints.ranged_skill;
            validate_optional_range(
                skill.min_mp_cost,
                skill.max_mp_cost,
                &format!("Skill {} MP range", skill.id),
                report,
            );
            validate_optional_range(
                skill.min_damage,
                skill.max_damage,
                &format!("Skill {} damage range", skill.id),
                report,
            );
            validate_optional_f64_range(
                skill.min_hit_rate,
                skill.max_hit_rate,
                &format!("Skill {} hit-rate range", skill.id),
                report,
            );
            validate_optional_range(
                skill.min_range,
                skill.max_range,
                &format!("Skill {} range", skill.id),
                report,
            );
            validate_optional_range(
                skill.min_knockback,
                skill.max_knockback,
                &format!("Skill {} knockback range", skill.id),
                report,
            );
            if skill.mp_cost < constraints.min_mp_cost || skill.mp_cost > constraints.max_mp_cost {
                report.error(format!(
                    "Ranged skill {} mp_cost must be between {} and {}.",
                    skill.id, constraints.min_mp_cost, constraints.max_mp_cost
                ));
            }
            if skill.mp_cost % MP_STEP != 0 {
                report.error(format!(
                    "Ranged skill {} mp_cost must use {}-MP steps.",
                    skill.id, MP_STEP
                ));
            }
            if skill.damage < constraints.min_damage || skill.damage > constraints.max_damage {
                report.error(format!(
                    "Ranged skill {} damage must be between {} and {}.",
                    skill.id, constraints.min_damage, constraints.max_damage
                ));
            }
            if skill.hit_rate < constraints.min_hit_rate
                || skill.hit_rate > constraints.max_hit_rate
            {
                report.error(format!(
                    "Ranged skill {} hit_rate must be between {} and {}.",
                    skill.id, constraints.min_hit_rate, constraints.max_hit_rate
                ));
            }
            if let Some(range) = skill.range {
                if !(RANGED_MIN_RANGE..=RANGED_MAX_RANGE).contains(&range) {
                    report.error(format!(
                        "Ranged skill {} range must be between {} and {}.",
                        skill.id, RANGED_MIN_RANGE, RANGED_MAX_RANGE
                    ));
                }
            } else {
                report.warning(format!(
                    "Ranged skill {} has no explicit range; S1 default {} is assumed.",
                    skill.id, RANGED_MIN_RANGE
                ));
            }
            if skill.knockback < 0 || skill.knockback > constraints.max_knockback {
                report.error(format!(
                    "Ranged skill {} knockback must be between 0 and {}.",
                    skill.id, constraints.max_knockback
                ));
            }
        }
        Skill::Block(skill) => {
            let constraints = &rules.skill_constraints.block_skill;
            if skill.mp_cost < 0 {
                report.error(format!(
                    "Block skill {} mp_cost cannot be negative.",
                    skill.id
                ));
            }
            if skill.mp_cost % MP_STEP != 0 {
                report.error(format!(
                    "Block skill {} mp_cost must use {}-MP steps.",
                    skill.id, MP_STEP
                ));
            }
            if skill.damage_reduction < BLOCK_MIN_REDUCTION
                || skill.damage_reduction > constraints.max_damage_reduction
            {
                report.error(format!(
                    "Block skill {} damage_reduction must be between {} and {}.",
                    skill.id, BLOCK_MIN_REDUCTION, constraints.max_damage_reduction
                ));
            }
        }
        Skill::Dodge(skill) => {
            let constraints = &rules.skill_constraints.dodge_skill;
            if skill.mp_cost < DODGE_MIN_MP_COST || skill.mp_cost > DODGE_MAX_MP_COST {
                report.error(format!(
                    "Dodge skill {} mp_cost must be between {} and {}.",
                    skill.id, DODGE_MIN_MP_COST, DODGE_MAX_MP_COST
                ));
            }
            if skill.mp_cost % MP_STEP != 0 {
                report.error(format!(
                    "Dodge skill {} mp_cost must use {}-MP steps.",
                    skill.id, MP_STEP
                ));
            }
            if skill.retreat_distance <= 0 {
                report.error(format!(
                    "Dodge skill {} retreat_distance must be greater than 0.",
                    skill.id
                ));
            }
            if skill.retreat_distance != constraints.retreat_distance
                && skill.retreat_distance != DODGE_BOOSTED_RETREAT_DISTANCE
            {
                report.warning(format!(
                    "Dodge skill {} retreat_distance differs from S1 allowed values {} or {}.",
                    skill.id, constraints.retreat_distance, DODGE_BOOSTED_RETREAT_DISTANCE
                ));
            }
        }
    }
}

fn validate_arena(arena: &Arena, rules: &Rules, report: &mut AssetValidationReport) {
    if arena.name.trim().is_empty() {
        report.error(format!("Arena {} name cannot be empty.", arena.id));
    }
    if arena.shape != rules.arena.arena_type {
        report.error(format!(
            "Arena {} shape must be {} for ruleset {}.",
            arena.id, rules.arena.arena_type, rules.season
        ));
    }
    if arena.radius <= 0.0 {
        report.error(format!("Arena {} radius must be greater than 0.", arena.id));
    }
    if arena.radius > rules.arena.radius {
        report.warning(format!(
            "Arena {} radius {} exceeds ruleset {} default radius {}.",
            arena.id, arena.radius, rules.season, rules.arena.radius
        ));
    }
    if arena.spawn_points.len() < 2 {
        report.error(format!(
            "Arena {} must define at least two spawn points.",
            arena.id
        ));
    }
    for (index, point) in arena.spawn_points.iter().enumerate() {
        let distance = (point.x * point.x + point.y * point.y).sqrt();
        if distance > arena.radius {
            report.error(format!(
                "Arena {} spawn point {} is outside radius {}.",
                arena.id, index, arena.radius
            ));
        }
    }
    if arena.spawn_points.len() >= 2 {
        let a = &arena.spawn_points[0];
        let b = &arena.spawn_points[1];
        if (a.x - b.x).abs() < f64::EPSILON && (a.y - b.y).abs() < f64::EPSILON {
            report.error(format!(
                "Arena {} first two spawn points cannot be identical.",
                arena.id
            ));
        }
    }
}

fn validate_character(
    character: &Character,
    rules: &Rules,
    skills_by_id: &HashMap<&str, &Skill>,
    report: &mut AssetValidationReport,
) {
    if character.name.trim().is_empty() {
        report.error(format!("Character {} name cannot be empty.", character.id));
    }
    if character.creator.trim().is_empty() {
        report.error(format!(
            "Character {} creator cannot be empty.",
            character.id
        ));
    }
    if character.hp != rules.character_defaults.max_hp {
        report.error(format!(
            "Character {} hp must be fixed at {} for this ruleset.",
            character.id, rules.character_defaults.max_hp
        ));
    }
    if character.mp != rules.character_defaults.max_mp {
        report.error(format!(
            "Character {} mp must be fixed at {} for this ruleset.",
            character.id, rules.character_defaults.max_mp
        ));
    }
    if character
        .description
        .as_deref()
        .unwrap_or("")
        .trim()
        .is_empty()
    {
        report.warning(format!("Character {} has no description.", character.id));
    }

    validate_skill_ref(
        &character.id,
        "melee",
        &character.skills.melee,
        "melee",
        skills_by_id,
        report,
    );
    validate_skill_ref(
        &character.id,
        "ranged",
        &character.skills.ranged,
        "ranged",
        skills_by_id,
        report,
    );
    validate_skill_ref(
        &character.id,
        "block",
        &character.skills.block,
        "block",
        skills_by_id,
        report,
    );
    validate_skill_ref(
        &character.id,
        "dodge",
        &character.skills.dodge,
        "dodge",
        skills_by_id,
        report,
    );

    validate_character_passive(character, report);
}

fn validate_character_passive(character: &Character, report: &mut AssetValidationReport) {
    let passive_ref = character
        .skills
        .passive
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    match (passive_ref, character.passive.as_ref()) {
        (None, None) => {}
        (Some(passive_id), None) => {
            report.error(format!(
                "Character {} references passive {}, but no passive object is defined.",
                character.id, passive_id
            ));
        }
        (None, Some(passive)) => {
            report.error(format!(
                "Character {} defines passive {}, but skills.passive is null.",
                character.id, passive.id
            ));
        }
        (Some(passive_id), Some(passive)) => {
            if passive.id != passive_id {
                report.error(format!(
                    "Character {} skills.passive {} must match passive.id {}.",
                    character.id, passive_id, passive.id
                ));
            }
            if !is_file_safe_id(&passive.id) {
                report.error(format!(
                    "Character {} passive id {} is not file-safe.",
                    character.id, passive.id
                ));
            }
            if passive.name.trim().is_empty() {
                report.error(format!(
                    "Character {} passive name cannot be empty.",
                    character.id
                ));
            }
            if passive.passive_type != "passive" {
                report.error(format!(
                    "Character {} passive.type must be passive.",
                    character.id
                ));
            }
            if passive.timing != "before_simulation_persistent" {
                report.error(format!(
                    "Character {} passive timing must be before_simulation_persistent.",
                    character.id
                ));
            }
            if !passive.single_effect {
                report.error(format!(
                    "Character {} passive must declare single_effect true.",
                    character.id
                ));
            }
            if !passive.official_review_required {
                report.error(format!(
                    "Character {} custom passive must require official review.",
                    character.id
                ));
            }
            if passive.effect.category.trim().is_empty() {
                report.error(format!(
                    "Character {} passive effect category cannot be empty.",
                    character.id
                ));
            }
            if passive.effect.name.trim().is_empty() {
                report.error(format!(
                    "Character {} passive effect name cannot be empty.",
                    character.id
                ));
            }
            if passive.effect.description.trim().is_empty() {
                report.error(format!(
                    "Character {} passive effect description cannot be empty.",
                    character.id
                ));
            }
            if passive
                .effect
                .balance_notes
                .as_deref()
                .unwrap_or("")
                .trim()
                .is_empty()
            {
                report.error(format!(
                    "Character {} custom passive must include balance_notes for review.",
                    character.id
                ));
            }
        }
    }
}

fn validate_skill_ref(
    character_id: &str,
    slot: &str,
    skill_id_value: &str,
    expected_type: &str,
    skills_by_id: &HashMap<&str, &Skill>,
    report: &mut AssetValidationReport,
) {
    let skill_id_value = skill_id_value.trim();
    if skill_id_value.is_empty() {
        report.error(format!(
            "Character {} skill slot {} cannot be empty.",
            character_id, slot
        ));
        return;
    }

    let Some(skill) = skills_by_id.get(skill_id_value) else {
        report.error(format!(
            "Character {} references missing {} skill: {}.",
            character_id, slot, skill_id_value
        ));
        return;
    };

    let actual_type = skill_type(skill);
    if actual_type != expected_type {
        report.error(format!(
            "Character {} slot {} expects {}, but skill {} is {}.",
            character_id, slot, expected_type, skill_id_value, actual_type
        ));
    }
}

fn validate_optional_range(
    min: Option<i32>,
    max: Option<i32>,
    label: &str,
    report: &mut AssetValidationReport,
) {
    if let (Some(min), Some(max)) = (min, max) {
        if min > max {
            report.error(format!("{} min cannot exceed max.", label));
        }
    }
}

fn validate_optional_f64_range(
    min: Option<f64>,
    max: Option<f64>,
    label: &str,
    report: &mut AssetValidationReport,
) {
    if let (Some(min), Some(max)) = (min, max) {
        if min > max {
            report.error(format!("{} min cannot exceed max.", label));
        }
    }
}

fn skill_id(skill: &Skill) -> &str {
    match skill {
        Skill::Melee(skill) => &skill.id,
        Skill::Ranged(skill) => &skill.id,
        Skill::Block(skill) => &skill.id,
        Skill::Dodge(skill) => &skill.id,
    }
}

fn skill_name(skill: &Skill) -> &str {
    match skill {
        Skill::Melee(skill) => &skill.name,
        Skill::Ranged(skill) => &skill.name,
        Skill::Block(skill) => &skill.name,
        Skill::Dodge(skill) => &skill.name,
    }
}

fn skill_type(skill: &Skill) -> &'static str {
    match skill {
        Skill::Melee(_) => "melee",
        Skill::Ranged(_) => "ranged",
        Skill::Block(_) => "block",
        Skill::Dodge(_) => "dodge",
    }
}

fn is_file_safe_id(value: &str) -> bool {
    let len = value.len();
    len >= 3
        && len <= 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_' || byte == b'-')
        && value
            .bytes()
            .next()
            .is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
}
