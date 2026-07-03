import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import UCButton from "../../components/common/UCButton/UCButton";
import { useSettingsStore } from "../../store/settingsStore";
import "./BattlePage.css";

interface BattlePageProps {
  goBack: () => void;
}

interface TurnRecord {
  turn: number;
  round: number;
  action_a: string;
  action_b: string;
  damage_to_a: number;
  damage_to_b: number;
  hp_a: number;
  hp_b: number;
  mp_a: number;
  mp_b: number;
  pos_a_x: number;
  pos_a_y: number;
  pos_b_x: number;
  pos_b_y: number;
  dist: number;
}

interface BattleResult {
  winner: string;
  rounds_played: number;
  turns_played: number;
  final_hp_a: number;
  final_hp_b: number;
  loss_reason: string;
  replay_id: string;
  turns: TurnRecord[];
}

const ARENA_RADIUS = 250;
const MAP_SIZE = 500;
const MAX_HP = 500;
const MAX_MP = 250;

const actionMap: Record<string, string> = {
  Wait: "等待",
  MoveToward: "前进",
  MoveAway: "后退",
  BasicAttack: "平A",
  MeleeSkill: "近战技能",
  RangedSkill: "远程技能",
  Block: "格挡",
  Dodge: "闪避",
};

const reasonMap: Record<string, string> = {
  draw: "平局",
};

function translateAction(action: string, lang: string): string {
  if (lang === "zh" && actionMap[action]) {
    return actionMap[action];
  }
  return action;
}

function translateReason(reason: string, lang: string): string {
  if (lang === "zh") {
    if (reasonMap[reason]) return reasonMap[reason];
    return reason
      .replace("血量归零", "血量归零")
      .replace("坠入虚空", "坠入虚空");
  }
  return reason;
}

function toScreen(x: number, y: number) {
  const scale = MAP_SIZE / (ARENA_RADIUS * 2);
  return {
    sx: (x + ARENA_RADIUS) * scale + 50,
    sy: (y + ARENA_RADIUS) * scale + 50,
  };
}

