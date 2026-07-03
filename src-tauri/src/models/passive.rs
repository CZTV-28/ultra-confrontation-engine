use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassiveSkill {
    pub id: String,
    pub name: String,
    pub effect_type: PassiveEffectType,
    pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PassiveEffectType {
    DamageUp,
    DamageDown,
    SpeedUp,
    SpeedDown,
    HitRateUp,
    HitRateDown,
    Bleeding,
    Slow,
    Vulnerable,
}
