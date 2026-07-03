import { useEffect, useMemo, useState } from "react";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import "./HomePage.css";

type Page = "home" | "battle" | "trainer" | "replay" | "settings";

interface HomePageProps {
  navigateTo: (page: Page) => void;
  goBack: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  page?: Page;
}

const menuItems: MenuItem[] = [
  { id: "simulate", label: "创建模拟", icon: "♥", page: "battle" },
  { id: "trainer", label: "AI训练", icon: "✦", page: "trainer" },
  { id: "replay", label: "Replay", icon: "▶", page: "replay" },
  { id: "resources", label: "资源编辑器", icon: "□" },
  { id: "settings", label: "设置", icon: "⚙", page: "settings" },
  { id: "exit", label: "退出", icon: "×" },
];

const sidebarItems: MenuItem[] = [
  { id: "home", label: "主页", icon: "⌂", page: "home" },
  ...menuItems.filter((item) => item.id !== "exit"),
];

const logEntries = [
  { turn: "TURN 13", actor: "DummyA", text: "使用 远程技能「骨矛」！" },
  { turn: "", actor: "DummyB", text: "闪避成功！未命中。" },
  { turn: "TURN 14", actor: "DummyB", text: "使用 近战攻击！" },
  { turn: "", actor: "DummyA", text: "格挡成功！受到 5 点伤害。" },
  { turn: "TURN 15", actor: "DummyA", text: "使用 近战攻击！" },
  { turn: "", actor: "DummyB", text: "格挡成功！受到 8 点伤害。" },
];

function PixelFighter({ armed = false }: { armed?: boolean }) {
  return (
    <svg className="pixel-fighter" viewBox="0 0 96 120" aria-hidden="true">
      <g shapeRendering="crispEdges">
        <rect x="30" y="8" width="36" height="8" fill="#f6f6f6" />
        <rect x="22" y="16" width="52" height="24" fill="#f6f6f6" />
        <rect x="28" y="40" width="40" height="8" fill="#f6f6f6" />
        <rect x="34" y="20" width="10" height="10" fill="#050505" />
        <rect x="54" y="20" width="10" height="10" fill="#050505" />
        <rect x="46" y="31" width="6" height="6" fill="#050505" />
        <rect x="36" y="39" width="6" height="4" fill="#050505" />
        <rect x="46" y="41" width="6" height="4" fill="#050505" />
        <rect x="56" y="39" width="6" height="4" fill="#050505" />
        <rect x="32" y="50" width="32" height="8" fill="#f6f6f6" />
        <rect x="24" y="58" width="12" height="34" fill="#f6f6f6" />
        <rect x="60" y="58" width="12" height="34" fill="#f6f6f6" />
        <rect x="34" y="58" width="28" height="38" fill="#f6f6f6" />
        <rect x="38" y="62" width="20" height="28" fill="#050505" />
        <rect x="16" y="66" width="8" height="22" fill="#f6f6f6" />
        <rect x="72" y="66" width="8" height="22" fill="#f6f6f6" />
        <rect x="30" y="96" width="10" height="16" fill="#f6f6f6" />
        <rect x="56" y="96" width="10" height="16" fill="#f6f6f6" />
        <rect x="22" y="110" width="22" height="6" fill="#f6f6f6" />
        <rect x="52" y="110" width="22" height="6" fill="#f6f6f6" />
        {armed && (
          <>
            <rect x="80" y="58" width="6" height="8" fill="#f6f6f6" />
            <rect x="84" y="48" width="4" height="36" fill="#f6f6f6" />
            <rect x="88" y="44" width="4" height="8" fill="#f6f6f6" />
          </>
        )}
      </g>
    </svg>
  );
}

