import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
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

interface CharacterSkills {
  melee: string;
  ranged: string;
  block: string;
  dodge: string;
  passive: string | null;
}

interface CharacterResource {
  id: string;
  name: string;
  creator: string;
  description?: string | null;
  hp: number;
  mp: number;
  skills: CharacterSkills;
}

interface ArenaResource {
  id: string;
  name: string;
  shape: string;
  radius: number;
  spawn_points: Array<{ x: number; y: number }>;
}

interface RulesetResource {
  season: string;
  name: string;
  match: {
    max_rounds: number;
    max_turns_per_round: number;
  };
  character_defaults: {
    max_hp: number;
    max_mp: number;
  };
}

type SkillResource = {
  id: string;
  name: string;
  type: "melee" | "ranged" | "block" | "dodge";
  mp_cost: number;
  damage?: number;
  hit_rate?: number;
  knockback?: number;
  damage_reduction?: number;
  retreat_distance?: number;
};

type BattlePhase = "select" | "characterPicker" | "arenaPicker" | "showcase" | "battle";
type Language = "zh" | "en";
type CharacterSide = "left" | "right";
type SetupFocus = "left" | "right" | "arena" | "ruleset" | "confirm";

const ARENA_RADIUS = 250;
const MAX_HP = 500;
const MAX_MP = 250;

const actionMap: Record<Language, Record<string, string>> = {
  zh: {
    Wait: "等待",
    MoveToward: "前进",
    MoveAway: "后退",
    BasicAttack: "普攻",
    MeleeSkill: "近战技能",
    RangedSkill: "远程技能",
    Block: "格挡",
    Dodge: "闪避",
  },
  en: {
    Wait: "Wait",
    MoveToward: "Move Toward",
    MoveAway: "Move Away",
    BasicAttack: "Basic Attack",
    MeleeSkill: "Melee Skill",
    RangedSkill: "Ranged Skill",
    Block: "Block",
    Dodge: "Dodge",
  },
};

