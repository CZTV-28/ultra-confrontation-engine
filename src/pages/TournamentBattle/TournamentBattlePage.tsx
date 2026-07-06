import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import { loadS1PublicRoster, type S1RosterSlot } from "../../services/s1Roster";
import {
  loadS1Tournament,
  type S1Tournament,
  type TournamentMatch,
  type TournamentMatchStatus,
} from "../../services/s1Tournament";
import "./TournamentBattlePage.css";

interface TournamentBattlePageProps {
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
}

interface BattleResult {
  winner: string;
  winner_character_id: string;
  rounds_played: number;
  turns_played: number;
  final_hp_a: number;
  final_hp_b: number;
  loss_reason: string;
  replay_id: string;
  turns: TurnRecord[];
}

interface ArenaResource {
  id: string;
  name: string;
}

interface RulesetResource {
  season: string;
  name: string;
}

interface S1MatchRecordResult {
  matchId: string;
  winnerSlot: number;
  loserSlot: number;
  updatedAt: string;
}

interface TournamentParticipant {
  slot: number;
  characterId: string;
  characterName: string;
  projectName: string;
  creator: string;
}

interface ReadyTournamentMatch {
  id: string;
  status: TournamentMatchStatus;
  left: TournamentParticipant;
  right: TournamentParticipant;
}

type Language = "zh" | "en";
type TournamentModuleId = "S1" | "S2" | "S3" | "S4";

const MAX_TOURNAMENT_STEPS = 2200;

const tournamentModules: Array<{
  id: TournamentModuleId;
  title: Record<Language, string>;
  mode: Record<Language, string>;
  enabled: boolean;
}> = [
  {
    id: "S1",
    title: {
      zh: "S1：起源",
      en: "S1: Origin",
    },
    mode: {
      zh: "AI 模拟对抗",
      en: "AI Simulation",
    },
    enabled: true,
  },
  {
    id: "S2",
    title: {
      zh: "S2",
      en: "S2",
    },
    mode: {
      zh: "预留",
      en: "Reserved",
    },
    enabled: false,
  },
  {
    id: "S3",
    title: {
      zh: "S3",
      en: "S3",
    },
    mode: {
      zh: "预留",
      en: "Reserved",
    },
    enabled: false,
  },
  {
    id: "S4",
    title: {
      zh: "S4",
      en: "S4",
    },
    mode: {
      zh: "预留",
      en: "Reserved",
    },
    enabled: false,
  },
];

const copy = {
  zh: {
    title: "赛事对战",
    subtitle: "官方对局",
    module: "赛事模块",
    back: "返回",
    matchList: "可执行对局",
    arena: "场地",
    ruleset: "规则",
    start: "开始赛事对战",
    running: "赛事对战执行中...",
    noMatch: "暂无可执行对局",
    loading: "正在读取赛事数据...",
    loadFailed: "赛事数据读取失败",
    saved: "赛事结果已写入",
    draw: "平局未写入赛事表",
    failed: "赛事对战失败",
    winner: "胜者",
    replay: "回放",
    turns: "回合",
    slot: "席位",
    creator: "作者",
  },
  en: {
    title: "Tournament Battle",
    subtitle: "Official Match",
    module: "Tournament Module",
    back: "Back",
    matchList: "Ready Matches",
    arena: "Arena",
    ruleset: "Ruleset",
    start: "Start Tournament Battle",
    running: "Running tournament battle...",
    noMatch: "No ready matches",
    loading: "Reading tournament data...",
    loadFailed: "Failed to read tournament data",
    saved: "Tournament result saved",
    draw: "Draw was not written to bracket",
    failed: "Tournament battle failed",
    winner: "Winner",
    replay: "Replay",
    turns: "Turns",
    slot: "Slot",
    creator: "Creator",
  },
};

function allMatches(tournament: S1Tournament): TournamentMatch[] {
  return tournament.bracket.left
    .flatMap((round) => round.matches)
    .concat(tournament.bracket.right.flatMap((round) => round.matches))
    .concat([tournament.bracket.final, tournament.bracket.thirdPlace]);
}

function resolveSourceSlot(matchById: Map<string, TournamentMatch>, source: string) {
  const [matchId, sourceType] = source.split(":");
  const sourceMatch = matchById.get(matchId);
  return sourceType === "loser" ? sourceMatch?.loserSlot : sourceMatch?.winnerSlot;
}

