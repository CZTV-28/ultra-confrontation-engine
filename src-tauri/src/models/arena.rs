use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Arena {
    pub id: String,
    pub name: String,
    pub shape: String,
    pub radius: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<ArenaThumbnail>,
    pub spawn_points: Vec<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaThumbnail {
    pub data_url: String,
}
