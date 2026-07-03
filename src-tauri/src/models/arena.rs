use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Arena {
    pub id: String,
    pub name: String,
    pub shape: String,
    pub radius: f64,
    pub spawn_points: Vec<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}
