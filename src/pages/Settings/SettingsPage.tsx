import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import { useSettingsStore } from "../../store/settingsStore";
import "./SettingsPage.css";

interface SettingsPageProps {
  goBack: () => void;
}

const copy = {
  zh: {
    eyebrow: "系统配置",
    title: "设置",
    back: "返回",
    language: "语言",
    languageDesc: "切换主界面与功能页面的显示语言。",
    languageButton: "中文 / English",
    speed: "模拟倍速",
    speedDesc: "0 代表立刻完成本轮模拟，并保留完整日志。",
    instant: "立即完成",
    volume: "音量",
    volumeDesc: "预留给后续主界面配乐和战斗音效。",
    keys: "按键指南",
    keyRows: [
      ["↑↓ / WS", "选择"],
      ["←→ / AD", "调整"],
      ["Z / Enter", "确认"],
      ["X / Esc", "返回"],
      ["I", "导入"],
      ["E", "导出"],
      ["D", "删除"],
      ["Space", "播放 / 暂停"],
    ],
  },
  en: {
    eyebrow: "System Config",
    title: "Settings",
    back: "Back",
    language: "Language",
    languageDesc: "Switch the display language used by the home screen and feature pages.",
    languageButton: "English / 中文",
    speed: "Simulation Speed",
    speedDesc: "0 resolves the current simulation instantly while keeping the complete log.",
    instant: "Instant",
    volume: "Volume",
    volumeDesc: "Reserved for future home music and battle sound effects.",
    keys: "Key Guide",
    keyRows: [
      ["↑↓ / WS", "Select"],
      ["←→ / AD", "Adjust"],
      ["Z / Enter", "Confirm"],
      ["X / Esc", "Back"],
      ["I", "Import"],
      ["E", "Export"],
      ["D", "Delete"],
      ["Space", "Play / Pause"],
    ],
  },
};

function speedLabel(speed: number, instantLabel: string) {
  if (speed === 0) {
    return instantLabel;
  }
  return `${speed.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
}

export default function SettingsPage({ goBack }: SettingsPageProps) {
  const { i18n } = useTranslation();
  const { battleSpeed, volume, setBattleSpeed, setVolume } = useSettingsStore();
  const lang = i18n.language.startsWith("en") ? "en" : "zh";
  const t = copy[lang];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "x" || event.key === "X" || event.key === "Escape") {
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "zh" : "en";
    i18n.changeLanguage(nextLang);
    window.localStorage.setItem("uce_language", nextLang);
  };

  return (
    <UCWindow>
      <main className="settings-shell">
        <header className="settings-header">
          <div>
            <span>{t.eyebrow}</span>
            <h1>{t.title}</h1>
          </div>
          <button type="button" onClick={goBack}>
            X / {t.back}
          </button>
        </header>

        <section className="settings-board">
          <article className="settings-card settings-card-language">
            <div className="settings-card-copy">
              <span>01</span>
              <h2>{t.language}</h2>
              <p>{t.languageDesc}</p>
            </div>
            <button className="settings-language-button" type="button" onClick={toggleLanguage}>
              {t.languageButton}
            </button>
          </article>

          <article className="settings-card">
            <div className="settings-card-copy">
              <span>02</span>
              <h2>{t.speed}</h2>
              <p>{t.speedDesc}</p>
            </div>
            <div className="settings-control">
              <div className="settings-value">{speedLabel(battleSpeed, t.instant)}</div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.25"
                value={battleSpeed}
                onChange={(event) => setBattleSpeed(Number(event.target.value))}
                className="settings-slider"
              />
              <div className="settings-slider-scale">
                <span>0</span>
                <span>1x</span>
                <span>2x</span>
                <span>3x</span>
              </div>
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-copy">
              <span>03</span>
              <h2>{t.volume}</h2>
              <p>{t.volumeDesc}</p>
            </div>
            <div className="settings-control">
              <div className="settings-value">{volume}%</div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="settings-slider"
              />
              <div className="settings-slider-scale">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </article>

          <article className="settings-card settings-card-keys">
            <div className="settings-card-copy">
              <span>04</span>
              <h2>{t.keys}</h2>
            </div>
            <div className="settings-key-grid">
              {t.keyRows.map(([keyName, action]) => (
                <div className="settings-key-row" key={keyName}>
                  <kbd>{keyName}</kbd>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </UCWindow>
  );
}
