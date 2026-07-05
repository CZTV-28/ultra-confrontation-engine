use crate::models::arena::Arena;
use crate::models::character::{Character, CharacterPassive};
use crate::models::passive::PassiveEffectType;
use crate::models::skill::Skill;
use crate::physics::{self, Position};
use crate::rules::RuleEngine;
use rand::Rng;

#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    Wait,
    MoveToward,
    MoveAway,
    BasicAttack {
        mp_boost: i32,
    },
    MeleeSkill {
        mp_cost: i32,
        damage: i32,
    },
    RangedSkill {
        mp_cost: i32,
        damage: i32,
        hit_rate: f64,
        knockback: i32,
    },
    Block {
        mp_cost: i32,
        reduction: f64,
    },
    Dodge,
}

#[derive(Debug, Clone)]
pub struct ActiveEffect {
    pub effect_type: PassiveEffectType,
    pub value: f64,
    pub remaining_turns: i32,
}

#[derive(Debug, Clone)]
pub struct FighterState {
    pub hp: i32,
    pub mp: i32,
    pub max_hp: i32,
    pub max_mp: i32,
    pub position: Position,
    pub blocked: bool,
    pub dodged: bool,
    pub passive: Option<CharacterPassive>,
    pub active_effects: Vec<ActiveEffect>,
}

#[derive(Debug, Clone)]
pub struct TurnResult {
    pub round: i32,
    pub turn: i32,
    pub action_a: Action,
    pub action_b: Action,
    pub damage_to_a: i32,
    pub damage_to_b: i32,
    pub hp_a_after: i32,
    pub hp_b_after: i32,
    pub mp_a_after: i32,
    pub mp_b_after: i32,
    pub position_a_after: Position,
    pub position_b_after: Position,
}

pub struct BattleEngine {
    pub fighter_a: FighterState,
    pub fighter_b: FighterState,
    pub rules: RuleEngine,
    pub character_a: Character,
    pub character_b: Character,
    pub skill_melee_a: Skill,
    pub skill_ranged_a: Skill,
    pub skill_block_a: Skill,
    pub skill_melee_b: Skill,
    pub skill_ranged_b: Skill,
    pub skill_block_b: Skill,
    pub arena: Arena,
    pub round: i32,
    pub turn: i32,
    pub max_rounds: i32,
    pub max_turns: i32,
    pub arena_radius: f64,
}

impl BattleEngine {
    pub fn new(
        char_a: Character,
        char_b: Character,
        skill_melee_a: Skill,
        skill_ranged_a: Skill,
        skill_block_a: Skill,
        skill_melee_b: Skill,
        skill_ranged_b: Skill,
        skill_block_b: Skill,
        arena: Arena,
        rules: RuleEngine,
    ) -> Self {
        let max_hp = rules.max_hp();
        let max_mp = rules.max_mp();
        let arena_radius = arena.radius;
        let max_rounds = rules.max_rounds();
        let max_turns = rules.max_turns_per_round();
        let spawn_a = arena
            .spawn_points
            .get(0)
            .map(|position| Position {
                x: position.x,
                y: position.y,
            })
            .unwrap_or(Position { x: -100.0, y: 0.0 });
        let spawn_b = arena
            .spawn_points
            .get(1)
            .map(|position| Position {
                x: position.x,
                y: position.y,
            })
            .unwrap_or(Position { x: 100.0, y: 0.0 });

        Self {
            fighter_a: FighterState {
                hp: max_hp,
                mp: max_mp,
                max_hp,
                max_mp,
                position: spawn_a,
                blocked: false,
                dodged: false,
                passive: char_a.passive.clone(),
                active_effects: Vec::new(),
            },
            fighter_b: FighterState {
                hp: max_hp,
                mp: max_mp,
                max_hp,
                max_mp,
                position: spawn_b,
                blocked: false,
                dodged: false,
                passive: char_b.passive.clone(),
                active_effects: Vec::new(),
            },
            rules,
            character_a: char_a,
            character_b: char_b,
            skill_melee_a,
            skill_ranged_a,
            skill_block_a,
            skill_melee_b,
            skill_ranged_b,
            skill_block_b,
            arena,
            round: 1,
            turn: 1,
            max_rounds,
            max_turns,
            arena_radius,
        }
    }

