import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import UCMenuItem from "../../components/common/UCMenuItem/UCMenuItem";
import "./HomePage.css";

interface HomePageProps {
  navigateTo: (page: "home" | "battle" | "trainer" | "replay" | "settings") => void;
  goBack: () => void;
}

export default function HomePage({ navigateTo }: HomePageProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems = [
    { label: t("startSimulation"), action: "start", page: "battle" as const },
    { label: t("aiTrainer"), action: "trainer", page: "trainer" as const },
    { label: t("replay"), action: "replay", page: "replay" as const },
    { label: t("settings"), action: "settings", page: "settings" as const },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? menuItems.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === menuItems.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
        navigateTo(menuItems[selectedIndex].page);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, navigateTo, menuItems]);

  return (
    <UCWindow>
      <div className="home-background">
        <div className="home-stars">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="home-star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>
      <UCPanel>
        <div className="home-panel">
          <div className="home-emblem">
            <div className="home-emblem-heart">♥</div>
            <div className="home-emblem-ring" />
          </div>

          <h1 className="title">{t("title")}</h1>

          <div className="menu-list">
            {menuItems.map((item, index) => (
              <div key={item.action} className="menu-item-wrapper">
                <UCMenuItem
                  text={item.label}
                  isSelected={index === selectedIndex}
                  index={index}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => navigateTo(item.page)}
                />
                {index < menuItems.length - 1 && <div className="menu-separator" />}
              </div>
            ))}
          </div>
        </div>
      </UCPanel>
      <div className="bottom-info">
        <span>{t("subtitle")}</span>
        <span className="home-sep">|</span>
        <span className="version">v0.1.0</span>
      </div>
      <div className="home-hint">
        <span className="hint-arrow">↑↓/WS</span> 选择 · <span className="hint-key">Z</span> 确认 · <span className="hint-key">X</span> 返回
      </div>
    </UCWindow>
  );
}