const battleCopy = {
  zh: {
    back: "返回",
    title: "模拟对战",
    phaseSelect: "创建模拟",
    phaseCharacterPicker: "选择人物",
    phaseArenaPicker: "选择地图",
    phaseShowcase: "人物展示",
    phaseBattle: "模拟对战",
    createSimulation: "创建模拟",
    leftCharacter: "左侧角色",
    rightCharacter: "右侧角色",
    map: "地图",
    ruleset: "规则",
    confirmTeam: "确认阵容",
    assetLoading: "正在读取本地资源库...",
    assetLoadError: "无法读取角色、地图或规则资源，请在桌面应用中运行。",
    noResource: "暂无可用资源",
    creator: "作者",
    hpLabel: "生命",
    mpLabel: "能量",
    skillsLabel: "技能",
    meleeSkill: "近战",
    rangedSkill: "远程",
    blockSkill: "格挡",
    dodgeSkill: "闪避",
    arenaRadius: "半径",
    damage: "伤害",
    cost: "耗蓝",
    hitRate: "命中",
    knockback: "击退",
    reduction: "减伤",
    retreat: "后撤",
    selected: "已选择",
    confirmPick: "确认选择",
    selectLeft: "选择左侧角色",
    selectRight: "选择右侧角色",
    noCharacterIntro: "该角色暂无个人介绍。后续角色模板会在这里显示参赛者提交的角色背景、定位和训练说明。",
    dataLoaded: "战斗数据已载入",
    showcaseText: (arenaName: string) =>
      `双方角色将在 ${arenaName} 场地内同时行动。移动、攻击、格挡、闪避与技能判定由 UCE 后端战斗引擎逐回合执行。`,
    startSimulation: "开始模拟",
    running: "模拟运行中...",
    winner: "胜者",
    tauriError: "无法连接 Tauri 后端，请在桌面应用中运行模拟。",
    finishWriteError: "模拟已结束，但结果写入失败。",
    waitingEngine: "等待战斗引擎返回下一回合...",
    replaySaved: "模拟结束，回放已写入本地记录。",
    logTitle: "战斗日志",
    waitingStart: "等待模拟开始。",
    roundTurn: (round: number, turn: number) => `第 ${round} 轮 / 第 ${turn} 回合`,
    simulationFinished: "模拟结束",
    turnsUsed: "使用回合",
    reason: "原因",
    confirmNext: "确认 / 下一步",
    backHome: "返回主页",
    restart: "重新选择",
    draw: "平局",
  },
  en: {
    back: "Back",
    title: "Simulation",
    phaseSelect: "Create Simulation",
    phaseCharacterPicker: "Character Select",
    phaseArenaPicker: "Stage Select",
    phaseShowcase: "Character Showcase",
    phaseBattle: "Battle Simulation",
    createSimulation: "Create Simulation",
    leftCharacter: "Left Character",
    rightCharacter: "Right Character",
    map: "Map",
    ruleset: "Ruleset",
    confirmTeam: "Confirm Team",
    assetLoading: "Reading local asset library...",
    assetLoadError: "Cannot read characters, arenas, or rulesets. Run this in the desktop app.",
    noResource: "No available resources",
    creator: "Creator",
    hpLabel: "HP",
    mpLabel: "MP",
    skillsLabel: "Skills",
    meleeSkill: "Melee",
    rangedSkill: "Ranged",
    blockSkill: "Block",
    dodgeSkill: "Dodge",
    arenaRadius: "Radius",
    damage: "Damage",
    cost: "MP",
    hitRate: "Hit",
    knockback: "Knockback",
    reduction: "Reduction",
    retreat: "Retreat",
    selected: "Selected",
    confirmPick: "Confirm",
    selectLeft: "Select Left Character",
    selectRight: "Select Right Character",
    noCharacterIntro: "No character profile yet. Future templates will show submitted lore, combat role, and training notes here.",
    dataLoaded: "Battle Data Loaded",
    showcaseText: (arenaName: string) =>
      `Both characters act simultaneously inside the ${arenaName} arena. Movement, attacks, blocks, dodges, and skills are resolved turn by turn by the UCE battle engine.`,
    startSimulation: "Start Simulation",
    running: "Simulation running...",
    winner: "Winner",
    tauriError: "Cannot connect to the Tauri backend. Run the simulation in the desktop app.",
    finishWriteError: "Simulation ended, but the result could not be written.",
    waitingEngine: "Waiting for the battle engine to return the next turn...",
    replaySaved: "Simulation ended. Replay saved to local records.",
    logTitle: "Battle Log",
    waitingStart: "Waiting for simulation to start.",
    roundTurn: (round: number, turn: number) => `Round ${round} / Turn ${turn}`,
    simulationFinished: "Simulation Finished",
    turnsUsed: "Turns Used",
    reason: "Reason",
    confirmNext: "Confirm / Next",
    backHome: "Back Home",
    restart: "Restart",
    draw: "Draw",
  },
};

type BattleCopy = (typeof battleCopy)[Language];

function translateAction(action: string, lang: Language): string {
  return actionMap[lang][action] ?? action;
}

function translateReason(reason: string, lang: Language): string {
  if (reason === "draw") {
    return battleCopy[lang].draw;
  }
  return reason;
}

function toArenaPoint(x: number, y: number, radius: number) {
  const size = 320;
  const padding = 20;
  const scale = size / (radius * 2);
  return {
    x: padding + (x + radius) * scale,
    y: padding + (y + radius) * scale,
  };
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }
  return ((index % length) + length) % length;
}

