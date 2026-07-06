export type TournamentMatchStatus = "pending" | "running" | "completed" | "needs_review";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface TournamentMatch {
  id: string;
  status: TournamentMatchStatus;
  slots: number[];
  sources: string[];
  winnerSlot: number | null;
  loserSlot: number | null;
  replayId?: string;
  updatedAt?: string;
}

export interface TournamentRound {
  id: string;
  title: LocalizedText;
  matches: TournamentMatch[];
}

export interface S1Tournament {
  season: string;
  name: string;
  format: string;
  status: string;
  capacity: number;
  updatedAt: string;
  bracket: {
    left: TournamentRound[];
    right: TournamentRound[];
    final: TournamentMatch;
    thirdPlace: TournamentMatch;
  };
  placements: {
    championSlot: number | null;
    runnerUpSlot: number | null;
    thirdPlaceSlot: number | null;
    fourthPlaceSlot: number | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStatus(value: unknown): TournamentMatchStatus {
  return value === "running" || value === "completed" || value === "needs_review" ? value : "pending";
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeTitle(value: unknown, fallbackZh: string, fallbackEn: string): LocalizedText {
  if (!isRecord(value)) {
    return { zh: fallbackZh, en: fallbackEn };
  }
  return {
    zh: asString(value.zh, fallbackZh),
    en: asString(value.en, fallbackEn),
  };
}

function normalizeMatch(value: unknown, fallbackId: string): TournamentMatch {
  const source = isRecord(value) ? value : {};
  return {
    id: asString(source.id, fallbackId),
    status: normalizeStatus(source.status),
    slots: normalizeNumberArray(source.slots),
    sources: normalizeStringArray(source.sources),
    winnerSlot: asNumberOrNull(source.winnerSlot),
    loserSlot: asNumberOrNull(source.loserSlot),
    replayId: asString(source.replayId) || undefined,
    updatedAt: asString(source.updatedAt) || undefined,
  };
}

function normalizeRound(value: unknown, fallbackId: string, fallbackZh: string, fallbackEn: string): TournamentRound {
  const source = isRecord(value) ? value : {};
  const rawMatches = Array.isArray(source.matches) ? source.matches : [];
  return {
    id: asString(source.id, fallbackId),
    title: normalizeTitle(source.title, fallbackZh, fallbackEn),
    matches: rawMatches.map((match, index) => normalizeMatch(match, `${fallbackId}-${index + 1}`)),
  };
}

function createDefaultSide(prefix: "L" | "R", startSlot: number, sideId: "left" | "right"): TournamentRound[] {
  const titles = [
    ["round_of_32", "32强", "Round of 32", 8],
    ["round_of_16", "16强", "Round of 16", 4],
    ["quarterfinal", "8强", "Quarterfinals", 2],
    ["semifinal", "4强", "Semifinals", 1],
  ] as const;

  return titles.map(([id, zh, en, count], roundIndex) => ({
    id: `${sideId}_${id}`,
    title: { zh, en },
    matches: Array.from({ length: count }, (_, matchIndex) => {
      const matchNumber = String(matchIndex + 1).padStart(2, "0");
      if (roundIndex === 0) {
        return {
          id: `${prefix}-R32-${matchNumber}`,
          status: "pending" as const,
          slots: [startSlot + matchIndex * 2, startSlot + matchIndex * 2 + 1],
          sources: [],
          winnerSlot: null,
          loserSlot: null,
        };
      }

      const previousPrefix = roundIndex === 1 ? "R32" : roundIndex === 2 ? "R16" : "QF";
      return {
        id: `${prefix}-${roundIndex === 1 ? "R16" : roundIndex === 2 ? "QF" : "SF"}-${matchNumber}`,
        status: "pending" as const,
        slots: [],
        sources: [`${prefix}-${previousPrefix}-${String(matchIndex * 2 + 1).padStart(2, "0")}`, `${prefix}-${previousPrefix}-${String(matchIndex * 2 + 2).padStart(2, "0")}`],
        winnerSlot: null,
        loserSlot: null,
      };
    }),
  }));
}

export function createDefaultS1Tournament(): S1Tournament {
  return {
    season: "S1",
    name: "S1: Origin",
    format: "single_elimination_with_third_place",
    status: "preparing",
    capacity: 32,
    updatedAt: "",
    bracket: {
      left: createDefaultSide("L", 1, "left"),
      right: createDefaultSide("R", 17, "right"),
      final: normalizeMatch({ id: "S1-FINAL", sources: ["L-SF-01", "R-SF-01"] }, "S1-FINAL"),
      thirdPlace: normalizeMatch({ id: "S1-THIRD", sources: ["L-SF-01:loser", "R-SF-01:loser"] }, "S1-THIRD"),
    },
    placements: {
      championSlot: null,
      runnerUpSlot: null,
      thirdPlaceSlot: null,
      fourthPlaceSlot: null,
    },
  };
}

export function normalizeS1Tournament(value: unknown): S1Tournament {
  const fallback = createDefaultS1Tournament();
  if (!isRecord(value)) {
    return fallback;
  }

  const bracket = isRecord(value.bracket) ? value.bracket : {};
  const placements = isRecord(value.placements) ? value.placements : {};
  const left = Array.isArray(bracket.left) ? bracket.left : [];
  const right = Array.isArray(bracket.right) ? bracket.right : [];

  return {
    season: asString(value.season, fallback.season),
    name: asString(value.name, fallback.name),
    format: asString(value.format, fallback.format),
    status: asString(value.status, fallback.status),
    capacity: typeof value.capacity === "number" ? value.capacity : fallback.capacity,
    updatedAt: asString(value.updatedAt, fallback.updatedAt),
    bracket: {
      left: fallback.bracket.left.map((round, index) =>
        normalizeRound(left[index], round.id, round.title.zh, round.title.en),
      ),
      right: fallback.bracket.right.map((round, index) =>
        normalizeRound(right[index], round.id, round.title.zh, round.title.en),
      ),
      final: normalizeMatch(bracket.final, fallback.bracket.final.id),
      thirdPlace: normalizeMatch(bracket.thirdPlace, fallback.bracket.thirdPlace.id),
    },
    placements: {
      championSlot: asNumberOrNull(placements.championSlot),
      runnerUpSlot: asNumberOrNull(placements.runnerUpSlot),
      thirdPlaceSlot: asNumberOrNull(placements.thirdPlaceSlot),
      fourthPlaceSlot: asNumberOrNull(placements.fourthPlaceSlot),
    },
  };
}

export async function loadS1Tournament(): Promise<S1Tournament> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return normalizeS1Tournament(await invoke<unknown>("get_s1_tournament"));
  } catch {
    return createDefaultS1Tournament();
  }
}
