export interface DeveloperProfile {
  id: string;
  name: string;
  role: string;
  avatarDataUrl: string;
  owner: boolean;
  keyHash: string;
  createdAt: string;
}

export interface DeveloperSession {
  id: string;
  name: string;
  owner: boolean;
  loggedInAt: string;
}

export interface DeveloperDraft {
  id: string;
  name: string;
  role: string;
  key: string;
  avatarDataUrl: string;
}

const DEVELOPERS_STORAGE_KEY = "uce_developers_v1";
const SESSION_STORAGE_KEY = "uce_developer_session_v1";
const DEFAULT_OWNER_ID = "CZTV-28";
const DEFAULT_OWNER_KEY_HASH = "6df72d113b4da4a64e2bbb7420bde5597061fd5c16ace30320b3b3046a51f4e2";

const defaultOwner: DeveloperProfile = {
  id: DEFAULT_OWNER_ID,
  name: "CZTV-28",
  role: "Project Owner",
  avatarDataUrl: "",
  owner: true,
  keyHash: DEFAULT_OWNER_KEY_HASH,
  createdAt: "2026-07-06T00:00:00.000Z",
};

function readStoredDevelopers() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DEVELOPERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isDeveloperProfile) : [];
  } catch {
    return [];
  }
}

function writeStoredDevelopers(developers: DeveloperProfile[]) {
  window.localStorage.setItem(DEVELOPERS_STORAGE_KEY, JSON.stringify(developers.filter((developer) => !developer.owner)));
}

function isDeveloperProfile(value: unknown): value is DeveloperProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.role === "string" &&
    typeof record.keyHash === "string"
  );
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function readDeveloperProfiles(): DeveloperProfile[] {
  const stored = readStoredDevelopers();
  const withoutOwner = stored.filter((developer) => developer.id !== DEFAULT_OWNER_ID);
  return [defaultOwner, ...withoutOwner].sort((left, right) => Number(right.owner) - Number(left.owner));
}

export function readDeveloperSession(): DeveloperSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DeveloperSession;
    return typeof parsed.id === "string" && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDeveloperSession() {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function verifyDeveloperLogin(id: string, key: string): Promise<DeveloperSession | null> {
  const normalizedId = id.trim();
  const profile = readDeveloperProfiles().find((developer) => developer.id === normalizedId);
  if (!profile) {
    return null;
  }

  const keyHash = await sha256(`${normalizedId}:${key}`);
  if (keyHash !== profile.keyHash) {
    return null;
  }

  const session: DeveloperSession = {
    id: profile.id,
    name: profile.name,
    owner: profile.owner,
    loggedInAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function addDeveloperProfile(draft: DeveloperDraft) {
  const id = draft.id.trim();
  const name = draft.name.trim();
  const key = draft.key.trim();
  if (!id || !name || !key || id === DEFAULT_OWNER_ID) {
    throw new Error("Invalid developer profile.");
  }

  const profiles = readDeveloperProfiles();
  if (profiles.some((developer) => developer.id === id)) {
    throw new Error("Developer ID already exists.");
  }

  const nextProfile: DeveloperProfile = {
    id,
    name,
    role: draft.role.trim() || "Developer",
    avatarDataUrl: draft.avatarDataUrl,
    owner: false,
    keyHash: await sha256(`${id}:${key}`),
    createdAt: new Date().toISOString(),
  };

  writeStoredDevelopers([...profiles, nextProfile]);
  return nextProfile;
}