function PixelSkull() {
  return (
    <svg className="pixel-skull" viewBox="0 0 64 64" aria-hidden="true">
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [time, setTime] = useState(() =>
    new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        left: `${(index * 29 + 8) % 96}%`,
        top: `${(index * 47 + 10) % 86}%`,
        delay: `${(index % 8) * 0.25}s`,
      })),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(
        new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
        const page = menuItems[selectedIndex].page;
        if (page) {
          navigateTo(page);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateTo, selectedIndex]);

  const selectedItem = menuItems[selectedIndex];

  return (
    <UCWindow>
      <div className="engine-dashboard">
        <aside className="engine-sidebar">
          <div className="sidebar-brand">
            <PixelSkull />
            <span>UC ENGINE</span>
          </div>

          <nav className="sidebar-nav" aria-label="UCE navigation">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-nav-item ${item.id === "home" ? "sidebar-nav-active" : ""}`}
                type="button"
                onClick={() => item.page && navigateTo(item.page)}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-version">v0.1.0</div>
        </aside>

        <main className="engine-content">
          <section className="engine-panel hero-panel">
            <div className="hero-scene">
              <div className="hero-stars">
                {stars.map((star, index) => (
                  <span
                    key={index}
                    className="hero-star"
                    style={{
                      left: star.left,
                      top: star.top,
                      animationDelay: star.delay,
                    }}
                  />
                ))}
              </div>
              <div className="ruin-column ruin-column-left" />
              <div className="ruin-column ruin-column-right" />
              <div className="arena-disc arena-disc-back" />
              <div className="arena-disc arena-disc-front" />
            </div>

            <div className="hero-brand">
              <div className="hero-title">
                ULTRA<span className="hero-title-heart">♥</span>
              </div>
              <div className="hero-subtitle-main">CONFRONTATION</div>
              <div className="hero-subtitle">AI BATTLE SIMULATOR</div>
            </div>

            <div className="hero-menu" role="listbox" aria-label="Main actions">
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  className={`hero-menu-item ${index === selectedIndex ? "hero-menu-selected" : ""}`}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => item.page && navigateTo(item.page)}
                >
                  <span className="hero-menu-cursor">{index === selectedIndex ? "♥" : ""}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <p className="hero-quote">“在这个世界里，数据决定一切。”</p>
          </section>

          <section className="engine-panel simulation-panel">
            <h2>创建模拟</h2>
            <div className="panel-rule" />
            <div className="simulation-versus">
              <div className="fighter-picker">
                <h3>左侧角色</h3>
                <div className="fighter-frame">
                  <span className="picker-arrow">‹</span>
                  <PixelFighter />
                  <span className="picker-arrow">›</span>
                </div>
                <button className="select-button" type="button">DummyA ▾</button>
              </div>

              <div className="versus-mark">VS</div>

              <div className="fighter-picker">
                <h3>右侧角色</h3>
                <div className="fighter-frame">
                  <span className="picker-arrow">‹</span>
                  <PixelFighter />
                  <span className="picker-arrow">›</span>
                </div>
                <button className="select-button" type="button">DummyB ▾</button>
              </div>
            </div>

            <div className="map-picker">
              <span>地图</span>
              <button className="select-button map-select" type="button">
                <span className="map-token" />
                Circle500 ▾
              </button>
            </div>

            <button className="start-button" type="button" onClick={() => navigateTo("battle")}>
              <span>♥</span>
              开始模拟
            </button>
          </section>

          <section className="engine-panel battle-preview-panel">
            <div className="turn-badge">TURN 15</div>
            <div className="battle-stage">
              <div className="stage-column stage-column-left" />
              <div className="stage-column stage-column-right" />
              <div className="stage-ring" />
              <div className="stage-fighter stage-fighter-a">
                <PixelFighter armed />
              </div>
              <div className="stage-fighter stage-fighter-b">
                <PixelFighter />
              </div>
            </div>

            <div className="battle-hud">
              <div className="hud-card">
                <div className="hud-name"><span>♥</span> DummyA</div>
                <div className="stat-line">
                  <span>HP</span>
                  <div className="stat-track"><div className="stat-fill stat-hp-a" /></div>
                  <span>350 / 500</span>
                </div>
                <div className="stat-line">
                  <span>MP</span>
                  <div className="stat-track"><div className="stat-fill stat-mp-a" /></div>
                  <span>120 / 250</span>
                </div>
              </div>

              <div className="hud-card">
                <div className="hud-name">DummyB</div>
                <div className="stat-line">
                  <span>HP</span>
                  <div className="stat-track"><div className="stat-fill stat-hp-b" /></div>
                  <span>320 / 500</span>
                </div>
                <div className="stat-line">
                  <span>MP</span>
                  <div className="stat-track"><div className="stat-fill stat-mp-b" /></div>
                  <span>150 / 250</span>
                </div>
              </div>
            </div>

            <div className="battle-actions">
              <button className="battle-action battle-action-active" type="button">
                <span>╱</span>
                攻击
              </button>
              <button className="battle-action" type="button">
                <span>✦</span>
                技能
              </button>
              <button className="battle-action" type="button">
                <span>▱</span>
                格挡
              </button>
              <button className="battle-action" type="button">
                <span>↯</span>
                闪避
              </button>
            </div>

            <div className="battle-status">等待 DummyA 的行动...</div>
          </section>

          <section className="engine-panel battle-log-panel">
            <h2>战斗日志</h2>
            <div className="panel-rule" />
            <div className="battle-log-list">
              {logEntries.map((entry, index) => (
                <div key={`${entry.turn}-${entry.actor}-${index}`} className="battle-log-entry">
                  <PixelSkull />
                  <div>
                    {entry.turn && <div className="log-turn">{entry.turn}</div>}
                    <p><span>{entry.actor}</span> {entry.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="log-scroll-cue">▾</div>
          </section>
        </main>

        <footer className="engine-footer">
          <div>
            <span className="footer-heart">♥</span>
            确认
            <span className="footer-gap">×</span>
            返回
          </div>
          <div className="footer-right">
            <span className="footer-help">F1</span>
            帮助
            <span>{time}</span>
          </div>
        </footer>

        <div className="active-action-label">{selectedItem.label}</div>
      </div>
    </UCWindow>
  );
}