function matchSlots(matchById: Map<string, TournamentMatch>, match: TournamentMatch) {
  if (match.slots.length > 0) {
    return match.slots;
  }
  return match.sources.map((source) => resolveSourceSlot(matchById, source)).filter((slot): slot is number => Boolean(slot));
}

function readyMatches(tournament: S1Tournament, roster: S1RosterSlot[]): ReadyTournamentMatch[] {
  const rosterBySlot = new Map(roster.map((slot) => [slot.slot, slot]));
  const matches = allMatches(tournament);
  const matchById = new Map(matches.map((match) => [match.id, match]));

  return matches
    .filter((match) => match.status !== "completed")
    .map((match) => {
      const slots = matchSlots(matchById, match);
      if (slots.length !== 2) {
        return null;
      }

      const left = rosterBySlot.get(slots[0]);
      const right = rosterBySlot.get(slots[1]);
      if (!left?.characterId || !right?.characterId) {
        return null;
      }

      return {
        id: match.id,
        status: match.status,
        left: {
          slot: left.slot,
          characterId: left.characterId,
          characterName: left.characterName || left.characterId,
          projectName: left.projectName,
          creator: left.creator,
        },
        right: {
          slot: right.slot,
          characterId: right.characterId,
          characterName: right.characterName || right.characterId,
          projectName: right.projectName,
          creator: right.creator,
        },
      };
    })
    .filter((match): match is ReadyTournamentMatch => Boolean(match));
}

