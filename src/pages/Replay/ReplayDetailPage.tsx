import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import UCButton from "../../components/common/UCButton/UCButton";

interface ReplayDetailPageProps {
  goBack: () => void;
  replayId: string;
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

interface ReplayData {
  id: string;
  timestamp: string;
  winner: string;
  rounds_played: number;
  turns_played: number;
  final_hp_a: number;
  final_hp_b: number;
  loss_reason: string;
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

function translateAction(action: string, lang: string): string {
  if (lang === "zh" && actionMap[action]) {
    return actionMap[action];
  }
  return action;
}

function toScreen(x: number, y: number) {
  const scale = MAP_SIZE / (ARENA_RADIUS * 2);
  return {
    sx: (x + ARENA_RADIUS) * scale + 50,
    sy: (y + ARENA_RADIUS) * scale + 50,
  };
}

export default function ReplayDetailPage({ goBack, replayId }: ReplayDetailPageProps) {
  const { i18n } = useTranslation();
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const timerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReplay();
  }, [replayId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        stopPlaying();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBackward();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, playing, replay]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [currentStep]);

  useEffect(() => {
    if (flash) {
      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [flash]);

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 300);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const triggerEventEffect = (step: number) => {
    if (!replay) return;
    const turn = replay.turns[step - 1];
    if (!turn) return;
    const isLast = step >= replay.turns.length;
    const isKill = turn.hp_a <= 0 || turn.hp_b <= 0;
    const posA = toScreen(turn.pos_a_x, turn.pos_a_y);
    const posB = toScreen(turn.pos_b_x, turn.pos_b_y);
    const outOfBounds =
      Math.sqrt(posA.sx * posA.sx + posA.sy * posA.sy) > MAP_SIZE / 2 ||
      Math.sqrt(posB.sx * posB.sx + posB.sy * posB.sy) > MAP_SIZE / 2;

    if (isKill || (isLast && outOfBounds)) {
      setFlash(true);
      setShake(true);
    }
  };

  const loadReplay = async () => {
    try {
      const data = await invoke<ReplayData>("get_replay", { replayId });
      setReplay(data);
    } catch (err) {
      console.error(err);
    }
  };

  const stopPlaying = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  };