    fn tick_effects(fighter: &mut FighterState) {
        let mut bleed_dmg = 0;
        fighter
            .active_effects
            .retain_mut(|effect| match effect.effect_type {
                PassiveEffectType::Bleeding => {
                    bleed_dmg += effect.value as i32;
                    effect.remaining_turns -= 1;
                    effect.remaining_turns > 0
                }
                PassiveEffectType::Slow => {
                    effect.remaining_turns -= 1;
                    effect.remaining_turns > 0
                }
                PassiveEffectType::Vulnerable => {
                    effect.remaining_turns -= 1;
                    effect.remaining_turns > 0
                }
                _ => {
                    effect.remaining_turns -= 1;
                    effect.remaining_turns > 0
                }
            });
        fighter.hp -= bleed_dmg;
        if fighter.hp < 0 {
            fighter.hp = 0;
        }
    }

    fn apply_debuff(
        _attacker: &FighterState,
        _target: &mut FighterState,
        _damage: i32,
        _rng: &mut impl Rng,
    ) {
    }

    fn get_speed_mult(fighter: &FighterState) -> f64 {
        for effect in &fighter.active_effects {
            if effect.effect_type == PassiveEffectType::Slow {
                return 1.0 - effect.value;
            }
        }
        1.0
    }

    fn get_damage_mult(_attacker: &FighterState, target: &FighterState, _distance: f64) -> f64 {
        let mut mult = 1.0;
        for effect in &target.active_effects {
            if effect.effect_type == PassiveEffectType::Vulnerable {
                mult *= 1.0 + effect.value;
            }
        }
        mult
    }

    pub fn execute_turn(
        &mut self,
        action_a: Action,
        action_b: Action,
        rng: &mut impl Rng,
    ) -> TurnResult {
        self.fighter_a.blocked = false;
        self.fighter_b.blocked = false;
        self.fighter_a.dodged = false;
        self.fighter_b.dodged = false;

        Self::tick_effects(&mut self.fighter_a);
        Self::tick_effects(&mut self.fighter_b);

        let speed_a = Self::get_speed_mult(&self.fighter_a);
        let speed_b = Self::get_speed_mult(&self.fighter_b);

        let dist = physics::distance(&self.fighter_a.position, &self.fighter_b.position);

        let effective_action_a = self.process_action_a(&action_a, dist, speed_a);
        let effective_action_b = self.process_action_b(&action_b, dist, speed_b);

        let dist_after_move = physics::distance(&self.fighter_a.position, &self.fighter_b.position);

        let (damage_by_a, knockback_a) = self.resolve_attack(
            &effective_action_a,
            &self.fighter_a,
            &self.skill_melee_a,
            &self.skill_ranged_a,
            dist_after_move,
            rng,
        );
        let (damage_by_b, knockback_b) = self.resolve_attack(
            &effective_action_b,
            &self.fighter_b,
            &self.skill_melee_b,
            &self.skill_ranged_b,
            dist_after_move,
            rng,
        );

        if knockback_a > 0.0 {
            let dx = self.fighter_b.position.x - self.fighter_a.position.x;
            let dy = self.fighter_b.position.y - self.fighter_a.position.y;
            let len = (dx * dx + dy * dy).sqrt();
            if len > 0.0 {
                self.fighter_b.position.x += dx / len * knockback_a;
                self.fighter_b.position.y += dy / len * knockback_a;
            }
        }
        if knockback_b > 0.0 {
            let dx = self.fighter_a.position.x - self.fighter_b.position.x;
            let dy = self.fighter_a.position.y - self.fighter_b.position.y;
            let len = (dx * dx + dy * dy).sqrt();
            if len > 0.0 {
                self.fighter_a.position.x += dx / len * knockback_b;
                self.fighter_a.position.y += dy / len * knockback_b;
            }
        }

        let mut damage_to_b = if self.fighter_b.blocked {
            let reduction = self.get_block_reduction(&effective_action_b);
            (damage_by_a as f64 * (1.0 - reduction)) as i32
        } else {
            damage_by_a
        };

        let mut damage_to_a = if self.fighter_a.blocked {
            let reduction = self.get_block_reduction(&effective_action_a);
            (damage_by_b as f64 * (1.0 - reduction)) as i32
        } else {
            damage_by_b
        };

        if self.fighter_b.dodged {
            damage_to_b = 0;
        }
        if self.fighter_a.dodged {
            damage_to_a = 0;
        }

        let mult_a = Self::get_damage_mult(&self.fighter_a, &self.fighter_b, dist_after_move);
        let mult_b = Self::get_damage_mult(&self.fighter_b, &self.fighter_a, dist_after_move);
        damage_to_b = (damage_to_b as f64 * mult_a) as i32;
        damage_to_a = (damage_to_a as f64 * mult_b) as i32;

        self.fighter_a.hp -= damage_to_a;
        self.fighter_b.hp -= damage_to_b;

        if self.fighter_a.hp < 0 {
            self.fighter_a.hp = 0;
        }
        if self.fighter_b.hp < 0 {
            self.fighter_b.hp = 0;
        }

        if damage_by_a > 0 && !self.fighter_b.blocked && !self.fighter_b.dodged {
            Self::apply_debuff(&self.fighter_a, &mut self.fighter_b, damage_to_b, rng);
        }
        if damage_by_b > 0 && !self.fighter_a.blocked && !self.fighter_a.dodged {
            Self::apply_debuff(&self.fighter_b, &mut self.fighter_a, damage_to_a, rng);
        }

        let result = TurnResult {
            round: self.round,
            turn: self.turn,
            action_a: effective_action_a,
            action_b: effective_action_b,
            damage_to_a,
            damage_to_b,
            hp_a_after: self.fighter_a.hp,
            hp_b_after: self.fighter_b.hp,
            mp_a_after: self.fighter_a.mp,
            mp_b_after: self.fighter_b.mp,
            position_a_after: self.fighter_a.position.clone(),
            position_b_after: self.fighter_b.position.clone(),
        };

        if self.max_turns > 0 && self.turn >= self.max_turns {
            self.round += 1;
            self.turn = 1;
        } else {
            self.turn += 1;
        }

        result
    }

