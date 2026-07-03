import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import UCWindow from "../../components/common/UCWindow/UCWindow";
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

type BattlePhase = "select" | "showcase" | "battle";

const ARENA_RADIUS = 250;
const MAX_HP = 500;
const MAX_MP = 250;

const actionMap: Record<string, string> = {
  Wait: "等待",
  MoveToward: "前进",
  MoveAway: "后退",
  BasicAttack: "普攻",
  MeleeSkill: "近战技能",
  RangedSkill: "远程技能",
  Block: "格挡",
  Dodge: "闪避",
};

function translateAction(action: string): string {
  return actionMap[action] ?? action;
}

function translateReason(reason: string): string {
  if (reason === "draw") {
    return "平局";
  }
  return reason;
}

function toArenaPoint(x: number, y: number) {
  const size = 320;
  const padding = 20;
  const scale = size / (ARENA_RADIUS * 2);
  return {
    x: padding + (x + ARENA_RADIUS) * scale,
    y: padding + (y + ARENA_RADIUS) * scale,
  };
}

function BattleSkull() {
  return (
    <svg className="battle-skull" viewBox="0 0 64 64" aria-hidden="true">
      <g shapeRendering="crispEdges">
        <rect x="18" y="8" width="28" height="8" fill="#f5f5f5" />
        <rect x="10" y="16" width="44" height="24" fill="#f5f5f5" />
        <rect x="16" y="40" width="32" height="8" fill="#f5f5f5" />
        <rect x="18" y="22" width="10" height="10" fill="#050505" />
        <rect x="36" y="22" width="10" height="10" fill="#050505" />
        <rect x="30" y="33" width="6" height="6" fill="#050505" />
        <rect x="20" y="44" width="4" height="6" fill="#050505" />
        <rect x="30" y="44" width="4" height="6" fill="#050505" />
        <rect x="40" y="44" width="4" height="6" fill="#050505" />
      </g>
    </svg>
  );
}

function BattleFighter({ armed = false }: { armed?: boolean }) {
  return (
    <svg className="battle-fighter" viewBox="0 0 96 120" aria-hidden="true">
      <g shapeRendering="crispEdges">
        <rect x="30" y="8" width="36" height="8" fill="#f6f6f6" />
        <rect x="22" y="16" width="52" height="24" fill="#f6f6f6" />
        <rect x="28" y="40" width="40" height="8" fill="#f6f6f6" />
        <rect x="34" y="20" width="10" height="10" fill="#050505" />
        <rect x="54" y="20" width="10" height="10" fill="#050505" />
        <rect x="46" y="31" width="6" height="6" fill="#050505" />
        <rect x="36" y="39" width="6" height="4" fill="#050505" />
        <rect x="46" y="41" width="6" height="4" fill="#050505" />
        <rect x="56" y="39" width="6" height="4" fill="#050505" />
        <rect x="32" y="50" width="32" height="8" fill="#f6f6f6" />
        <rect x="24" y="58" width="12" height="34" fill="#f6f6f6" />
        <rect x="60" y="58" width="12" height="34" fill="#f6f6f6" />
        <rect x="34" y="58" width="28" height="38" fill="#f6f6f6" />
        <rect x="38" y="62" width="20" height="28" fill="#050505" />
        <rect x="16" y="66" width="8" height="22" fill="#f6f6f6" />
        <rect x="72" y="66" width="8" height="22" fill="#f6f6f6" />
        <rect x="30" y="96" width="10" height="16" fill="#f6f6f6" />
        <rect x="56" y="96" width="10" height="16" fill="#f6f6f6" />
        <rect x="22" y="110" width="22" height="6" fill="#f6f6f6" />
        <rect x="52" y="110" width="22" height="6" fill="#f6f6f6" />
        {armed && (
          <>
            <rect x="80" y="58" width="6" height="8" fill="#f6f6f6" />
            <rect x="84" y="48" width="4" height="36" fill="#f6f6f6" />
            <rect x="88" y="44" width="4" height="8" fill="#f6f6f6" />
          </>
        )}
      </g>
    </svg>
  );
}