function skillLine(skill: SkillResource | undefined, fallbackId: string, copy: BattleCopy): string {
  if (!skill) {
    return fallbackId;
  }

  if (skill.type === "melee") {
    return `${skill.name} / ${copy.damage}: ${skill.damage ?? 0} / ${copy.cost}: ${skill.mp_cost}`;
  }
  if (skill.type === "ranged") {
    const hitRate = Math.round((skill.hit_rate ?? 0) * 100);
    return `${skill.name} / ${copy.damage}: ${skill.damage ?? 0} / ${copy.cost}: ${skill.mp_cost} / ${copy.hitRate}: ${hitRate}%`;
  }
  if (skill.type === "block") {
    const reduction = Math.round((skill.damage_reduction ?? 0) * 100);
    return `${skill.name} / ${copy.cost}: ${skill.mp_cost} / ${copy.reduction}: ${reduction}%`;
  }
  return `${skill.name} / ${copy.cost}: ${skill.mp_cost} / ${copy.retreat}: ${skill.retreat_distance ?? 0}`;
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
  const { i18n } = useTranslation();
  const { battleSpeed } = useSettingsStore();
  const lang: Language = i18n.language.startsWith("en") ? "en" : "zh";
  const copy = battleCopy[lang];
  const [phase, setPhase] = useState<BattlePhase>("select");
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [running, setRunning] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [characters, setCharacters] = useState<CharacterResource[]>([]);
  const [arenas, setArenas] = useState<ArenaResource[]>([]);
  const [rulesets, setRulesets] = useState<RulesetResource[]>([]);
  const [skills, setSkills] = useState<SkillResource[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState("");
  const [selectedRightId, setSelectedRightId] = useState("");
  const [selectedArenaId, setSelectedArenaId] = useState("");
  const [selectedRulesetId, setSelectedRulesetId] = useState("");
  const [activeCharacterSide, setActiveCharacterSide] = useState<CharacterSide>("left");
  const [focusedCharacterIndex, setFocusedCharacterIndex] = useState(0);
  const [focusedArenaIndex, setFocusedArenaIndex] = useState(0);
  const [setupFocus, setSetupFocus] = useState<SetupFocus>("left");
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsLoadFailed, setAssetsLoadFailed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const skillById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const selectedLeft = characters.find((character) => character.id === selectedLeftId);
  const selectedRight = characters.find((character) => character.id === selectedRightId);
  const selectedArena = arenas.find((arena) => arena.id === selectedArenaId);
  const selectedRuleset = rulesets.find((ruleset) => ruleset.season === selectedRulesetId);
  const focusedCharacter = characters[focusedCharacterIndex];
  const focusedArena = arenas[focusedArenaIndex];
  const maxHp = selectedRuleset?.character_defaults.max_hp ?? MAX_HP;
  const maxMp = selectedRuleset?.character_defaults.max_mp ?? MAX_MP;
  const arenaRadius = selectedArena?.radius ?? ARENA_RADIUS;
  const spawnA = selectedArena?.spawn_points[0] ?? { x: -100, y: 0 };
  const spawnB = selectedArena?.spawn_points[1] ?? { x: 100, y: 0 };
  const canConfirmSelection =
    Boolean(selectedLeft && selectedRight && selectedArena && selectedRuleset) && !assetsLoading && !assetsLoadFailed;

  const lastTurn = turns[turns.length - 1];
  const hpA = lastTurn?.hp_a ?? maxHp;
  const hpB = lastTurn?.hp_b ?? maxHp;
  const mpA = lastTurn?.mp_a ?? maxMp;
  const mpB = lastTurn?.mp_b ?? maxMp;
  const posA = lastTurn
    ? toArenaPoint(lastTurn.pos_a_x, lastTurn.pos_a_y, arenaRadius)
    : toArenaPoint(spawnA.x, spawnA.y, arenaRadius);
  const posB = lastTurn
    ? toArenaPoint(lastTurn.pos_b_x, lastTurn.pos_b_y, arenaRadius)
    : toArenaPoint(spawnB.x, spawnB.y, arenaRadius);
  const battleDelay = battleSpeed <= 0 ? 0 : Math.round(1000 / battleSpeed);

  const getCharacterSkills = (character: CharacterResource | undefined) => {
    if (!character) {
      return [];
    }

    return [
      { label: copy.meleeSkill, skill: skillById.get(character.skills.melee), fallback: character.skills.melee },
      { label: copy.rangedSkill, skill: skillById.get(character.skills.ranged), fallback: character.skills.ranged },
      { label: copy.blockSkill, skill: skillById.get(character.skills.block), fallback: character.skills.block },
      { label: copy.dodgeSkill, skill: skillById.get(character.skills.dodge), fallback: character.skills.dodge },
    ];
  };

  const skillSummary = (character: CharacterResource | undefined) =>
    getCharacterSkills(character)
      .map((item) => `${item.label}: ${item.skill?.name ?? item.fallback}`)
      .join(" / ");

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

  const openCharacterPicker = (side: CharacterSide) => {
    const selectedId = side === "left" ? selectedLeftId : selectedRightId;
    const selectedIndex = characters.findIndex((character) => character.id === selectedId);
    setActiveCharacterSide(side);
    setFocusedCharacterIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setPhase("characterPicker");
  };

  const openArenaPicker = () => {
    const selectedIndex = arenas.findIndex((arena) => arena.id === selectedArenaId);
    setFocusedArenaIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setPhase("arenaPicker");
  };

  const confirmFocusedCharacter = () => {
    const character = characters[focusedCharacterIndex];
    if (!character) {
      return;
    }
    if (activeCharacterSide === "left") {
      setSelectedLeftId(character.id);
      setSetupFocus("left");
    } else {
      setSelectedRightId(character.id);
      setSetupFocus("right");
    }
    setPhase("select");
  };

  const confirmFocusedArena = () => {
    const arena = arenas[focusedArenaIndex];
    if (!arena) {
      return;
    }
    setSelectedArenaId(arena.id);
    setSetupFocus("arena");
    setPhase("select");
  };

  const cycleRuleset = (direction: number) => {
    if (rulesets.length === 0) {
      return;
    }
    const currentIndex = Math.max(
      0,
      rulesets.findIndex((ruleset) => ruleset.season === selectedRulesetId),
    );
    setSelectedRulesetId(rulesets[clampIndex(currentIndex + direction, rulesets.length)].season);
  };

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      setAssetsLoading(true);
      setAssetsLoadFailed(false);

      try {
        const [loadedCharacters, loadedArenas, loadedRulesets, loadedSkills] = await Promise.all([
          invoke<CharacterResource[]>("list_characters"),
          invoke<ArenaResource[]>("list_arenas"),
          invoke<RulesetResource[]>("list_rulesets"),
          invoke<SkillResource[]>("list_skills"),
        ]);

        if (cancelled) {
          return;
        }

        setCharacters(loadedCharacters);
        setArenas(loadedArenas);
        setRulesets(loadedRulesets);
        setSkills(loadedSkills);
        setSelectedLeftId((current) =>
          loadedCharacters.some((character) => character.id === current) ? current : loadedCharacters[0]?.id ?? "",
        );
        setSelectedRightId((current) =>
          loadedCharacters.some((character) => character.id === current)
            ? current
            : loadedCharacters[1]?.id ?? loadedCharacters[0]?.id ?? "",
        );
        setSelectedArenaId((current) =>
          loadedArenas.some((arena) => arena.id === current) ? current : loadedArenas[0]?.id ?? "",
        );
        setSelectedRulesetId((current) =>
          loadedRulesets.some((ruleset) => ruleset.season === current) ? current : loadedRulesets[0]?.season ?? "",
        );
      } catch {
        if (!cancelled) {
          setAssetsLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setAssetsLoading(false);
        }
      }
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  const startBattle = async () => {
    if (!canConfirmSelection) {
      setErrorMessage(copy.assetLoadError);
      return;
    }

    stopBattle();
    setTurns([]);
    setResult(null);
    setErrorMessage("");
    setPhase("battle");
    setRunning(true);

    try {
      const id = await invoke<string>("init_battle", {
        config: {
          leftCharacterId: selectedLeftId,
          rightCharacterId: selectedRightId,
          arenaId: selectedArenaId,
          rulesetId: selectedRulesetId,
        },
      });

      if (battleSpeed <= 0) {
        const completedTurns: TurnRecord[] = [];

        for (;;) {
          try {
            const record = await invoke<TurnRecord>("step_battle", { sessionId: id });
            completedTurns.push(record);
          } catch {
            try {
              const finalResult = await invoke<BattleResult>("finish_battle", { sessionId: id });
              setTurns(finalResult.turns.length > 0 ? finalResult.turns : completedTurns);
              setResult(finalResult);
            } catch {
              setTurns(completedTurns);
              setErrorMessage(copy.finishWriteError);
            }
            setRunning(false);
            return;
          }
        }
      }

      const step = async () => {
        try {
          const record = await invoke<TurnRecord>("step_battle", { sessionId: id });
          setTurns((prev) => [...prev, record]);
          if (record.damage_to_a > 0 || record.damage_to_b > 0) {
            setShake(true);
            setFlash(true);
          }
          timerRef.current = window.setTimeout(step, battleDelay);
        } catch {
          try {
            const finalResult = await invoke<BattleResult>("finish_battle", { sessionId: id });
            setTurns(finalResult.turns);
            setResult(finalResult);
          } catch {
            setErrorMessage(copy.finishWriteError);
          }
          setRunning(false);
        }
      };

      timerRef.current = window.setTimeout(step, battleDelay);
    } catch {
      setRunning(false);
      setErrorMessage(copy.tauriError);
    }
  };

  useEffect(() => {
    const setupOrder: SetupFocus[] = ["left", "right", "arena", "ruleset", "confirm"];

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const isUp = key === "ArrowUp" || key === "w" || key === "W";
      const isDown = key === "ArrowDown" || key === "s" || key === "S";
      const isLeft = key === "ArrowLeft" || key === "a" || key === "A";
      const isRight = key === "ArrowRight" || key === "d" || key === "D";
      const isConfirm = key === "z" || key === "Z" || key === "Enter";
      const isBack = key === "x" || key === "X";

      if (!isUp && !isDown && !isLeft && !isRight && !isConfirm && !isBack) {
        return;
      }

      e.preventDefault();

      if (phase === "characterPicker") {
        if (isBack) {
          setPhase("select");
          return;
        }
        if (isConfirm) {
          confirmFocusedCharacter();
          return;
        }
        if (characters.length === 0) {
          return;
        }
        if (isLeft || isUp) {
          setFocusedCharacterIndex((current) => clampIndex(current - 1, characters.length));
        } else if (isRight || isDown) {
          setFocusedCharacterIndex((current) => clampIndex(current + 1, characters.length));
        }
        return;
      }

      if (phase === "arenaPicker") {
        if (isBack) {
          setPhase("select");
          return;
        }
        if (isConfirm) {
          confirmFocusedArena();
          return;
        }
        if (arenas.length === 0) {
          return;
        }
        if (isUp || isLeft) {
          setFocusedArenaIndex((current) => clampIndex(current - 1, arenas.length));
        } else if (isDown || isRight) {
          setFocusedArenaIndex((current) => clampIndex(current + 1, arenas.length));
        }
        return;
      }

      if (phase === "select") {
        if (isBack) {
          stopBattle();
          goBack();
          return;
        }
        if (isLeft || isUp) {
          const currentIndex = setupOrder.indexOf(setupFocus);
          setSetupFocus(setupOrder[clampIndex(currentIndex - 1, setupOrder.length)]);
          return;
        }
        if (isRight || isDown) {
          const currentIndex = setupOrder.indexOf(setupFocus);
          setSetupFocus(setupOrder[clampIndex(currentIndex + 1, setupOrder.length)]);
          return;
        }
        if (isConfirm) {
          if (setupFocus === "left") {
            openCharacterPicker("left");
          } else if (setupFocus === "right") {
            openCharacterPicker("right");
          } else if (setupFocus === "arena") {
            openArenaPicker();
          } else if (setupFocus === "ruleset") {
            cycleRuleset(1);
          } else if (canConfirmSelection) {
            setPhase("showcase");
          }
        }
        return;
      }

      if (isBack) {
        if (phase === "showcase") {
          setPhase("select");
        } else {
          stopBattle();
          goBack();
        }
      } else if (isConfirm) {
        if (phase === "showcase") {
          startBattle();
        } else if (phase === "battle" && result) {
          resetBattle();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    arenas.length,
    canConfirmSelection,
    characters.length,
    focusedArenaIndex,
    focusedCharacterIndex,
    goBack,
    phase,
    result,
    setupFocus,
    selectedRulesetId,
  ]);

  useEffect(() => {
    return () => stopBattle();
  }, []);

  useLayoutEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns.length, result]);

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

  const phaseTitle =
    phase === "characterPicker"
      ? copy.phaseCharacterPicker
      : phase === "arenaPicker"
        ? copy.phaseArenaPicker
        : phase === "showcase"
          ? copy.phaseShowcase
          : phase === "battle"
            ? copy.phaseBattle
            : copy.phaseSelect;

  return (
    <UCWindow>
      <div className={`battle-console ${shake ? "battle-console-shake" : ""}`}>
        {flash && <div className="battle-damage-flash" />}

        <header className="battle-header">
          <button
            className="battle-back-button"
            type="button"
            onClick={() => {
              if (phase === "characterPicker" || phase === "arenaPicker" || phase === "showcase") {
                setPhase("select");
              } else {
                stopBattle();
                goBack();
              }
            }}
          >
            X {copy.back}
          </button>
          <div>
            <h1>{copy.title}</h1>
            <span>{phaseTitle}</span>
          </div>
          <div className="battle-version">UCE v0.1.0</div>
        </header>

        <main className={`battle-grid battle-grid-${phase}`}>
          <section className={`battle-panel battle-flow-panel battle-flow-panel-${phase}`}>
            {phase === "select" && (
              <div className="battle-selection">
                <div className="battle-section-title">{copy.createSimulation}</div>
                <div className="battle-rule" />
                {(assetsLoading || assetsLoadFailed) && (
                  <div className={`battle-resource-status ${assetsLoadFailed ? "battle-resource-error" : ""}`}>
                    {assetsLoading ? copy.assetLoading : copy.assetLoadError}
                  </div>
                )}
                <div className="battle-versus-select">
                  <button
                    className={`battle-picker battle-picker-button ${setupFocus === "left" ? "battle-setup-focused" : ""}`}
                    type="button"
                    onClick={() => openCharacterPicker("left")}
                    onMouseEnter={() => setSetupFocus("left")}
                    disabled={assetsLoading || characters.length === 0}
                  >
                    <h2>{copy.leftCharacter}</h2>
                    <div className="battle-fighter-frame">
                      <BattleFighter />
                    </div>
                    <strong>{selectedLeft?.name ?? copy.noResource}</strong>
                    <span>{selectedLeft ? `${copy.creator}: ${selectedLeft.creator}` : copy.noResource}</span>
                  </button>

                  <div className="battle-vs">VS</div>

                  <button
                    className={`battle-picker battle-picker-button ${setupFocus === "right" ? "battle-setup-focused" : ""}`}
                    type="button"
                    onClick={() => openCharacterPicker("right")}
                    onMouseEnter={() => setSetupFocus("right")}
                    disabled={assetsLoading || characters.length === 0}
                  >
                    <h2>{copy.rightCharacter}</h2>
                    <div className="battle-fighter-frame">
                      <BattleFighter />
                    </div>
                    <strong>{selectedRight?.name ?? copy.noResource}</strong>
                    <span>{selectedRight ? `${copy.creator}: ${selectedRight.creator}` : copy.noResource}</span>
                  </button>
                </div>

                <div className="battle-match-config">
                  <button
                    className={`battle-stage-select-button ${setupFocus === "arena" ? "battle-setup-focused" : ""}`}
                    type="button"
                    onClick={openArenaPicker}
                    onMouseEnter={() => setSetupFocus("arena")}
                    disabled={assetsLoading || arenas.length === 0}
                  >
                    <span className="battle-map-thumb" />
                    <b>{copy.map}</b>
                    <strong>{selectedArena?.name ?? copy.noResource}</strong>
                  </button>

                  <button
                    className={`battle-ruleset-button ${setupFocus === "ruleset" ? "battle-setup-focused" : ""}`}
                    type="button"
                    onClick={() => cycleRuleset(1)}
                    onMouseEnter={() => setSetupFocus("ruleset")}
                    disabled={assetsLoading || rulesets.length === 0}
                  >
                    <span>{copy.ruleset}</span>
                    <strong>{selectedRuleset ? `${selectedRuleset.season} / ${selectedRuleset.name}` : copy.noResource}</strong>
                  </button>
                </div>

                <button
                  className={`battle-primary-button ${setupFocus === "confirm" ? "battle-setup-focused" : ""}`}
                  type="button"
                  onClick={() => canConfirmSelection && setPhase("showcase")}
                  onMouseEnter={() => setSetupFocus("confirm")}
                  disabled={!canConfirmSelection}
                >
                  <span>♥</span>
                  {copy.confirmTeam}
                </button>
              </div>
            )}

            {phase === "characterPicker" && (
              <div className="battle-character-library">
                <div className="battle-library-grid">
                  {characters.map((character, index) => (
                    <button
                      key={character.id}
                      className={`battle-character-card ${index === focusedCharacterIndex ? "battle-library-focused" : ""} ${
                        character.id === selectedLeftId || character.id === selectedRightId ? "battle-library-selected" : ""
                      }`}
                      type="button"
                      onMouseEnter={() => setFocusedCharacterIndex(index)}
                      onClick={() => setFocusedCharacterIndex(index)}
                    >
                      <div className="battle-character-portrait">
                        <BattleFighter armed={index === focusedCharacterIndex} />
                      </div>
                      <strong>{character.name}</strong>
                      <span>{character.id === selectedLeftId || character.id === selectedRightId ? copy.selected : character.creator}</span>
                    </button>
                  ))}
                </div>

                <aside className="battle-library-detail">
                  <div className="battle-section-title">
                    {activeCharacterSide === "left" ? copy.selectLeft : copy.selectRight}
                  </div>
                  <div className="battle-rule" />
                  {focusedCharacter ? (
                    <>
                      <div className="battle-detail-portrait">
                        <BattleFighter armed />
                      </div>
                      <h2>{focusedCharacter.name}</h2>
                      <div className="battle-detail-stats">
                        <span>{copy.creator}: {focusedCharacter.creator}</span>
                        <span>{copy.hpLabel}: {focusedCharacter.hp}</span>
                        <span>{copy.mpLabel}: {focusedCharacter.mp}</span>
                      </div>
                      <p className="battle-detail-intro">{focusedCharacter.description || copy.noCharacterIntro}</p>
                      <div className="battle-skill-detail-list">
                        {getCharacterSkills(focusedCharacter).map((item) => (
                          <div key={item.label} className="battle-skill-detail">
                            <b>{item.label}</b>
                            <span>{skillLine(item.skill, item.fallback, copy)}</span>
                          </div>
                        ))}
                      </div>
                      <button className="battle-detail-confirm" type="button" onClick={confirmFocusedCharacter}>
                        <span>♥</span>
                        {copy.confirmPick}
                      </button>
                    </>
                  ) : (
                    <p className="battle-detail-intro">{copy.noResource}</p>
                  )}
                </aside>
              </div>
            )}

            {phase === "arenaPicker" && (
              <div className="battle-arena-library">
                <div className="battle-arena-list">
                  {arenas.map((arena, index) => (
                    <button
                      key={arena.id}
                      className={`battle-arena-card ${index === focusedArenaIndex ? "battle-library-focused" : ""} ${
                        arena.id === selectedArenaId ? "battle-library-selected" : ""
                      }`}
                      type="button"
                      onMouseEnter={() => setFocusedArenaIndex(index)}
                      onClick={() => setFocusedArenaIndex(index)}
                    >
                      <span className="battle-arena-thumb" />
                      <span>
                        <strong>{arena.name}</strong>
                        <em>{arena.shape} / {copy.arenaRadius} {arena.radius}</em>
                      </span>
                    </button>
                  ))}
                </div>

                <aside className="battle-library-detail">
                  <div className="battle-section-title">{copy.map}</div>
                  <div className="battle-rule" />
                  {focusedArena ? (
                    <>
                      <div className="battle-detail-map">
                        <span className="battle-arena-thumb" />
                      </div>
                      <h2>{focusedArena.name}</h2>
                      <div className="battle-detail-stats">
                        <span>ID: {focusedArena.id}</span>
                        <span>{copy.arenaRadius}: {focusedArena.radius}</span>
                        <span>{focusedArena.shape}</span>
                      </div>
                      <button className="battle-detail-confirm" type="button" onClick={confirmFocusedArena}>
                        <span>♥</span>
                        {copy.confirmPick}
                      </button>
                    </>
                  ) : (
                    <p className="battle-detail-intro">{copy.noResource}</p>
                  )}
                </aside>
              </div>
            )}

            {phase === "showcase" && (
              <div className="battle-showcase">
                <div className="battle-showcase-stage">
                  <div className="battle-showcase-light" />
                  <div className="battle-showcase-ring" />
                  <div className="battle-showcase-fighter battle-showcase-left">
                    <BattleFighter armed />
                    <strong>{selectedLeft?.name ?? copy.leftCharacter}</strong>
                    <span>{skillSummary(selectedLeft)}</span>
                  </div>
                  <div className="battle-showcase-vs">VS</div>
                  <div className="battle-showcase-fighter battle-showcase-right">
                    <BattleFighter />
                    <strong>{selectedRight?.name ?? copy.rightCharacter}</strong>
                    <span>{skillSummary(selectedRight)}</span>
                  </div>
                </div>
                <div className="battle-showcase-text">
                  <h2>{copy.dataLoaded}</h2>
                  <p>{copy.showcaseText(selectedArena?.name ?? copy.map)}</p>
                </div>
                <button className="battle-primary-button" type="button" onClick={startBattle}>
                  <span>♥</span>
                  {copy.startSimulation}
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
                  {running && copy.running}
                  {!running && result && `${copy.winner}: ${result.winner}`}
                  {!running && !result && errorMessage}
                </div>
              </div>
            )}
          </section>

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
                    <strong><span>♥</span> {selectedLeft?.name ?? copy.leftCharacter}</strong>
                    <div className="battle-stat"><span>HP</span><i><b style={{ width: `${(hpA / maxHp) * 100}%` }} /></i><em>{hpA} / {maxHp}</em></div>
                    <div className="battle-stat"><span>MP</span><i><b className="battle-mp-fill" style={{ width: `${(mpA / maxMp) * 100}%` }} /></i><em>{mpA} / {maxMp}</em></div>
                  </div>
                  <div className="battle-hud-card">
                    <strong>{selectedRight?.name ?? copy.rightCharacter}</strong>
                    <div className="battle-stat"><span>HP</span><i><b style={{ width: `${(hpB / maxHp) * 100}%` }} /></i><em>{hpB} / {maxHp}</em></div>
                    <div className="battle-stat"><span>MP</span><i><b className="battle-mp-fill" style={{ width: `${(mpB / maxMp) * 100}%` }} /></i><em>{mpB} / {maxMp}</em></div>
                  </div>
                </div>

                <div className="battle-command-line">
                  {running && copy.waitingEngine}
                  {!running && result && copy.replaySaved}
                  {!running && !result && errorMessage}
                </div>
              </section>

              <section className="battle-panel battle-log-panel">
                <div className="battle-section-title">{copy.logTitle}</div>
                <div className="battle-rule" />
                <div className="battle-log-list" ref={logRef}>
                  {turns.length === 0 && (
                    <div className="battle-empty-log">
                      <BattleSkull />
                      <span>{copy.waitingStart}</span>
                    </div>
                  )}
                  {turns.map((turn) => (
                    <div key={`${turn.round}-${turn.turn}`} className="battle-log-entry">
                      <BattleSkull />
                      <div>
                        <strong>{copy.roundTurn(turn.round, turn.turn)}</strong>
                        <p>{selectedLeft?.name ?? "A"}: {translateAction(turn.action_a, lang)}</p>
                        <p>{selectedRight?.name ?? "B"}: {translateAction(turn.action_b, lang)}</p>
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
                        <strong>{copy.simulationFinished}</strong>
                        <p>{copy.turnsUsed}: {result.turns_played}</p>
                        <p>{copy.winner}: {result.winner}</p>
                        <p>{copy.reason}: {translateReason(result.loss_reason, lang)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <footer className="battle-footer">
          <span><b>♥</b> {copy.confirmNext}</span>
          <span><b>X</b> {copy.backHome}</span>
          {phase === "battle" && result && <button type="button" onClick={resetBattle}>{copy.restart}</button>}
        </footer>
      </div>
    </UCWindow>
  );
}