export default function TournamentBattlePage({ goBack }: TournamentBattlePageProps) {
  const { i18n } = useTranslation();
  const lang: Language = i18n.language.startsWith("en") ? "en" : "zh";
  const t = copy[lang];
  const [roster, setRoster] = useState<S1RosterSlot[]>([]);
  const [tournament, setTournament] = useState<S1Tournament | null>(null);
  const [arenas, setArenas] = useState<ArenaResource[]>([]);
  const [rulesets, setRulesets] = useState<RulesetResource[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState<TournamentModuleId>("S1");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<BattleResult | null>(null);

  const matches = useMemo(
    () => (selectedModuleId === "S1" && tournament ? readyMatches(tournament, roster) : []),
    [roster, selectedModuleId, tournament],
  );
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? matches[0];
  const selectedArena = arenas[0];
  const selectedRuleset = rulesets.find((ruleset) => ruleset.season === "S1") ?? rulesets[0];

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [nextRoster, nextTournament, nextArenas, nextRulesets] = await Promise.all([
        loadS1PublicRoster(),
        loadS1Tournament(),
        invoke<ArenaResource[]>("list_arenas"),
        invoke<RulesetResource[]>("list_rulesets"),
      ]);
      setRoster(nextRoster);
      setTournament(nextTournament);
      setArenas(nextArenas);
      setRulesets(nextRulesets);
      const nextMatches = readyMatches(nextTournament, nextRoster);
      setSelectedMatchId((current) =>
        nextMatches.some((match) => match.id === current) ? current : nextMatches[0]?.id ?? "",
      );
    } catch {
      setMessage(t.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "x" || event.key === "X") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  const runTournamentBattle = async () => {
    if (!selectedMatch || !selectedArena || !selectedRuleset || running) {
      return;
    }

    setRunning(true);
    setResult(null);
    setMessage(t.running);

    try {
      const sessionId = await invoke<string>("init_battle", {
        config: {
          leftCharacterId: selectedMatch.left.characterId,
          rightCharacterId: selectedMatch.right.characterId,
          arenaId: selectedArena.id,
          rulesetId: selectedRuleset.season,
        },
      });

      const completedTurns: TurnRecord[] = [];
      for (let index = 0; index < MAX_TOURNAMENT_STEPS; index += 1) {
        try {
          completedTurns.push(await invoke<TurnRecord>("step_battle", { sessionId }));
        } catch {
          break;
        }
      }

      const finalResult = await invoke<BattleResult>("finish_battle", { sessionId });
      const normalizedResult = {
        ...finalResult,
        turns: finalResult.turns.length > 0 ? finalResult.turns : completedTurns,
      };
      setResult(normalizedResult);

      if (!normalizedResult.winner_character_id) {
        setMessage(t.draw);
        return;
      }

      const record = await invoke<S1MatchRecordResult>("record_s1_match_result", {
        input: {
          leftCharacterId: selectedMatch.left.characterId,
          rightCharacterId: selectedMatch.right.characterId,
          winnerCharacterId: normalizedResult.winner_character_id,
          replayId: normalizedResult.replay_id,
        },
      });
      setMessage(`${t.saved}: ${record.matchId}`);
      window.dispatchEvent(new CustomEvent("uce:s1-tournament-updated"));
      await loadData();
    } catch (error) {
      setMessage(`${t.failed}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <UCWindow>
      <main className="tournament-battle-shell">
        <header className="tournament-battle-header">
          <div>
            <p>{t.subtitle}</p>
            <h1>{t.title}</h1>
          </div>
          <button type="button" onClick={goBack}>
            {t.back}
          </button>
        </header>

        <section className="tournament-battle-layout">
          <section className="tournament-battle-panel">
            <div className="tournament-battle-module-row" aria-label={t.module}>
              {tournamentModules.map((module) => (
                <button
                  className={
                    module.id === selectedModuleId
                      ? "tournament-battle-module tournament-battle-module-active"
                      : "tournament-battle-module"
                  }
                  disabled={!module.enabled}
                  key={module.id}
                  type="button"
                  onClick={() => module.enabled && setSelectedModuleId(module.id)}
                >
                  <span>{module.title[lang]}</span>
                </button>
              ))}
            </div>
            <div className="tournament-battle-section-title">{t.matchList}</div>
            {loading ? <div className="tournament-battle-empty">{t.loading}</div> : null}
            {!loading && matches.length === 0 ? <div className="tournament-battle-empty">{t.noMatch}</div> : null}
            <div className="tournament-battle-match-list">
              {matches.map((match) => (
                <button
                  className={
                    match.id === selectedMatch?.id
                      ? "tournament-battle-match tournament-battle-match-active"
                      : "tournament-battle-match"
                  }
                  key={match.id}
                  type="button"
                  onClick={() => setSelectedMatchId(match.id)}
                >
                  <span>{match.id}</span>
                  <strong>
                    #{String(match.left.slot).padStart(2, "0")} {match.left.characterName}
                  </strong>
                  <em>VS</em>
                  <strong>
                    #{String(match.right.slot).padStart(2, "0")} {match.right.characterName}
                  </strong>
                </button>
              ))}
            </div>
          </section>

          <section className="tournament-battle-panel tournament-battle-control">
            {selectedMatch ? (
              <>
                <div className="tournament-battle-versus">
                  <article>
                    <span>{t.slot} #{String(selectedMatch.left.slot).padStart(2, "0")}</span>
                    <strong>{selectedMatch.left.characterName}</strong>
                    <em>{selectedMatch.left.projectName || selectedMatch.left.characterId}</em>
                    <small>{t.creator}: {selectedMatch.left.creator || "-"}</small>
                  </article>
                  <b>VS</b>
                  <article>
                    <span>{t.slot} #{String(selectedMatch.right.slot).padStart(2, "0")}</span>
                    <strong>{selectedMatch.right.characterName}</strong>
                    <em>{selectedMatch.right.projectName || selectedMatch.right.characterId}</em>
                    <small>{t.creator}: {selectedMatch.right.creator || "-"}</small>
                  </article>
                </div>

                <div className="tournament-battle-meta">
                  <span>{t.arena}: {selectedArena?.name ?? "-"}</span>
                  <span>{t.ruleset}: {selectedRuleset ? `${selectedRuleset.season} / ${selectedRuleset.name}` : "-"}</span>
                </div>

                <button
                  className="tournament-battle-start"
                  type="button"
                  onClick={runTournamentBattle}
                  disabled={running || !selectedArena || !selectedRuleset}
                >
                  {running ? t.running : t.start}
                </button>
              </>
            ) : (
              <div className="tournament-battle-empty">{t.noMatch}</div>
            )}

            {message ? <div className="tournament-battle-message">{message}</div> : null}

            {result ? (
              <section className="tournament-battle-result">
                <span>{t.winner}</span>
                <strong>{result.winner}</strong>
                <p>{t.turns}: {result.turns_played}</p>
                <p>{t.replay}: {result.replay_id}</p>
              </section>
            ) : null}
          </section>
        </section>
      </main>
    </UCWindow>
  );
}