export default function BattlePage({ goBack }: BattlePageProps) {
  const { t, i18n } = useTranslation();
  const { battleSpeed } = useSettingsStore();
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [running, setRunning] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const timerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        stopBattle();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns]);

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 200);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  useEffect(() => {
    if (flash) {
      const timer = setTimeout(() => setFlash(false), 150);
      return () => clearTimeout(timer);
    }
  }, [flash]);

  const stopBattle = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  };

  const startBattle = async () => {
    setTurns([]);
    setResult(null);
    setRunning(true);

    const id = await invoke<string>("init_battle");

    const step = async () => {
      try {
        const record = await invoke<TurnRecord>("step_battle", { sessionId: id });
        setTurns((prev) => {
          const newTurns = [...prev, record];
          if (record.damage_to_a > 0 || record.damage_to_b > 0) {
            setShake(true);
            setFlash(true);
          }
          return newTurns;
        });
        timerRef.current = window.setTimeout(step, battleSpeed);
      } catch {
        try {
          const finalResult = await invoke<BattleResult>("finish_battle", { sessionId: id });
          setResult(finalResult);
        } catch {}
        setRunning(false);
      }
    };

    timerRef.current = window.setTimeout(step, battleSpeed);
  };

  const lastTurn = turns[turns.length - 1];
  const posA = lastTurn ? toScreen(lastTurn.pos_a_x, lastTurn.pos_a_y) : toScreen(-100, 0);
  const posB = lastTurn ? toScreen(lastTurn.pos_b_x, lastTurn.pos_b_y) : toScreen(100, 0);

  const hpA = lastTurn?.hp_a ?? MAX_HP;
  const hpB = lastTurn?.hp_b ?? MAX_HP;
  const mpA = lastTurn?.mp_a ?? MAX_MP;
  const mpB = lastTurn?.mp_b ?? MAX_MP;

  const lang = i18n.language;

  const trailPositionsA = turns.slice(-3).map((t) => toScreen(t.pos_a_x, t.pos_a_y));
  const trailPositionsB = turns.slice(-3).map((t) => toScreen(t.pos_b_x, t.pos_b_y));

  return (
    <UCWindow>
      <div className={shake ? "screen-shake" : ""}>
        <UCPanel width="1100px" padding="30px">
          {flash && <div className="damage-flash" />}
          <h1 style={{ color: "white", fontSize: "24px", marginBottom: "16px" }}>
            {t("startSimulation")}
          </h1>

          <div className="battle-layout">
            <div className="battle-map">
              <svg width={MAP_SIZE + 100} height={MAP_SIZE + 100} viewBox={`0 0 ${MAP_SIZE + 100} ${MAP_SIZE + 100}`}>
                <defs>
                  <clipPath id="arena-clip">
                    <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 2} />
                  </clipPath>
                </defs>
                <rect x="0" y="0" width={MAP_SIZE + 100} height={MAP_SIZE + 100} fill="#1a0a0a" />
                <circle
                  cx={MAP_SIZE / 2 + 50}
                  cy={MAP_SIZE / 2 + 50}
                  r={MAP_SIZE / 2 + 20}
                  fill="none"
                  stroke="rgba(255,0,0,0.3)"
                  strokeWidth="20"
                />
                <circle
                  cx={MAP_SIZE / 2 + 50}
                  cy={MAP_SIZE / 2 + 50}
                  r={MAP_SIZE / 2}
                  fill="#0a0a0a"
                  stroke="white"
                  strokeWidth="2"
                />
                <g clipPath="url(#arena-clip)">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`h${i}`} x1={50} y1={50 + i * (MAP_SIZE / 10)} x2={MAP_SIZE + 50} y2={50 + i * (MAP_SIZE / 10)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`v${i}`} x1={50 + i * (MAP_SIZE / 10)} y1={50} x2={50 + i * (MAP_SIZE / 10)} y2={MAP_SIZE + 50} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  ))}
                  <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 4} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <line x1={MAP_SIZE / 2 + 50} y1={50} x2={MAP_SIZE / 2 + 50} y2={MAP_SIZE + 50} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  <line x1={50} y1={MAP_SIZE / 2 + 50} x2={MAP_SIZE + 50} y2={MAP_SIZE / 2 + 50} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  {trailPositionsA.length > 1 && (
                    <polyline
                      points={trailPositionsA.map((p) => `${p.sx},${p.sy}`).join(" ")}
                      fill="none"
                      stroke="rgba(255,68,102,0.2)"
                      strokeWidth="1.5"
                    />
                  )}
                  {trailPositionsB.length > 1 && (
                    <polyline
                      points={trailPositionsB.map((p) => `${p.sx},${p.sy}`).join(" ")}
                      fill="none"
                      stroke="rgba(68,136,255,0.2)"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
                <circle cx={posA.sx} cy={posA.sy} r="8" fill="#ff4466" stroke="white" strokeWidth="1.5" />
                <circle cx={posB.sx} cy={posB.sy} r="8" fill="#4488ff" stroke="white" strokeWidth="1.5" />
                <text x={posA.sx} y={posA.sy - 14} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">A</text>
                <text x={posB.sx} y={posB.sy - 14} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">B</text>
                {lastTurn && (
                  <line
                    x1={posA.sx} y1={posA.sy}
                    x2={posB.sx} y2={posB.sy}
                    stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                )}
              </svg>
            </div>

            <div className="battle-info">
              <div className="fighter-stats">
                <div className="fighter-name" style={{ color: "#ff4466" }}>Fighter A</div>
                <div className="stat-row">
                  <span className="stat-label">HP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-bg" style={{ background: "#5c3a1e" }} />
                    <div className="stat-bar-fill" style={{ width: `${(hpA / MAX_HP) * 100}%`, background: "#ffcc00" }} />
                  </div>
                  <span className="stat-text">{hpA} / {MAX_HP}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">MP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-bg" style={{ background: "#1a2a4a" }} />
                    <div className="stat-bar-fill" style={{ width: `${(mpA / MAX_MP) * 100}%`, background: "#4488ff" }} />
                  </div>
                  <span className="stat-text">{mpA} / {MAX_MP}</span>
                </div>
              </div>

              <div className="fighter-stats">
                <div className="fighter-name" style={{ color: "#4488ff" }}>Fighter B</div>
                <div className="stat-row">
                  <span className="stat-label">HP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-bg" style={{ background: "#5c3a1e" }} />
                    <div className="stat-bar-fill" style={{ width: `${(hpB / MAX_HP) * 100}%`, background: "#ffcc00" }} />
                  </div>
                  <span className="stat-text">{hpB} / {MAX_HP}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">MP</span>
                  <div className="stat-bar">
                    <div className="stat-bar-bg" style={{ background: "#1a2a4a" }} />
                    <div className="stat-bar-fill" style={{ width: `${(mpB / MAX_MP) * 100}%`, background: "#4488ff" }} />
                  </div>
                  <span className="stat-text">{mpB} / {MAX_MP}</span>
                </div>
              </div>

              <div className="action-log" ref={logRef}>
                {turns.slice(-20).map((t, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-turn">
                      {lang === "zh" ? `第${t.round}轮第${t.turn}回合` : `R${t.round}T${t.turn}`}
                    </span>
                    <span className="log-action-a">{translateAction(t.action_a, lang)}</span>
                    <span className="log-action-b">{translateAction(t.action_b, lang)}</span>
                    <span className="log-dmg">
                      {t.damage_to_a > 0 && <span className="dmg-a">A -{t.damage_to_a}</span>}
                      {t.damage_to_a > 0 && t.damage_to_b > 0 && " "}
                      {t.damage_to_b > 0 && <span className="dmg-b">B -{t.damage_to_b}</span>}
                    </span>
                  </div>
                ))}
              </div>

              {!running && !result && (
                <div style={{ marginTop: "12px" }}>
                  <UCButton text={lang === "zh" ? "开始模拟" : "Start Battle"} onClick={startBattle} />
                </div>
              )}

              {running && (
                <p style={{ color: "#ffff00", fontSize: "14px", marginTop: "6px" }}>
                  {lang === "zh" ? "模拟中..." : "Simulating..."}
                </p>
              )}

              {result && (
                <div style={{ color: "white", fontSize: "14px", marginTop: "10px", lineHeight: "1.8" }}>
                  <p style={{ color: "#ffff00", fontSize: "18px" }}>
                    {lang === "zh" ? "胜者" : "Winner"}: {result.winner}
                  </p>
                  <p>
                    {lang === "zh" ? "轮数" : "Rounds"}: {result.rounds_played}
                    {" | "}
                    {lang === "zh" ? "回合" : "Turns"}: {result.turns_played}
                  </p>
                  <p>
                    {lang === "zh" ? "原因" : "Reason"}: {translateReason(result.loss_reason, lang)}
                  </p>
                  <div style={{ marginTop: "10px" }}>
                    <UCButton text={lang === "zh" ? "再来一局" : "Run Again"} onClick={startBattle} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </UCPanel>
      </div>
    </UCWindow>
  );
}
