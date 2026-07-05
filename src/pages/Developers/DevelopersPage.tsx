import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import {
  addDeveloperProfile,
  readDeveloperProfiles,
  readDeveloperSession,
  type DeveloperDraft,
  type DeveloperProfile,
  type DeveloperSession,
} from "../../services/developerAccess";
import { normalizePortraitDataUrl } from "../../utils/portraitImage";
import "./DevelopersPage.css";

interface DevelopersPageProps {
  goBack: () => void;
}

const emptyDraft: DeveloperDraft = {
  id: "",
  name: "",
  role: "",
  key: "",
  avatarDataUrl: "",
};

function initials(profile: DeveloperProfile) {
  const source = profile.name.trim() || profile.id.trim();
  return source.slice(0, 2).toUpperCase();
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || "avatar";
}

function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  return "image/png";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
}

export default function DevelopersPage({ goBack }: DevelopersPageProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith("en");
  const [session, setSession] = useState<DeveloperSession | null>(() => readDeveloperSession());
  const [profiles, setProfiles] = useState<DeveloperProfile[]>(() => readDeveloperProfiles());
  const [draft, setDraft] = useState<DeveloperDraft>(emptyDraft);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") {
          event.preventDefault();
          goBack();
        }
        return;
      }

      if (event.key === "x" || event.key === "X" || event.key === "Escape") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  useEffect(() => {
    setSession(readDeveloperSession());
    setProfiles(readDeveloperProfiles());
  }, []);

  const updateDraft = (next: Partial<DeveloperDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const uploadAvatar = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Developer Avatar", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!selectedPath) {
        return;
      }

      const fileName = fileNameFromPath(selectedPath);
      const mimeType = mimeTypeFromFileName(fileName);
      const bytes = await readFile(selectedPath);
      const rawDataUrl = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
      const dataUrl = await normalizePortraitDataUrl(rawDataUrl, mimeType);
      updateDraft({ avatarDataUrl: dataUrl });
      setStatus(isEnglish ? "Avatar loaded." : "头像已载入。");
    } catch (error) {
      console.error(error);
      setStatus(isEnglish ? "Avatar upload failed." : "头像上传失败。");
    }
  };

  const submitDeveloper = async () => {
    if (!session?.owner) {
      setStatus(isEnglish ? "Only the owner can add developers." : "只有所有者可以添加开发者。");
      return;
    }

    try {
      await addDeveloperProfile(draft);
      setDraft(emptyDraft);
      setProfiles(readDeveloperProfiles());
      setStatus(isEnglish ? "Developer added." : "开发者已添加。");
    } catch (error) {
      console.error(error);
      setStatus(isEnglish ? "Developer information is invalid or duplicated." : "开发者信息无效或 ID 重复。");
    }
  };

  if (!session) {
    return (
      <UCWindow>
        <main className="developers-shell developers-denied">
          <section className="developers-access-panel">
            <span>{isEnglish ? "Restricted" : "受限入口"}</span>
            <h1>{isEnglish ? "Developer verification required" : "需要开发者身份验证"}</h1>
            <p>{isEnglish ? "Return to the home screen and enter a valid developer ID and key." : "请返回主页，输入有效的开发者 ID 和密钥后再进入。"}</p>
            <button type="button" onClick={goBack}>
              {isEnglish ? "Back" : "返回"}
            </button>
          </section>
        </main>
      </UCWindow>
    );
  }

  return (
    <UCWindow>
      <main className="developers-shell">
        <header className="developers-header">
          <div>
            <span>{isEnglish ? "Internal Registry" : "内部名单"}</span>
            <h1>{isEnglish ? "Developer List" : "开发者列表"}</h1>
          </div>
          <button type="button" onClick={goBack}>
            X / {isEnglish ? "Back" : "返回"}
          </button>
        </header>

        <section className="developers-content">
          <div className="developers-list">
            {profiles.map((profile) => (
              <article className="developers-card" key={profile.id}>
                <div className="developers-avatar">
                  {profile.avatarDataUrl ? <img src={profile.avatarDataUrl} alt="" /> : <span>{initials(profile)}</span>}
                </div>
                <div className="developers-info">
                  <h2>{profile.name}</h2>
                  <dl>
                    <div>
                      <dt>{isEnglish ? "Developer ID" : "开发者 ID"}</dt>
                      <dd>{profile.id}</dd>
                    </div>
                    <div>
                      <dt>{isEnglish ? "Role" : "职能"}</dt>
                      <dd>{profile.role}</dd>
                    </div>
                  </dl>
                </div>
                {profile.owner ? <span className="developers-owner">{isEnglish ? "Owner" : "所有者"}</span> : null}
              </article>
            ))}
          </div>

          <aside className="developers-editor">
            <div className="developers-editor-head">
              <span>{session.owner ? (isEnglish ? "Owner Tools" : "所有者工具") : (isEnglish ? "Read Only" : "只读模式")}</span>
              <h2>{isEnglish ? "Developer Profile" : "开发者信息"}</h2>
            </div>

            {session.owner ? (
              <form
                className="developers-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitDeveloper();
                }}
              >
                <label>
                  <span>{isEnglish ? "Developer ID" : "开发者 ID"}</span>
                  <input value={draft.id} onChange={(event) => updateDraft({ id: event.target.value })} />
                </label>
                <label>
                  <span>{isEnglish ? "Display Name" : "显示名称"}</span>
                  <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
                </label>
                <label>
                  <span>{isEnglish ? "Role" : "职能"}</span>
                  <input value={draft.role} onChange={(event) => updateDraft({ role: event.target.value })} placeholder={isEnglish ? "Developer" : "开发者"} />
                </label>
                <label>
                  <span>{isEnglish ? "Initial Key" : "初始密钥"}</span>
                  <input
                    type="password"
                    value={draft.key}
                    onChange={(event) => updateDraft({ key: event.target.value })}
                  />
                </label>
                <div className="developers-avatar-uploader">
                  <div className="developers-avatar developers-avatar-preview">
                    {draft.avatarDataUrl ? <img src={draft.avatarDataUrl} alt="" /> : <span>ID</span>}
                  </div>
                  <button type="button" onClick={() => void uploadAvatar()}>
                    {isEnglish ? "Upload Avatar" : "上传头像"}
                  </button>
                </div>
                <button className="developers-submit" type="submit">
                  {isEnglish ? "Add Developer" : "添加开发者"}
                </button>
              </form>
            ) : (
              <p className="developers-readonly">
                {isEnglish
                  ? "You can view the internal developer list. Editing is reserved for the project owner."
                  : "你可以查看内部开发者名单。新增和修改开发者信息仅限项目所有者。"}
              </p>
            )}

            {status ? <p className="developers-status">{status}</p> : null}
          </aside>
        </section>
      </main>
    </UCWindow>
  );
}