  const togglePlay = () => {
    if (playing) {
      stopPlaying();
    } else {
      setPlaying(true);
      timerRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          if (replay && prev >= replay.turns.length) {
            stopPlaying();
            return prev;
          }
          const next = prev + 1;
          triggerEventEffect(next);
          return next;
        });
      }, 500);
    }
  };

  const stepForward = () => {
    stopPlaying();
    setCurrentStep((prev) => {
      if (replay && prev < replay.turns.length) {
        const next = prev + 1;
        triggerEventEffect(next);
        return next;
      }
      return prev;
    });
  };

  const stepBackward = () => {
    stopPlaying();
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleSliderChange = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!replay || replay.turns.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const step = Math.floor(ratio * replay.turns.length);
      setCurrentStep(step);
      triggerEventEffect(step);
    },
    [replay]
  );

  if (!replay) {
    return (
      <UCWindow>
        <UCPanel>
          <p style={{ color: "white" }}>Loading...</p>
        </UCPanel>
      </UCWindow>
    );
  }

  const lang = i18n.language;
  const turn = currentStep > 0 ? replay.turns[currentStep - 1] : null;
  const totalTurns = replay.turns.length;
  const progress = totalTurns > 0 ? (currentStep / totalTurns) * 100 : 0;

  const posA = turn ? toScreen(turn.pos_a_x, turn.pos_a_y) : toScreen(-100, 0);
  const posB = turn ? toScreen(turn.pos_b_x, turn.pos_b_y) : toScreen(100, 0);
  const hpA = turn?.hp_a ?? MAX_HP;
  const hpB = turn?.hp_b ?? MAX_HP;
  const mpA = turn?.mp_a ?? MAX_MP;
  const mpB = turn?.mp_b ?? MAX_MP;

  return (
    <UCWindow>
      <div className={shake ? "replay-shake" : ""}>
        <UCPanel width="1100px" padding="30px">
          {flash && <div className="replay-flash" />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h1 style={{ color: "white", fontSize: "22px", margin: 0 }}>
              {lang === "zh" ? "回放" : "Replay"}: {replay.id}
            </h1>
            <span style={{ color: "#888", fontSize: "14px" }}>{replay.timestamp}</span>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "8px", alignItems: "center" }}>
            <UCButton text="<<" onClick={stepBackward} />
            <UCButton text={playing ? "||" : "▶"} onClick={togglePlay} />
            <UCButton text=">>" onClick={stepForward} />
            <div
              ref={sliderRef}
              style={{
                flex: 1,
                height: "20px",
                background: "#222",
                border: "1px solid #555",
                position: "relative",
                cursor: "none",
              }}
              onClick={handleSliderChange}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#ffff00",
                  transition: "width 0.1s",
                }}
              />
            </div>
            <span style={{ color: "white", fontSize: "13px", width: "80px", textAlign: "right" }}>
              {currentStep} / {totalTurns}
            </span>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <svg width={MAP_SIZE + 100} height={MAP_SIZE + 100} viewBox={`0 0 ${MAP_SIZE + 100} ${MAP_SIZE + 100}`}>
                <defs>
                  <clipPath id="arena-clip-replay">
                    <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 2} />
                  </clipPath>
                </defs>
                <rect x="0" y="0" width={MAP_SIZE + 100} height={MAP_SIZE + 100} fill="#1a0a0a" />
                <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 2 + 20} fill="none" stroke="rgba(255,0,0,0.3)" strokeWidth="20" />
                <circle cx={MAP_SIZE / 2 + 50} cy={MAP_SIZE / 2 + 50} r={MAP_SIZE / 2} fill="#0a0a0a" stroke="white" strokeWidth="2" />
                <g clipPath="url(#arena-clip-replay)">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`rh${i}`} x1={50} y1={50 + i * (MAP_SIZE / 10)} x2={MAP_SIZE + 50} y2={50 + i * (MAP_SIZE / 10)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line key={`rv${i}`} x1={50 + i * (MAP_SIZE / 10)} y1={50} x2={50 + i * (MAP_SIZE / 10)} y2={MAP_SIZE + 50} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                  ))}
                </g>
                <circle cx={posA.sx} cy={posA.sy} r="8" fill="#ff4466" stroke="white" strokeWidth="1.5" />
                <circle cx={posB.sx} cy={posB.sy} r="8" fill="#4488ff" stroke="white" strokeWidth="1.5" />
                <text x={posA.sx} y={posA.sy - 14} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">A</text>
                <text x={posB.sx} y={posB.sy - 14} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">B</text>
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ border: "1px solid #555", padding: 10 }}>
                <div style={{ color: "#ff4466", fontSize: 14, marginBottom: 6 }}>Fighter A</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#aaa", fontSize: 12, width: 24, textAlign: "right" }}>HP</span>
                  <div style={{ flex: 1, height: 16, background: "#5c3a1e", position: "relative" }}>
                    <div style={{ height: "100%", width: `${(hpA / MAX_HP) * 100}%`, background: "#ffcc00", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ color: "white", fontSize: 11, width: 80, textAlign: "right" }}>{hpA} / {MAX_HP}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#aaa", fontSize: 12, width: 24, textAlign: "right" }}>MP</span>
                  <div style={{ flex: 1, height: 16, background: "#1a2a4a", position: "relative" }}>
                    <div style={{ height: "100%", width: `${(mpA / MAX_MP) * 100}%`, background: "#4488ff", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ color: "white", fontSize: 11, width: 80, textAlign: "right" }}>{mpA} / {MAX_MP}</span>
                </div>
              </div>

              <div style={{ border: "1px solid #555", padding: 10 }}>
                <div style={{ color: "#4488ff", fontSize: 14, marginBottom: 6 }}>Fighter B</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#aaa", fontSize: 12, width: 24, textAlign: "right" }}>HP</span>
                  <div style={{ flex: 1, height: 16, background: "#5c3a1e", position: "relative" }}>
                    <div style={{ height: "100%", width: `${(hpB / MAX_HP) * 100}%`, background: "#ffcc00", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ color: "white", fontSize: 11, width: 80, textAlign: "right" }}>{hpB} / {MAX_HP}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#aaa", fontSize: 12, width: 24, textAlign: "right" }}>MP</span>
                  <div style={{ flex: 1, height: 16, background: "#1a2a4a", position: "relative" }}>
                    <div style={{ height: "100%", width: `${(mpB / MAX_MP) * 100}%`, background: "#4488ff", transition: "width 0.3s" }} />
                  </div>
                  <span style={{ color: "white", fontSize: 11, width: 80, textAlign: "right" }}>{mpB} / {MAX_MP}</span>
                </div>
              </div>

              <div ref={logRef} style={{ maxHeight: 280, overflow: "auto", border: "1px solid #444", padding: 8 }}>
                {replay.turns.slice(0, currentStep).map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, fontSize: 15, color: "#ccc", padding: "3px 0", borderBottom: "1px solid #222" }}>
                    <span style={{ color: "#888", width: 70 }}>{lang === "zh" ? `第${t.round}轮第${t.turn}回合` : `R${t.round}T${t.turn}`}</span>
                    <span style={{ color: "#ff4466", width: 110 }}>{translateAction(t.action_a, lang)}</span>
                    <span style={{ color: "#4488ff", width: 110 }}>{translateAction(t.action_b, lang)}</span>
                    <span style={{ color: "#ffff00" }}>
                      {t.damage_to_a > 0 && `A -${t.damage_to_a} `}
                      {t.damage_to_b > 0 && `B -${t.damage_to_b}`}
                    </span>
                  </div>
                ))}
              </div>

              {currentStep >= totalTurns && totalTurns > 0 && (
                <div style={{ color: "#ffff00", fontSize: 16, marginTop: 12 }}>
                  <p>{lang === "zh" ? "胜者" : "Winner"}: {replay.winner}</p>
                  <p style={{ fontSize: 14, color: "#ccc" }}>{replay.loss_reason}</p>
                </div>
              )}
            </div>
          </div>
        </UCPanel>
      </div>
    </UCWindow>
  );
}