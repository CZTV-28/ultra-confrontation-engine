import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import "./HomePage.css";

type Page = "home" | "battle" | "trainer" | "replay" | "settings";

interface HomePageProps {
  navigateTo: (page: Page) => void;
  goBack: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  page?: Page;
}

function HomeSkull() {
  return (
    <svg className="home-skull" viewBox="0 0 64 64" aria-hidden="true">
      <g shapeRendering="crispEdges">
        <rect x="18" y="8" width="28" height="8" fill="#f5f5f5" />
        <rect x="10" y="16" width="44" height="24" fill="#f5f5f5" />
        <rect x="16" y="40" width="32" height="8" fill="#f5f5f5" />
        <rect x="18" y="22" width="10" height="10" fill="#050505" />
        <rect x="36" y="22" width="10" height="10" fill="#050505" />
        <rect x="30" y="33" width="6" height="6" fill="#050505" />
        <rect x="20" y="44" width="4" height="6" fill="#050505" />
        <rect x="30" y="44" width="4" height="6" fill="#050505" />
        <rect x="40" y="44" width="4" height="6" fill="#050505" />
      </g>
    </svg>
  );
}

export default function HomePage({ navigateTo }: HomePageProps) {
  const { i18n } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isEnglish = i18n.language.startsWith("en");

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: "home", label: isEnglish ? "Home" : "主页", icon: "⌂", page: "home" },
      { id: "battle", label: isEnglish ? "Simulation" : "模拟", icon: "✚", page: "battle" },
      { id: "trainer", label: isEnglish ? "AI Training" : "AI训练", icon: "✣", page: "trainer" },
      { id: "replay", label: "Replay", icon: "▶", page: "replay" },
      { id: "settings", label: isEnglish ? "Settings" : "设置", icon: "⚙", page: "settings" },
    ],
    [isEnglish],
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        left: `${(index * 31 + 9) % 96}%`,
        top: `${(index * 43 + 7) % 86}%`,
        delay: `${(index % 9) * 0.22}s`,
      })),
    [],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === 0 ? sidebarItems.length - 1 : prev - 1));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === sidebarItems.length - 1 ? 0 : prev + 1));
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
        const page = sidebarItems[selectedIndex].page;
        if (page && page !== "home") {
          navigateTo(page);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateTo, selectedIndex]);

  return (
    <UCWindow>
      <div className="home-shell">
        <aside className="home-sidebar">
          <div className="home-brand">
            <HomeSkull />
            <span>UC ENGINE</span>
          </div>

          <nav className="home-nav" aria-label="UCE navigation">
            {sidebarItems.map((item, index) => (
              <button
                key={item.id}
                className={`home-nav-item ${index === selectedIndex ? "home-nav-active" : ""}`}
                type="button"
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => item.page && item.page !== "home" && navigateTo(item.page)}
              >
                <span className="home-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="home-version">v0.1.0</div>
        </aside>

        <main className="home-main-panel">
          <div className="home-scene">
            <div className="home-stars">
              {stars.map((star, index) => (
                <span
                  key={index}
                  className="home-star"
                  style={{
                    left: star.left,
                    top: star.top,
                    animationDelay: star.delay,
                  }}
                />
              ))}
            </div>
            <div className="home-arch home-arch-left" />
            <div className="home-arch home-arch-right" />
            <div className="home-column home-column-left" />
            <div className="home-column home-column-right" />
            <div className="home-disc home-disc-back" />
            <div className="home-disc home-disc-front" />
            <div className="home-light home-light-left" />
            <div className="home-light home-light-right" />
          </div>

          <div className={`home-title-block ${isEnglish ? "home-title-block-en" : "home-title-block-zh"}`}>
            {isEnglish ? (
              <>
                <div className="home-title">
                  ULTRA<span>♥</span>
                </div>
                <div className="home-title-sub">CONFRONTATION</div>
              </>
            ) : (
              <div className="home-title-zh" aria-label="超类史诗">
                {"超类史诗".split("").map((char, index) => (
                  <span key={char} style={{ animationDelay: `${index * 0.12}s` }}>
                    {char}
                  </span>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="home-footer">
          <span><span className="home-footer-heart">♥</span> {isEnglish ? "Confirm" : "确认"}</span>
          <span><span className="home-footer-x">×</span> {isEnglish ? "Back" : "返回"}</span>
        </footer>
      </div>
    </UCWindow>
  );
}
