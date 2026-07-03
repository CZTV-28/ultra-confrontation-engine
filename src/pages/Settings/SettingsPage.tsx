import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import UCButton from "../../components/common/UCButton/UCButton";
import { useSettingsStore } from "../../store/settingsStore";
import "./SettingsPage.css";

interface SettingsPageProps {
  goBack: () => void;
}

export default function SettingsPage({ goBack }: SettingsPageProps) {
  const { t, i18n } = useTranslation();
  const { battleSpeed, volume, setBattleSpeed, setVolume } = useSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(nextLang);
  };

  const lang = i18n.language;

  const speedOptions = [
    { label: lang === "zh" ? "0.5秒" : "0.5s", value: 500 },
    { label: lang === "zh" ? "1秒" : "1s", value: 1000 },
    { label: lang === "zh" ? "2秒" : "2s", value: 2000 },
    { label: lang === "zh" ? "3秒" : "3s", value: 3000 },
  ];

  return (
    <UCWindow>
      <UCPanel width="800px" padding="50px">
        <h1 className="settings-title">{t("settings")}</h1>

        <div className="settings-section">
          <div className="settings-label">
            {lang === "zh" ? "语言 / Language" : "Language"}
          </div>
          <UCButton
            text={i18n.language === "zh" ? "中文 → English" : "English → 中文"}
            onClick={toggleLanguage}
          />
        </div>

        <div className="settings-section">
          <div className="settings-label">
            {lang === "zh" ? "模拟速度" : "Battle Speed"}
          </div>
          <div className="settings-options">
            {speedOptions.map((opt) => (
              <button
                key={opt.value}
                className={`settings-option-btn ${battleSpeed === opt.value ? "settings-option-active" : ""}`}
                onClick={() => setBattleSpeed(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">
            {lang === "zh" ? "音量" : "Volume"}: {volume}%
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="settings-slider"
          />
        </div>

        <div className="settings-guide">
          <div className="settings-guide-title">
            {lang === "zh" ? "按键指南" : "Key Guide"}
          </div>
          <div className="settings-guide-grid">
            <span><span className="guide-key">↑↓/WS</span> {lang === "zh" ? "选择" : "Select"}</span>
            <span><span className="guide-key">←→/AD</span> {lang === "zh" ? "调整" : "Adjust"}</span>
            <span><span className="guide-key">Z/Enter</span> {lang === "zh" ? "确认" : "Confirm"}</span>
            <span><span className="guide-key">X</span> {lang === "zh" ? "返回" : "Back"}</span>
            <span><span className="guide-key">E</span> {lang === "zh" ? "导出" : "Export"}</span>
            <span><span className="guide-key">I</span> {lang === "zh" ? "导入" : "Import"}</span>
            <span><span className="guide-key">D</span> {lang === "zh" ? "删除" : "Delete"}</span>
            <span><span className="guide-key">Space</span> {lang === "zh" ? "播放/暂停" : "Play/Pause"}</span>
          </div>
        </div>
      </UCPanel>
    </UCWindow>
  );
}