    fn process_action_a(&mut self, action: &Action, _dist: f64, speed_mult: f64) -> Action {
        let step = (50.0 * speed_mult) as i32;
        match action {
            Action::MoveToward => {
                self.fighter_a.position = physics::move_toward(
                    &self.fighter_a.position,
                    &self.fighter_b.position,
                    step as f64,
                );
                Action::MoveToward
            }
            Action::MoveAway => {
                let dx = self.fighter_a.position.x - self.fighter_b.position.x;
                let dy = self.fighter_a.position.y - self.fighter_b.position.y;
                let len = (dx * dx + dy * dy).sqrt();
                if len > 0.0 {
                    self.fighter_a.position.x += dx / len * step as f64;
                    self.fighter_a.position.y += dy / len * step as f64;
                }
                Action::MoveAway
            }
            Action::Block { mp_cost, reduction } => {
                if self.fighter_a.mp >= *mp_cost {
                    self.fighter_a.mp -= *mp_cost;
                    self.fighter_a.blocked = true;
                    Action::Block {
                        mp_cost: *mp_cost,
                        reduction: *reduction,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::Dodge => {
                if self.fighter_a.mp >= self.rules.dodge_mp_cost() {
                    self.fighter_a.mp -= self.rules.dodge_mp_cost();
                    self.fighter_a.dodged = true;
                    let dx = self.fighter_a.position.x - self.fighter_b.position.x;
                    let dy = self.fighter_a.position.y - self.fighter_b.position.y;
                    let len = (dx * dx + dy * dy).sqrt();
                    if len > 0.0 {
                        let retreat = self.rules.dodge_retreat_distance() as f64;
                        self.fighter_a.position.x += dx / len * retreat;
                        self.fighter_a.position.y += dy / len * retreat;
                    }
                    Action::Dodge
                } else {
                    Action::Wait
                }
            }
            Action::BasicAttack { mp_boost } => {
                let requested_boost = (*mp_boost).clamp(0, self.rules.basic_attack_max_mp_boost());
                let requested_boost = (requested_boost / 5) * 5;
                let actual_boost = if self.fighter_a.mp >= requested_boost {
                    requested_boost
                } else {
                    0
                };
                self.fighter_a.mp -= actual_boost;
                Action::BasicAttack {
                    mp_boost: actual_boost,
                }
            }
            Action::MeleeSkill { mp_cost, damage } => {
                if self.fighter_a.mp >= *mp_cost {
                    self.fighter_a.mp -= *mp_cost;
                    Action::MeleeSkill {
                        mp_cost: *mp_cost,
                        damage: *damage,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::RangedSkill {
                mp_cost,
                damage,
                hit_rate,
                knockback,
            } => {
                if self.fighter_a.mp >= *mp_cost {
                    self.fighter_a.mp -= *mp_cost;
                    Action::RangedSkill {
                        mp_cost: *mp_cost,
                        damage: *damage,
                        hit_rate: *hit_rate,
                        knockback: *knockback,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::Wait => Action::Wait,
        }
    }

    fn process_action_b(&mut self, action: &Action, _dist: f64, speed_mult: f64) -> Action {
        let step = (50.0 * speed_mult) as i32;
        match action {
            Action::MoveToward => {
                self.fighter_b.position = physics::move_toward(
                    &self.fighter_b.position,
                    &self.fighter_a.position,
                    step as f64,
                );
                Action::MoveToward
            }
            Action::MoveAway => {
                let dx = self.fighter_b.position.x - self.fighter_a.position.x;
                let dy = self.fighter_b.position.y - self.fighter_a.position.y;
                let len = (dx * dx + dy * dy).sqrt();
                if len > 0.0 {
                    self.fighter_b.position.x += dx / len * step as f64;
                    self.fighter_b.position.y += dy / len * step as f64;
                }
                Action::MoveAway
            }
            Action::Block { mp_cost, reduction } => {
                if self.fighter_b.mp >= *mp_cost {
                    self.fighter_b.mp -= *mp_cost;
                    self.fighter_b.blocked = true;
                    Action::Block {
                        mp_cost: *mp_cost,
                        reduction: *reduction,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::Dodge => {
                if self.fighter_b.mp >= self.rules.dodge_mp_cost() {
                    self.fighter_b.mp -= self.rules.dodge_mp_cost();
                    self.fighter_b.dodged = true;
                    let dx = self.fighter_b.position.x - self.fighter_a.position.x;
                    let dy = self.fighter_b.position.y - self.fighter_a.position.y;
                    let len = (dx * dx + dy * dy).sqrt();
                    if len > 0.0 {
                        let retreat = self.rules.dodge_retreat_distance() as f64;
                        self.fighter_b.position.x += dx / len * retreat;
                        self.fighter_b.position.y += dy / len * retreat;
                    }
                    Action::Dodge
                } else {
                    Action::Wait
                }
            }
            Action::BasicAttack { mp_boost } => {
                let requested_boost = (*mp_boost).clamp(0, self.rules.basic_attack_max_mp_boost());
                let requested_boost = (requested_boost / 5) * 5;
                let actual_boost = if self.fighter_b.mp >= requested_boost {
                    requested_boost
                } else {
                    0
                };
                self.fighter_b.mp -= actual_boost;
                Action::BasicAttack {
                    mp_boost: actual_boost,
                }
            }
            Action::MeleeSkill { mp_cost, damage } => {
                if self.fighter_b.mp >= *mp_cost {
                    self.fighter_b.mp -= *mp_cost;
                    Action::MeleeSkill {
                        mp_cost: *mp_cost,
                        damage: *damage,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::RangedSkill {
                mp_cost,
                damage,
                hit_rate,
                knockback,
            } => {
                if self.fighter_b.mp >= *mp_cost {
                    self.fighter_b.mp -= *mp_cost;
                    Action::RangedSkill {
                        mp_cost: *mp_cost,
                        damage: *damage,
                        hit_rate: *hit_rate,
                        knockback: *knockback,
                    }
                } else {
                    Action::Wait
                }
            }
            Action::Wait => Action::Wait,
        }
    }

    fn resolve_attack(
        &self,
        action: &Action,
        _attacker: &FighterState,
        _melee_skill: &Skill,
        _ranged_skill: &Skill,
        dist: f64,
        rng: &mut impl Rng,
    ) -> (i32, f64) {
        match action {
            Action::BasicAttack { mp_boost } => {
                if dist <= 10.0 {
                    let dmg = self.rules.basic_attack_damage_for_mp_boost(*mp_boost);
                    (dmg, 0.0)
                } else {
                    (0, 0.0)
                }
            }
            Action::MeleeSkill { damage, .. } => {
                if dist <= 10.0 {
                    (*damage, 0.0)
                } else {
                    (0, 0.0)
                }
            }
            Action::RangedSkill {
                damage,
                hit_rate,
                knockback,
                ..
            } => {
                if dist <= 200.0 {
                    let hit_roll: f64 = rng.gen();
                    if hit_roll <= *hit_rate {
                        (*damage, *knockback as f64)
                    } else {
                        (0, 0.0)
                    }
                } else {
                    (0, 0.0)
                }
            }
            _ => (0, 0.0),
        }
    }

    fn get_block_reduction(&self, action: &Action) -> f64 {
        match action {
            Action::Block { reduction, .. } => *reduction,
            _ => self.rules.block_default_reduction(),
        }
    }

    pub fn is_finished(&self) -> bool {
        self.fighter_a.hp <= 0
            || self.fighter_b.hp <= 0
            || physics::is_out_of_bounds(&self.fighter_a.position, self.arena_radius)
            || physics::is_out_of_bounds(&self.fighter_b.position, self.arena_radius)
            || self.round > self.max_rounds
    }

    pub fn get_winner(&self) -> Option<String> {
        let a_dead = self.fighter_a.hp <= 0
            || physics::is_out_of_bounds(&self.fighter_a.position, self.arena_radius);
        let b_dead = self.fighter_b.hp <= 0
            || physics::is_out_of_bounds(&self.fighter_b.position, self.arena_radius);

        if a_dead && b_dead {
            return Some("draw".to_string());
        }
        if a_dead {
            return Some(self.character_b.name.clone());
        }
        if b_dead {
            return Some(self.character_a.name.clone());
        }
        if self.round > self.max_rounds {
            if self.fighter_a.hp > self.fighter_b.hp {
                return Some(self.character_a.name.clone());
            } else if self.fighter_b.hp > self.fighter_a.hp {
                return Some(self.character_b.name.clone());
            } else {
                return Some("draw".to_string());
            }
        }
        None
    }

    pub fn loss_reason(&self, fighter: &FighterState, name: &str) -> Option<String> {
        if fighter.hp <= 0 {
            return Some(format!("{} 血量归零", name));
        }
        if physics::is_out_of_bounds(&fighter.position, self.arena_radius) {
            return Some(format!("{} 坠入虚空", name));
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::arena::{Arena, Position as ArenaPosition};
    use crate::models::character::{Character, CharacterSkills};
    use crate::models::rules::{
        ArenaConfig, BasicAttackConstraints, BlockConstraints, CharacterDefaults, DodgeConstraints,
        MatchConfig, MeleeConstraints, RangedConstraints, Rules, SkillConstraints,
    };
    use crate::models::skill::{BlockSkill, MeleeSkill, RangedSkill};
    use rand::rngs::StdRng;
    use rand::SeedableRng;

    fn character(name: &str) -> Character {
        Character {
            id: name.to_string(),
            project_name: None,
            name: name.to_string(),
            creator: "test".to_string(),
            description: None,
            portrait: None,
            hp: 500,
            mp: 250,
            skills: CharacterSkills {
                melee: "slash".to_string(),
                ranged: "bolt".to_string(),
                block: "basic_block".to_string(),
                dodge: "basic_dodge".to_string(),
                passive: None,
            },
            passive: None,
        }
    }

    fn rules(max_rounds: i32, max_turns: i32) -> RuleEngine {
        RuleEngine {
            rules: Rules {
                season: "S1".to_string(),
                name: "起源".to_string(),
                r#match: MatchConfig {
                    max_rounds,
                    max_turns_per_round: max_turns,
                },
                arena: ArenaConfig {
                    arena_type: "circle".to_string(),
                    radius: 250.0,
                },
                character_defaults: CharacterDefaults {
                    max_hp: 500,
                    max_mp: 250,
                },
                skill_constraints: SkillConstraints {
                    basic_attack: BasicAttackConstraints {
                        base_damage: 10,
                        max_mp_boost: 30,
                    },
                    melee_skill: MeleeConstraints {
                        default_mp_cost: 0,
                        max_mp_cost: 50,
                        max_damage: 75,
                    },
                    ranged_skill: RangedConstraints {
                        default_mp_cost: 50,
                        default_damage: 75,
                        min_mp_cost: 25,
                        max_mp_cost: 100,
                        min_damage: 25,
                        max_damage: 150,
                        default_hit_rate: 0.6,
                        min_hit_rate: 0.6,
                        max_hit_rate: 1.0,
                        max_knockback: 100,
                    },
                    block_skill: BlockConstraints {
                        default_damage_reduction: 0.5,
                        max_damage_reduction: 0.75,
                    },
                    dodge_skill: DodgeConstraints {
                        default_mp_cost: 25,
                        retreat_distance: 100,
                    },
                },
            },
        }
    }

    fn melee_skill() -> Skill {
        Skill::Melee(MeleeSkill {
            id: "slash".to_string(),
            name: "Slash".to_string(),
            mp_cost: 0,
            damage: 25,
            min_mp_cost: None,
            max_mp_cost: None,
            min_damage: None,
            max_damage: None,
        })
    }

    fn ranged_skill() -> Skill {
        Skill::Ranged(RangedSkill {
            id: "bolt".to_string(),
            name: "Bolt".to_string(),
            mp_cost: 50,
            damage: 75,
            hit_rate: 1.0,
            range: Some(100),
            knockback: 0,
            min_mp_cost: None,
            max_mp_cost: None,
            min_damage: None,
            max_damage: None,
            min_hit_rate: None,
            max_hit_rate: None,
            min_range: None,
            max_range: None,
            min_knockback: None,
            max_knockback: None,
        })
    }

    fn block_skill() -> Skill {
        Skill::Block(BlockSkill {
            id: "basic_block".to_string(),
            name: "Block".to_string(),
            mp_cost: 0,
            damage_reduction: 0.5,
            max_damage_reduction: None,
        })
    }

    fn arena() -> Arena {
        Arena {
            id: "circle_500".to_string(),
            name: "Circle500".to_string(),
            shape: "circle".to_string(),
            radius: 250.0,
            thumbnail: None,
            spawn_points: vec![
                ArenaPosition { x: -100.0, y: 0.0 },
                ArenaPosition { x: 100.0, y: 0.0 },
            ],
        }
    }

    fn engine(max_rounds: i32, max_turns: i32) -> BattleEngine {
        BattleEngine::new(
            character("A"),
            character("B"),
            melee_skill(),
            ranged_skill(),
            block_skill(),
            melee_skill(),
            ranged_skill(),
            block_skill(),
            arena(),
            rules(max_rounds, max_turns),
        )
    }

    fn put_fighters_in_melee_range(engine: &mut BattleEngine) {
        engine.fighter_a.position = Position { x: 0.0, y: 0.0 };
        engine.fighter_b.position = Position { x: 5.0, y: 0.0 };
    }

    #[test]
    fn unaffordable_melee_skill_becomes_wait_without_damage() {
        let mut engine = engine(1, 10);
        let mut rng = StdRng::seed_from_u64(1);
        put_fighters_in_melee_range(&mut engine);
        engine.fighter_a.mp = 0;

        let result = engine.execute_turn(
            Action::MeleeSkill {
                mp_cost: 10,
                damage: 35,
            },
            Action::Wait,
            &mut rng,
        );

        assert_eq!(result.action_a, Action::Wait);
        assert_eq!(result.damage_to_b, 0);
        assert_eq!(result.hp_b_after, 500);
        assert_eq!(result.mp_a_after, 0);
    }

    #[test]
    fn basic_attack_boost_requires_full_step_mp() {
        let mut engine = engine(1, 10);
        let mut rng = StdRng::seed_from_u64(1);
        put_fighters_in_melee_range(&mut engine);
        engine.fighter_a.mp = 1;

        let result =
            engine.execute_turn(Action::BasicAttack { mp_boost: 5 }, Action::Wait, &mut rng);

        assert_eq!(result.action_a, Action::BasicAttack { mp_boost: 0 });
        assert_eq!(result.damage_to_b, 10);
        assert_eq!(result.hp_b_after, 490);
        assert_eq!(result.mp_a_after, 1);
    }

    #[test]
    fn max_rounds_and_turns_end_battle_after_last_allowed_turn() {
        let mut engine = engine(2, 2);
        let mut rng = StdRng::seed_from_u64(1);

        let first = engine.execute_turn(Action::Wait, Action::Wait, &mut rng);
        assert_eq!(first.round, 1);
        assert_eq!(first.turn, 1);
        assert!(!engine.is_finished());

        let second = engine.execute_turn(Action::Wait, Action::Wait, &mut rng);
        assert_eq!(second.round, 1);
        assert_eq!(second.turn, 2);
        assert!(!engine.is_finished());

        let third = engine.execute_turn(Action::Wait, Action::Wait, &mut rng);
        assert_eq!(third.round, 2);
        assert_eq!(third.turn, 1);
        assert!(!engine.is_finished());

        let fourth = engine.execute_turn(Action::Wait, Action::Wait, &mut rng);
        assert_eq!(fourth.round, 2);
        assert_eq!(fourth.turn, 2);
        assert!(engine.is_finished());
        assert_eq!(engine.get_winner(), Some("draw".to_string()));
    }

    #[test]
    fn zero_max_turns_disables_turn_limit() {
        let mut engine = engine(2, 0);
        let mut rng = StdRng::seed_from_u64(1);

        for expected_turn in 1..=40 {
            let result = engine.execute_turn(Action::Wait, Action::Wait, &mut rng);
            assert_eq!(result.round, 1);
            assert_eq!(result.turn, expected_turn);
            assert!(!engine.is_finished());
        }
    }
}
