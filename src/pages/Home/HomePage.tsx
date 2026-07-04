import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import englishLogo from "../../assets/images/ucon-logo-en.png";
import "./HomePage.css";

type Page = "home" | "battle" | "creator" | "rules" | "trainer" | "replay" | "settings";
type SceneId = Page;

interface SceneTone {
  accent: [number, number, number];
  secondary: [number, number, number];
  tertiary: [number, number, number];
}

const sceneTones: Record<SceneId, SceneTone> = {
  home: {
    accent: [184, 92, 255],
    secondary: [91, 231, 255],
    tertiary: [255, 255, 255],
  },
  battle: {
    accent: [255, 90, 78],
    secondary: [255, 200, 87],
    tertiary: [184, 92, 255],
  },
  creator: {
    accent: [91, 231, 255],
    secondary: [255, 104, 198],
    tertiary: [142, 255, 122],
  },
  rules: {
    accent: [255, 200, 87],
    secondary: [91, 231, 255],
    tertiary: [255, 104, 198],
  },
  trainer: {
    accent: [46, 242, 255],
    secondary: [142, 255, 122],
    tertiary: [136, 104, 255],
  },
  replay: {
    accent: [255, 255, 255],
    secondary: [184, 92, 255],
    tertiary: [91, 231, 255],
  },
  settings: {
    accent: [159, 124, 255],
    secondary: [76, 201, 255],
    tertiary: [255, 104, 198],
  },
};

const codeGlyphs = ["01", "10", "UCE", "AI", "S1", "RUN", "SIM", "SYNC"];

const easeTone = (value: number) => 1 - Math.pow(1 - value, 3);

function mixChannel(from: number, to: number, progress: number) {
  return Math.round(from + (to - from) * progress);
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    mixChannel(from[0], to[0], progress),
    mixChannel(from[1], to[1], progress),
    mixChannel(from[2], to[2], progress),
  ];
}

function mixTone(from: SceneTone, to: SceneTone, progress: number): SceneTone {
  return {
    accent: mixRgb(from.accent, to.accent, progress),
    secondary: mixRgb(from.secondary, to.secondary, progress),
    tertiary: mixRgb(from.tertiary, to.tertiary, progress),
  };
}

