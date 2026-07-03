#[derive(Debug, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

pub fn distance(a: &Position, b: &Position) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}

pub fn is_out_of_bounds(pos: &Position, radius: f64) -> bool {
    distance(pos, &Position { x: 0.0, y: 0.0 }) > radius
}

pub fn move_toward(from: &Position, to: &Position, step: f64) -> Position {
    let d = distance(from, to);
    if d <= step || d == 0.0 {
        return Position { x: to.x, y: to.y };
    }
    let dx = (to.x - from.x) / d * step;
    let dy = (to.y - from.y) / d * step;
    Position {
        x: from.x + dx,
        y: from.y + dy,
    }
}

pub fn move_direction(pos: &Position, dx: f64, dy: f64) -> Position {
    Position {
        x: pos.x + dx,
        y: pos.y + dy,
    }
}

pub fn knockback(from: &Position, target: &Position, dist: f64) -> Position {
    let d = distance(from, target);
    if d == 0.0 {
        return Position {
            x: target.x,
            y: target.y + dist,
        };
    }
    let dx = (target.x - from.x) / d * dist;
    let dy = (target.y - from.y) / d * dist;
    Position {
        x: target.x + dx,
        y: target.y + dy,
    }
}
