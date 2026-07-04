export const S1_ROSTER_SIZE = 32;
export const S1_ROSTER_STORAGE_KEY = "uce_s1_roster";

export type S1ReviewDecision = "pending" | "approved" | "rejected";
export type S1RosterStatus = "empty" | "pending_review" | "approved" | "rejected" | "imported" | "trained";

export interface S1RosterSlot {
  slot: number;
  status: S1RosterStatus;
  characterId: string;
  characterName: string;
  creator: string;
  sourcePath: string;
  reviewDecision: S1ReviewDecision;
  officialNotes: string;
  checksum: string;
  reviewPackageStatus: string;
  updatedAt: string;
}

export interface S1RosterEntryInput {
  slot: number;
  characterId: string;
  characterName: string;
  creator: string;
  sourcePath: string;
  reviewDecision: S1ReviewDecision;
  officialNotes: string;
  checksum: string;
  reviewPackageStatus: string;
}

export interface S1RosterStats {
  total: number;
  occupied: number;
  empty: number;
  pending: number;
  approved: number;
  rejected: number;
  imported: number;
  trained: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function createEmptySlot(slot: number): S1RosterSlot {
  return {
    slot,
    status: "empty",
    characterId: "",
    characterName: "",
    creator: "",
    sourcePath: "",
    reviewDecision: "pending",
    officialNotes: "",
    checksum: "",
    reviewPackageStatus: "",
    updatedAt: "",
  };
}

function normalizeDecision(value: unknown): S1ReviewDecision {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function statusFromDecision(decision: S1ReviewDecision): S1RosterStatus {
  if (decision === "approved") {
    return "approved";
  }
  if (decision === "rejected") {
    return "rejected";
  }
  return "pending_review";
}

function normalizeStatus(value: unknown, decision: S1ReviewDecision): S1RosterStatus {
  if (
    value === "empty" ||
    value === "pending_review" ||
    value === "approved" ||
    value === "rejected" ||
    value === "imported" ||
    value === "trained"
  ) {
    return value;
  }

  return statusFromDecision(decision);
}

function normalizeSlot(value: unknown, fallbackSlot: number): S1RosterSlot {
  if (!isRecord(value)) {
    return createEmptySlot(fallbackSlot);
  }

  const slot = Math.min(S1_ROSTER_SIZE, Math.max(1, Math.trunc(asNumber(value.slot, fallbackSlot))));
  const decision = normalizeDecision(value.reviewDecision);
  const characterId = asString(value.characterId).trim();
  const status = characterId ? normalizeStatus(value.status, decision) : "empty";

  return {
    slot,
    status,
    characterId,
    characterName: asString(value.characterName).trim(),
    creator: asString(value.creator).trim(),
    sourcePath: asString(value.sourcePath).trim(),
    reviewDecision: decision,
    officialNotes: asString(value.officialNotes),
    checksum: asString(value.checksum).trim(),
    reviewPackageStatus: asString(value.reviewPackageStatus).trim(),
    updatedAt: asString(value.updatedAt).trim(),
  };
}

function getRawRoster() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(S1_ROSTER_STORAGE_KEY);
}

function notifyRosterUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("uce:s1-roster-updated"));
  }
}

export function createEmptyS1Roster(): S1RosterSlot[] {
  return Array.from({ length: S1_ROSTER_SIZE }, (_, index) => createEmptySlot(index + 1));
}

export function readS1Roster(): S1RosterSlot[] {
  const emptyRoster = createEmptyS1Roster();
  const raw = getRawRoster();

  if (!raw) {
    return emptyRoster;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return emptyRoster;
    }

    const bySlot = new Map<number, S1RosterSlot>();
    parsed.forEach((slotValue, index) => {
      const normalized = normalizeSlot(slotValue, index + 1);
      bySlot.set(normalized.slot, normalized);
    });

    return emptyRoster.map((slot) => bySlot.get(slot.slot) ?? slot);
  } catch (error) {
    console.error("Failed to read S1 roster", error);
    return emptyRoster;
  }
}

export function writeS1Roster(roster: S1RosterSlot[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(S1_ROSTER_STORAGE_KEY, JSON.stringify(roster));
  notifyRosterUpdated();
}

export function findS1RosterSlot(roster: S1RosterSlot[], characterId: string) {
  const normalizedId = characterId.trim();
  if (!normalizedId) {
    return undefined;
  }

  return roster.find((slot) => slot.characterId === normalizedId);
}

export function getFirstEmptyS1RosterSlot(roster: S1RosterSlot[]) {
  return roster.find((slot) => slot.status === "empty");
}

export function upsertS1RosterEntry(input: S1RosterEntryInput): S1RosterSlot[] {
  const roster = readS1Roster();
  const safeSlot = Math.min(S1_ROSTER_SIZE, Math.max(1, Math.trunc(input.slot)));
  const currentIndex = roster.findIndex((slot) => slot.slot === safeSlot);
  const targetIndex = currentIndex >= 0 ? currentIndex : safeSlot - 1;
  const status = statusFromDecision(input.reviewDecision);

  const nextRoster = [...roster];
  nextRoster[targetIndex] = {
    slot: safeSlot,
    status,
    characterId: input.characterId.trim(),
    characterName: input.characterName.trim(),
    creator: input.creator.trim(),
    sourcePath: input.sourcePath.trim(),
    reviewDecision: input.reviewDecision,
    officialNotes: input.officialNotes,
    checksum: input.checksum.trim(),
    reviewPackageStatus: input.reviewPackageStatus.trim(),
    updatedAt: new Date().toISOString(),
  };

  writeS1Roster(nextRoster);
  return nextRoster;
}

export function updateS1RosterEntryStatus(characterId: string, status: S1RosterStatus): S1RosterSlot[] {
  const normalizedId = characterId.trim();
  const roster = readS1Roster();
  const targetIndex = roster.findIndex((slot) => slot.characterId === normalizedId);

  if (!normalizedId || targetIndex < 0) {
    return roster;
  }

  const nextRoster = [...roster];
  const current = nextRoster[targetIndex];
  nextRoster[targetIndex] = {
    ...current,
    status,
    reviewDecision: status === "rejected" ? "rejected" : current.reviewDecision,
    updatedAt: new Date().toISOString(),
  };

  writeS1Roster(nextRoster);
  return nextRoster;
}

export function getS1RosterStats(roster: S1RosterSlot[]): S1RosterStats {
  return roster.reduce<S1RosterStats>(
    (stats, slot) => {
      if (slot.status === "empty") {
        stats.empty += 1;
      } else {
        stats.occupied += 1;
      }

      if (slot.status === "pending_review") {
        stats.pending += 1;
      } else if (slot.status === "approved") {
        stats.approved += 1;
      } else if (slot.status === "rejected") {
        stats.rejected += 1;
      } else if (slot.status === "imported") {
        stats.imported += 1;
      } else if (slot.status === "trained") {
        stats.trained += 1;
      }

      return stats;
    },
    {
      total: S1_ROSTER_SIZE,
      occupied: 0,
      empty: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      imported: 0,
      trained: 0,
    },
  );
}