export default function BattlePage({ goBack }: BattlePageProps) {
  const { battleSpeed } = useSettingsStore();
  const [phase, setPhase] = useState<BattlePhase>("select");
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [running, setRunning] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const timerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const lastTurn = turns[turns.length - 1];
  const hpA = lastTurn?.hp_a ?? MAX_HP;
  const hpB = lastTurn?.hp_b ?? MAX_HP;
  const mpA = lastTurn?.mp_a ?? MAX_MP;
  const mpB = lastTurn?.mp_b ?? MAX_MP;
  const posA = lastTurn ? toArenaPoint(lastTurn.pos_a_x, lastTurn.pos_a_y) : toArenaPoint(-100, 0);
  const posB = lastTurn ? toArenaPoint(lastTurn.pos_b_x, lastTurn.pos_b_y) : toArenaPoint(100, 0);

  const stopBattle = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
  };

  const resetBattle = () => {
    stopBattle();
    setTurns([]);
    setResult(null);
    setErrorMessage("");
    setPhase("select");
  };

  const startBattle = async () => {
    stopBattle();
    setTurns([]);
    setResult(null);
    setErrorMessage("");
    setPhase("battle");
    setRunning(true);

    try {
      const id = await invoke<string>("init_battle");

      const step = async () => {
        try {
          const record = await invoke<TurnRecord>("step_battle", { sessionId: id });
          setTurns((prev) => [...prev, record]);
          if (record.damage_to_a > 0 || record.damage_to_b > 0) {
            setShake(true);
            setFlash(true);
          }
          timerRef.current = window.setTimeout(step, battleSpeed);
        } catch {
          try {
            const finalResult = await invoke<BattleResult>("finish_battle", { sessionId: id });
            setResult(finalResult);
          } catch {
            setErrorMessage("模拟已结束，但结果写入失败。");
          }
          setRunning(false);
        }
      };

      timerRef.current = window.setTimeout(step, battleSpeed);
    } catch {
      setRunning(false);
      setErrorMessage("无法连接 Tauri 后端，请在桌面应用中运行模拟。");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        stopBattle();
        goBack();
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
        if (phase === "select") {
          setPhase("showcase");
        } else if (phase === "showcase") {
          startBattle();
        } else if (phase === "battle" && result) {
          resetBattle();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, phase, result]);

  useEffect(() => {
    return () => stopBattle();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns, result]);

  useEffect(() => {
    if (shake) {
      const timer = window.setTimeout(() => setShake(false), 220);
      return () => window.clearTimeout(timer);
    }
  }, [shake]);

  useEffect(() => {
    if (flash) {
      const timer = window.setTimeout(() => setFlash(false), 180);
      return () => window.clearTimeout(timer);
    }
  }, [flash]);

  const phaseTitle = phase === "select" ? "选择人物" : phase === "showcase" ? "人物展示" : "模拟对战";

  return (
    <UCWindow>
      <div className={`battle-console ${shake ? "battle-console-shake" : ""}`}>
        {flash && <div className="battle-damage-flash" />}

        <header className="battle-header">
          <button className="battle-back-button" type="button" onClick={goBack}>× 返回</button>
          <div>
            <h1>模拟对战</h1>
            <span>{phaseTitle}</span>
          </div>
          <div className="battle-version">UCE v0.1.0</div>
        </header>

        <main className={`battle-grid battle-grid-${phase}`}>
          <section className={`battle-panel battle-flow-panel battle-flow-panel-${phase}`}>
            {phase === "select" && (
              <div className="battle-selection">
                <div className="battle-section-title">创建模拟</div>
                <div className="battle-rule" />
                <div className="battle-versus-select">
                  <div className="battle-picker">
                    <h2>左侧角色</h2>
                    <div className="battle-fighter-frame">
                      <span>‹</span>
                      <BattleFighter />
                      <span>›</span>
                    </div>
                    <button type="button">DummyA ▾</button>
                  </div>
                  <div className="battle-vs">VS</div>
                  <div className="battle-picker">
                    <h2>右侧角色</h2>
                    <div className="battle-fighter-frame">
                      <span>‹</span>
                      <BattleFighter />
                      <span>›</span>
                    </div>
                    <button type="button">DummyB ▾</button>
                  </div>
                </div>
                <div className="battle-map-select">
                  <span>地图</span>
                  <button type="button"><span /> Circle500 ▾</button>
                </div>
                <button className="battle-primary-button" type="button" onClick={() => setPhase("showcase")}>
                  <span>♥</span>
                  确认阵容
                </button>
              </div>
            )}

            {phase === "showcase" && (
              <div className="battle-showcase">
                <div className="battle-showcase-stage">
                  <div className="battle-showcase-light" />
                  <div className="battle-showcase-ring" />
                  <div className="battle-showcase-fighter battle-showcase-left">
                    <BattleFighter armed />
                    <strong>DummyA</strong>
                    <span>近战压制 / 格挡反击</span>
                  </div>
                  <div className="battle-showcase-vs">VS</div>
                  <div className="battle-showcase-fighter battle-showcase-right">
                    <BattleFighter />
                    <strong>DummyB</strong>
                    <span>远程牵制 / 闪避机动</span>
                  </div>
                </div>
                <div className="battle-showcase-text">
                  <h2>战斗数据已载入</h2>
                  <p>双方角色将在 Circle500 圆形场地内同时行动。移动、攻击、格挡、闪避与技能判定由 UCE 后端战斗引擎逐回合执行。</p>
                </div>
                <button className="battle-primary-button" type="button" onClick={startBattle}>
                  <span>♥</span>
                  开始模拟
                </button>
              </div>
            )}

            {phase === "battle" && (
              <div className="battle-live-stage">
                <div className="battle-turn-badge">
                  TURN {lastTurn?.turn ?? 0}
                </div>
                <div className="battle-stage-column battle-stage-column-left" />
                <div className="battle-stage-column battle-stage-column-right" />
                <div className="battle-stage-ring" />
                <div className="battle-stage-fighter battle-stage-a">
                  <BattleFighter armed={Boolean(lastTurn?.damage_to_b)} />
                </div>
                <div className="battle-stage-fighter battle-stage-b">
                  <BattleFighter armed={Boolean(lastTurn?.damage_to_a)} />
                </div>
                <div className="battle-live-state">
                  {running && "模拟运行中..."}
                  {!running && result && `胜者：${result.winner}`}
                  {!running && !result && errorMessage}
                </div>
              </div>
            )}
          </section>

          <aside className="battle-panel battle-status-panel">
            <div className="battle-section-title">流程状态</div>
            <div className="battle-rule" />
            <div className="battle-steps">
              <span className={phase === "select" ? "battle-step-active" : ""}>1 选择人物</span>
              <span className={phase === "showcase" ? "battle-step-active" : ""}>2 人物展示</span>
              <span className={phase === "battle" ? "battle-step-active" : ""}>3 模拟对战</span>
            </div>
            <div className="battle-data-card">
              <span>左侧角色</span>
              <strong>DummyA</strong>
            </div>
            <div className="battle-data-card">
              <span>右侧角色</span>
              <strong>DummyB</strong>
            </div>
            <div className="battle-data-card">
              <span>地图</span>
              <strong>Circle500</strong>
            </div>
            {result && (
              <div className="battle-result-card">
                <strong>模拟结果</strong>
                <span>胜者：{result.winner}</span>
                <span>轮数：{result.rounds_played}</span>
                <span>回合：{result.turns_played}</span>
                <span>原因：{translateReason(result.loss_reason)}</span>
              </div>
            )}
          </aside>

          {phase === "battle" && (
            <>
              <section className="battle-panel battle-map-panel">
                <div className="battle-map-stage">
                  <svg viewBox="0 0 360 360" aria-label="Battle map">
                    <defs>
                      <clipPath id="battle-map-clip">
                        <circle cx="180" cy="180" r="160" />
                      </clipPath>
                    </defs>
                    <rect x="0" y="0" width="360" height="360" fill="#050308" />
                    <circle cx="180" cy="180" r="162" fill="#090914" stroke="#ffffff" strokeWidth="1.5" />
                    <g clipPath="url(#battle-map-clip)">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <line
                          key={`h-${index}`}
                          x1="20"
                          y1={20 + index * 40}
                          x2="340"
                          y2={20 + index * 40}
                          stroke="rgba(255,255,255,0.06)"
                        />
                      ))}
                      {Array.from({ length: 9 }).map((_, index) => (
                        <line
                          key={`v-${index}`}
                          x1={20 + index * 40}
                          y1="20"
                          x2={20 + index * 40}
                          y2="340"
                          stroke="rgba(255,255,255,0.06)"
                        />
                      ))}
                      <circle cx="180" cy="180" r="82" fill="none" stroke="rgba(160,150,255,0.22)" />
                      <line x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y} stroke="rgba(255,255,255,0.35)" strokeDasharray="6 6" />
                    </g>
                    <circle cx={posA.x} cy={posA.y} r="9" fill="#ff3a52" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={posB.x} cy={posB.y} r="9" fill="#4e8dff" stroke="#ffffff" strokeWidth="2" />
                    <text x={posA.x} y={posA.y - 15} fill="#ffffff" textAnchor="middle" fontSize="13">A</text>
                    <text x={posB.x} y={posB.y - 15} fill="#ffffff" textAnchor="middle" fontSize="13">B</text>
                  </svg>
                </div>

                <div className="battle-hud-row">
                  <div className="battle-hud-card">
                    <strong><span>♥</span> DummyA</strong>
                    <div className="battle-stat"><span>HP</span><i><b style={{ width: `${(hpA / MAX_HP) * 100}%` }} /></i><em>{hpA} / {MAX_HP}</em></div>
                    <div className="battle-stat"><span>MP</span><i><b className="battle-mp-fill" style={{ width: `${(mpA / MAX_MP) * 100}%` }} /></i><em>{mpA} / {MAX_MP}</em></div>
                  </div>
                  <div className="battle-hud-card">
                    <strong>DummyB</strong>
                    <div className="battle-stat"><span>HP</span><i><b style={{ width: `${(hpB / MAX_HP) * 100}%` }} /></i><em>{hpB} / {MAX_HP}</em></div>
                    <div className="battle-stat"><span>MP</span><i><b className="battle-mp-fill" style={{ width: `${(mpB / MAX_MP) * 100}%` }} /></i><em>{mpB} / {MAX_MP}</em></div>
                  </div>
                </div>

                <div className="battle-actions-row">
                  <button type="button" className="battle-action-active">╱ 攻击</button>
                  <button type="button">✦ 技能</button>
                  <button type="button">▱ 格挡</button>
                  <button type="button">↯ 闪避</button>
                </div>

                <div className="battle-command-line">
                  {running && "等待战斗引擎返回下一回合..."}
                  {!running && result && "模拟结束，回放已写入本地记录。"}
                  {!running && !result && errorMessage}
                </div>
              </section>

              <section className="battle-panel battle-log-panel" ref={logRef}>
                <div className="battle-section-title">战斗日志</div>
                <div className="battle-rule" />
                <div className="battle-log-list">
                  {turns.length === 0 && (
                    <div className="battle-empty-log">
                      <BattleSkull />
                      <span>等待模拟开始。</span>
                    </div>
                  )}
                  {turns.slice(-24).map((turn) => (
                    <div key={`${turn.round}-${turn.turn}`} className="battle-log-entry">
                      <BattleSkull />
                      <div>
                        <strong>第{turn.round}轮 第{turn.turn}回合</strong>
                        <p>DummyA：{translateAction(turn.action_a)}</p>
                        <p>DummyB：{translateAction(turn.action_b)}</p>
                        {(turn.damage_to_a > 0 || turn.damage_to_b > 0) && (
                          <p className="battle-log-damage">
                            {turn.damage_to_a > 0 && `A -${turn.damage_to_a} `}
                            {turn.damage_to_b > 0 && `B -${turn.damage_to_b}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {result && (
                    <div className="battle-log-entry battle-log-result">
                      <BattleSkull />
                      <div>
                        <strong>模拟结束</strong>
                        <p>胜者：{result.winner}</p>
                        <p>原因：{translateReason(result.loss_reason)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <footer className="battle-footer">
          <span><b>♥</b> 确认 / 下一步</span>
          <span><b>×</b> 返回主页</span>
          {phase === "battle" && result && <button type="button" onClick={resetBattle}>重新选择</button>}
        </footer>
      </div>
    </UCWindow>
  );
}