function rgbValue(rgb: [number, number, number]) {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

function createToneStyle(tone: SceneTone): CSSProperties {
  return {
    "--home-accent": `rgb(${rgbValue(tone.accent)})`,
    "--home-accent-rgb": rgbValue(tone.accent),
    "--home-secondary": `rgb(${rgbValue(tone.secondary)})`,
    "--home-secondary-rgb": rgbValue(tone.secondary),
    "--home-tertiary-rgb": rgbValue(tone.tertiary),
  } as CSSProperties;
}

interface HomePageProps {
  navigateTo: (page: Page) => void;
  goBack: () => void;
}

interface SidebarItem {
  id: SceneId;
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
      { id: "creator", label: isEnglish ? "Character Forge" : "角色设计", icon: "C", page: "creator" },
      { id: "rules", label: isEnglish ? "S1 Rules" : "S1规则", icon: "R", page: "rules" },
      { id: "settings", label: isEnglish ? "Settings" : "设置", icon: "S", page: "settings" },
    ],
    [isEnglish],
  );
  const activeSceneId = sidebarItems[selectedIndex]?.id ?? "home";
  const [themeTone, setThemeTone] = useState<SceneTone>(() => sceneTones[activeSceneId]);
  const themeToneRef = useRef(themeTone);
  const themeStyle = useMemo(() => createToneStyle(themeTone), [themeTone]);

  const stars = useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => ({
        left: `${2 + ((index * 37 + 9) % 96)}%`,
        top: `${4 + ((index * 29 + 11) % 88)}%`,
        delay: `${(index % 9) * 0.22}s`,
      })),
    [],
  );

  const cosmicDust = useMemo(
    () =>
      Array.from({ length: 110 }, (_, index) => ({
        left: `${1 + ((index * 19 + 13) % 98)}%`,
        top: `${3 + ((index * 47 + 17) % 91)}%`,
        size: `${1 + (index % 4) * 0.65}px`,
        delay: `${(index % 17) * 0.16}s`,
        duration: `${3.6 + (index % 7) * 0.34}s`,
        opacity: `${0.28 + (index % 5) * 0.12}`,
      })),
    [],
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        left: `${18 + ((index * 17) % 64)}%`,
        delay: `${(index % 10) * 0.18}s`,
        duration: `${2.8 + (index % 5) * 0.28}s`,
      })),
    [],
  );

  const codeStreams = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        left: `${24 + ((index * 13) % 54)}%`,
        bottom: `${102 + (index % 5) * 18}px`,
        delay: `${(index % 9) * 0.16}s`,
        duration: `${2.2 + (index % 6) * 0.22}s`,
        text: Array.from({ length: 4 }, (_, row) => codeGlyphs[(index + row * 3) % codeGlyphs.length]).join("\n"),
      })),
    [],
  );

  const dataShards = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        return {
          left: `${43 + ((index * 7) % 16)}%`,
          bottom: `${142 + (index % 4) * 22}px`,
          delay: `${(index % 12) * 0.1}s`,
          duration: `${1.6 + (index % 5) * 0.18}s`,
          x: `${direction * (84 + (index % 6) * 18)}px`,
          y: `${-42 - (index % 5) * 18}px`,
          rotate: `${direction * (16 + (index % 7) * 7)}deg`,
        };
      }),
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

  useEffect(() => {
    const fromTone = themeToneRef.current;
    const toTone = sceneTones[activeSceneId];
    const duration = 1200;
    const startedAt = performance.now();
    let animationFrame = 0;

    const animateTone = (now: number) => {
      const rawProgress = Math.min((now - startedAt) / duration, 1);
      const progress = easeTone(rawProgress);
      const nextTone = mixTone(fromTone, toTone, progress);

      themeToneRef.current = nextTone;
      setThemeTone(nextTone);

      if (rawProgress < 1) {
        animationFrame = requestAnimationFrame(animateTone);
      }
    };

    animationFrame = requestAnimationFrame(animateTone);
    return () => cancelAnimationFrame(animationFrame);
  }, [activeSceneId]);

  return (
    <UCWindow>
      <div className={`home-shell home-shell-${activeSceneId}`} style={themeStyle}>
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

          <div className="home-version">v0.1.1 PARTICIPANT</div>
        </aside>

        <main className={`home-main-panel home-main-${activeSceneId}`} style={themeStyle}>
          <div className={`home-scene home-scene-${activeSceneId}`}>
            <div className="home-depth-grid" />
            <div className="home-cosmic-dust" aria-hidden="true">
              {cosmicDust.map((dust, index) => (
                <span
                  key={index}
                  style={{
                    left: dust.left,
                    top: dust.top,
                    width: dust.size,
                    height: dust.size,
                    opacity: dust.opacity,
                    animationDelay: dust.delay,
                    animationDuration: dust.duration,
                  }}
                />
              ))}
            </div>
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
            <div className="home-particles">
              {particles.map((particle, index) => (
                <span
                  key={index}
                  style={{
                    left: particle.left,
                    animationDelay: particle.delay,
                    animationDuration: particle.duration,
                  }}
                />
              ))}
            </div>
            <div className="home-arch home-arch-left" />
            <div className="home-arch home-arch-right" />
            <div className="home-energy-beam" />
            <div className="home-code-field" aria-hidden="true">
              {codeStreams.map((stream, index) => (
                <span
                  key={index}
                  className="home-code-stream"
                  style={{
                    left: stream.left,
                    bottom: stream.bottom,
                    animationDelay: stream.delay,
                    animationDuration: stream.duration,
                  }}
                >
                  {stream.text}
                </span>
              ))}
            </div>
            <div className="home-data-shards" aria-hidden="true">
              {dataShards.map((shard, index) => (
                <span
                  key={index}
                  style={{
                    left: shard.left,
                    bottom: shard.bottom,
                    animationDelay: shard.delay,
                    animationDuration: shard.duration,
                    "--home-shard-x": shard.x,
                    "--home-shard-y": shard.y,
                    "--home-shard-rotate": shard.rotate,
                  } as CSSProperties}
                />
              ))}
            </div>
            <div className="home-soul-wake" aria-hidden="true" />
            <div className="home-soul-core" aria-hidden="true">♥</div>
            <div className="home-light home-light-left" />
            <div className="home-light home-light-right" />
          </div>

          <div className={`home-title-block ${isEnglish ? "home-title-block-en" : "home-title-block-zh"}`}>
            {isEnglish ? (
              <img className="home-title-image" src={englishLogo} alt="Ultra Confrontation" />
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
