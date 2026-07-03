import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import ReplayDetailPage from "./ReplayDetailPage";
import "./ReplayPage.css";

interface ReplayPageProps {
  goBack: () => void;
  navigateTo: (page: "home" | "battle" | "trainer" | "replay" | "settings") => void;
}

interface ReplayData {
  id: string;
  timestamp: string;
  winner: string;
  rounds_played: number;
  turns_played: number;
  loss_reason: string;
  recorded_at: number;
  signature: string;
}

export default function ReplayPage({ goBack }: ReplayPageProps) {
  const { t, i18n } = useTranslation();
  const [replays, setReplays] = useState<ReplayData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewingReplayId, setViewingReplayId] = useState<string | null>(null);

  useEffect(() => {
    loadReplays();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingReplayId) {
        if (e.key === "x" || e.key === "X") {
          e.preventDefault();
          setViewingReplayId(null);
        }
        return;
      }

      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === 0 ? replays.length - 1 : prev - 1));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === replays.length - 1 ? 0 : prev + 1));
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
        if (replays.length > 0) {
          setViewingReplayId(replays[selectedIndex].id);
        }
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        exportSelected();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        handleImport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack, replays, selectedIndex, viewingReplayId]);

  const loadReplays = async () => {
    try {
      const data = await invoke<ReplayData[]>("list_replays");
      setReplays(data);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSelected = async () => {
    if (replays.length === 0) return;
    try {
      await invoke("delete_replay", { replayId: replays[selectedIndex].id });
      loadReplays();
      if (selectedIndex >= replays.length - 1) {
        setSelectedIndex(Math.max(0, replays.length - 2));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportSelected = async () => {
    if (replays.length === 0) return;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const data = await invoke<number[]>("export_replay", { replayId: replays[selectedIndex].id });
      const recordedAt = replays[selectedIndex].recorded_at * 1000;
      const d = new Date(recordedAt);
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("");
      const timeStr = [
        String(d.getHours()).padStart(2, "0"),
        String(d.getMinutes()).padStart(2, "0"),
        String(d.getSeconds()).padStart(2, "0"),
      ].join("");
      const winnerName = replays[selectedIndex].winner === "draw" ? "draw" : replays[selectedIndex].winner;
      const defaultName = `UC_${dateStr}_${timeStr}_${winnerName}.ucr`;

      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "UCR Replay", extensions: ["ucr"] }],
      });
      if (path) {
        await writeFile(path, new Uint8Array(data));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        filters: [{ name: "UCR Replay", extensions: ["ucr"] }],
      });
      if (path) {
        const data = await readFile(path);
        await invoke("import_replay", { data: Array.from(data) });
        loadReplays();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (viewingReplayId) {
    return (
      <ReplayDetailPage
        goBack={() => setViewingReplayId(null)}
        replayId={viewingReplayId}
      />
    );
  }

  const lang = i18n.language;

  return (
    <UCWindow>
      <UCPanel width="900px" padding="50px">
        <h1 style={{ color: "white", fontSize: "28px", marginBottom: "30px" }}>
          {t("replay")}
        </h1>

        {replays.length === 0 && (
          <div className="replay-empty">
            <div className="replay-empty-icon">&#9733;</div>
            <p>
              {lang === "zh"
                ? "这里什么都没有。去模拟一场战斗吧。"
                : "Nothing here. Go simulate a battle."}
            </p>
          </div>
        )}

        <div className="replay-list">
          {replays.map((replay, index) => (
            <div
              key={replay.id}
              className={`replay-item ${index === selectedIndex ? "replay-item-selected" : ""}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => setViewingReplayId(replay.id)}
            >
              <span className="replay-time">{replay.timestamp}</span>
              <span className="replay-winner" style={{ color: replay.winner === "draw" ? "#888" : "#ffff00" }}>
                {replay.winner}
              </span>
              <span className="replay-stats">
                {replay.rounds_played}R / {replay.turns_played}T
              </span>
              <span className="replay-reason">{replay.loss_reason}</span>
            </div>
          ))}
        </div>

        <div className="replay-actions">
          <button className="replay-action-btn" onClick={exportSelected}>
            {lang === "zh" ? "E 导出" : "E Export"}
          </button>
          <button className="replay-action-btn" onClick={handleImport}>
            {lang === "zh" ? "I 导入" : "I Import"}
          </button>
          <button className="replay-action-btn replay-action-delete" onClick={deleteSelected}>
            {lang === "zh" ? "D 删除" : "D Delete"}
          </button>
        </div>

        <div className="replay-guide">
          <p>
            <span className="guide-key">↑↓/WS</span> {lang === "zh" ? "选择回放" : "Select"}
            {"  "}
            <span className="guide-key">Z</span> {lang === "zh" ? "查看详情" : "View"}
            {"  "}
            <span className="guide-key">E</span> {lang === "zh" ? "导出" : "Export"}
            {"  "}
            <span className="guide-key">I</span> {lang === "zh" ? "导入" : "Import"}
            {"  "}
            <span className="guide-key">D</span> {lang === "zh" ? "删除" : "Delete"}
            {"  "}
            <span className="guide-key">X</span> {lang === "zh" ? "返回" : "Back"}
          </p>
        </div>
      </UCPanel>
    </UCWindow>
  );
}