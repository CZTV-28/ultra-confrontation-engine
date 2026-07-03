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
  const lang = i18n.language.startsWith("en") ? "en" : "zh";
  const isEnglish = lang === "en";

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
    const nextLang = isEnglish ? "zh" : "en";
    i18n.changeLanguage(nextLang);
    window.localStorage.setItem("uce_language", nextLang);
  };

  const speedLabel =
    battleSpeed === 0
      ? isEnglish
        ? "Instant"
        : "立即完成"
      : `${battleSpeed.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;

  return (
    <UCWindow>
      <UCPanel width="800px" padding="50px">
        <h1 className="settings-title">{t("settings")}</h1>

        <div className="settings-section">
          <div className="settings-label">
            {isEnglish ? "Language" : "语言 / Language"}
          </div>
          <UCButton
            text={isEnglish ? "English → 中文" : "中文 → English"}
            onClick={toggleLanguage}
          />
        </div>

        <div className="settings-section">
          <div className="settings-label">
            {isEnglish ? "Simulation Speed" : "模拟倍速"}: {speedLabel}
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.25"
            value={battleSpeed}
            onChange={(e) => setBattleSpeed(Number(e.target.value))}
            className="settings-slider"
          />
          <div className="settings-slider-scale">
            <span>0</span>
            <span>1x</span>
            <span>2x</span>
            <span>3x</span>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">
            {isEnglish ? "Volume" : "音量"}: {volume}%
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
            {isEnglish ? "Key Guide" : "按键指南"}
          </div>
          <div className="settings-guide-grid">
            <span><span className="guide-key">↑↓/WS</span> {isEnglish ? "Select" : "选择"}</span>
            <span><span className="guide-key">←→/AD</span> {isEnglish ? "Adjust" : "调整"}</span>
            <span><span className="guide-key">Z/Enter</span> {isEnglish ? "Confirm" : "确认"}</span>
            <span><span className="guide-key">X</span> {isEnglish ? "Back" : "返回"}</span>
            <span><span className="guide-key">E</span> {isEnglish ? "Export" : "导出"}</span>
            <span><span className="guide-key">I</span> {isEnglish ? "Import" : "导入"}</span>
            <span><span className="guide-key">D</span> {isEnglish ? "Delete" : "删除"}</span>
            <span><span className="guide-key">Space</span> {isEnglish ? "Play/Pause" : "播放/暂停"}</span>
          </div>
        </div>
      </UCPanel>
    </UCWindow>
  );
}
