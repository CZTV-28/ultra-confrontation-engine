import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import { getS1RosterStats, readS1Roster, type S1RosterStatus } from "../../services/s1Roster";
import "./RulesPage.css";

interface RulesPageProps {
  goBack: () => void;
}

type Language = "zh" | "en";

interface SeasonEntry {
  id: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  status: Record<Language, string>;
  state: "active" | "coming";
}

const seasons: SeasonEntry[] = [
  {
    id: "S1",
    title: {
      zh: "S1：起源",
      en: "S1: Origin",
    },
    subtitle: {
      zh: "中文社区试点赛季",
      en: "Chinese community pilot season",
    },
    status: {
      zh: "正在筹备中",
      en: "Preparing",
    },
    state: "active",
  },
  {
    id: "S2",
    title: {
      zh: "S2：敬请期待",
      en: "S2: Coming Soon",
    },
    subtitle: {
      zh: "后续赛季规则预留",
      en: "Reserved for future season rules",
    },
    status: {
      zh: "敬请期待",
      en: "Coming soon",
    },
    state: "coming",
  },
  {
    id: "S3",
    title: {
      zh: "S3：敬请期待",
      en: "S3: Coming Soon",
    },
    subtitle: {
      zh: "后续赛季规则预留",
      en: "Reserved for future season rules",
    },
    status: {
      zh: "敬请期待",
      en: "Coming soon",
    },
    state: "coming",
  },
  {
    id: "S4",
    title: {
      zh: "S4：敬请期待",
      en: "S4: Coming Soon",
    },
    subtitle: {
      zh: "后续赛季规则预留",
      en: "Reserved for future season rules",
    },
    status: {
      zh: "敬请期待",
      en: "Coming soon",
    },
    state: "coming",
  },
];

const content = {
  zh: {
    eyebrow: "UC TOURNAMENTS",
    title: "赛事",
    subtitle: "这里用于查看当前赛季、历史赛季与对应规则。后续 S2、S3、S4 会在这里逐步解锁。",
    back: "返回",
    seasonList: "赛季列表",
    seasonStatus: "赛季状态",
    eventContent: "赛事内容",
    rulesTitle: "S1 规则概览",
    preparingText: "正在筹备中",
    comingSoonText: "敬请期待",
    rosterTitle: "S1 参赛名单",
    rosterPreparing: "S1：起源正在筹备中，名单将随着官方审核逐步填充。",
    rosterTotal: "总席位",
    rosterOccupied: "已登记",
    rosterApproved: "已通过",
    rosterPending: "待复核",
    rosterRejected: "已驳回",
    rosterEmpty: "空位",
    creator: "作者",
    statusLabels: {
      empty: "空位",
      pending_review: "待复核",
      approved: "已通过",
      rejected: "已驳回",
      imported: "已导入",
      trained: "已训练",
    } satisfies Record<S1RosterStatus, string>,
    controls: "↑↓/WS 选择赛季 / Z 确认 / X 返回",
    rules: [
      {
        title: "赛制规则",
        items: [
          "本赛季采用一对一晋级赛制。",
          "S1：起源预计累计招募 32 位参赛选手或参赛同人项目。",
          "每场对局由双方已提交并审核通过的角色进入模拟对抗。",
        ],
      },
      {
        title: "角色限制",
        items: [
          "S1 角色生命固定为 500 HP。",
          "S1 角色能量固定为 250 MP。",
          "参赛者不得手动修改 HP / MP 上限。",
        ],
      },
      {
        title: "模拟规则",
        items: [
          "S1 采用 30 轮次模拟。",
          "取消每轮回合上限，单轮直到分出结果或进入引擎判定。",
          "最终以胜场更多的一方晋级。",
        ],
      },
      {
        title: "技能审核",
        items: [
          "远程技能属性在设计阶段锁定，蓝耗由程序按曲线计算。",
          "近战的伤害增强与 DEBUFF 只能二选一。",
          "格挡、闪避中的反击设计需要人工审核。",
        ],
      },
      {
        title: "被动审核",
        items: [
          "每名角色最多拥有一个自定义被动。",
          "被动只能描述一个单一效果元素。",
          "自定义被动必须填写效果说明，平衡性由赛事官方审核判断。",
        ],
      },
    ],
  },
  en: {
    eyebrow: "UC TOURNAMENTS",
    title: "Events",
    subtitle: "Browse the current season, historical seasons, and their rules. S2, S3, and S4 are reserved for later.",
    back: "Back",
    seasonList: "Season List",
    seasonStatus: "Season Status",
    eventContent: "Event Content",
    rulesTitle: "S1 Rules Overview",
    preparingText: "Preparing",
    comingSoonText: "Coming soon",
    rosterTitle: "S1 Participant Roster",
    rosterPreparing: "S1: Origin is preparing. The roster will fill as official reviews are completed.",
    rosterTotal: "Total Slots",
    rosterOccupied: "Registered",
    rosterApproved: "Approved",
    rosterPending: "Pending",
    rosterRejected: "Rejected",
    rosterEmpty: "Empty",
    creator: "Creator",
    statusLabels: {
      empty: "Empty",
      pending_review: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      imported: "Imported",
      trained: "Trained",
    } satisfies Record<S1RosterStatus, string>,
    controls: "↑↓/WS Select Season / Z Confirm / X Back",
    rules: [
      {
        title: "Tournament Format",
        items: [
          "This season uses a one-on-one elimination format.",
          "S1: Origin plans to recruit 32 competitors or participating fan projects in total.",
          "Each match uses submitted and approved characters for simulated combat.",
        ],
      },
      {
        title: "Character Limits",
        items: [
          "S1 character HP is fixed at 500.",
          "S1 character MP is fixed at 250.",
          "Participants cannot manually change HP / MP limits.",
        ],
      },
      {
        title: "Simulation Rules",
        items: [
          "S1 uses 30 simulation rounds.",
          "Per-round turn caps are disabled.",
          "The side with more round wins advances.",
        ],
      },
      {
        title: "Skill Review",
        items: [
          "Ranged attributes are locked at design time, and MP cost is calculated by curve.",
          "Melee damage boost and debuff attachment are mutually exclusive.",
          "Block and dodge counter designs require manual review.",
        ],
      },
      {
        title: "Passive Review",
        items: [
          "Each character may have at most one custom passive.",
          "A passive may describe only one single effect element.",
          "Custom passives must include effect text; balance is judged by tournament officials.",
        ],
      },
    ],
  },
};

export default function RulesPage({ goBack }: RulesPageProps) {
  const { i18n } = useTranslation();
  const lang: Language = i18n.language.startsWith("en") ? "en" : "zh";
  const t = content[lang];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [s1Roster, setS1Roster] = useState(() => readS1Roster());
  const selectedSeason = seasons[selectedIndex] ?? seasons[0];
  const s1RosterStats = useMemo(() => getS1RosterStats(s1Roster), [s1Roster]);

  const visibleRules = useMemo(
    () => (selectedSeason.id === "S1" ? t.rules : []),
    [selectedSeason.id, t.rules],
  );

  useEffect(() => {
    const refreshRoster = () => setS1Roster(readS1Roster());

    window.addEventListener("focus", refreshRoster);
    window.addEventListener("uce:s1-roster-updated", refreshRoster);
    return () => {
      window.removeEventListener("focus", refreshRoster);
      window.removeEventListener("uce:s1-roster-updated", refreshRoster);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setSelectedIndex((current) => (current === 0 ? seasons.length - 1 : current - 1));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSelectedIndex((current) => (current === seasons.length - 1 ? 0 : current + 1));
      } else if (e.key === "z" || e.key === "Z" || e.key === "Enter") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  return (
    <UCWindow>
      <main className="rules-shell">
        <header className="rules-header">
          <div>
            <p>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <span>{t.subtitle}</span>
          </div>
          <button className="rules-back-button" type="button" onClick={goBack}>
            {t.back}
          </button>
        </header>

        <section className="rules-layout">
          <aside className="rules-season-panel">
            <div className="rules-section-title">{t.seasonList}</div>
            <div className="rules-season-list">
              {seasons.map((season, index) => (
                <button
                  key={season.id}
                  className={`rules-season-card ${index === selectedIndex ? "rules-season-card-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span>{season.id}</span>
                  <strong>{season.title[lang]}</strong>
                  <em>{season.subtitle[lang]}</em>
                  <small>{season.status[lang]}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="rules-detail-panel">
            <div className="rules-season-hero">
              <div>
                <p>{t.seasonStatus}</p>
                <h2>{selectedSeason.title[lang]}</h2>
                <span>{selectedSeason.subtitle[lang]}</span>
              </div>
              <strong className={`rules-season-badge rules-season-badge-${selectedSeason.state}`}>
                {selectedSeason.status[lang]}
              </strong>
            </div>

            <section className="rules-event-content">
              <div className="rules-section-title">{t.eventContent}</div>
              {selectedSeason.id === "S1" ? (
                <div className="rules-roster-panel">
                  <div className="rules-roster-summary">
                    <div>
                      <strong>{t.rosterTitle}</strong>
                      <span>{t.rosterPreparing}</span>
                    </div>
                    <dl>
                      <div><dt>{t.rosterTotal}</dt><dd>{s1RosterStats.total}</dd></div>
                      <div><dt>{t.rosterOccupied}</dt><dd>{s1RosterStats.occupied}</dd></div>
                      <div><dt>{t.rosterApproved}</dt><dd>{s1RosterStats.approved}</dd></div>
                      <div><dt>{t.rosterPending}</dt><dd>{s1RosterStats.pending}</dd></div>
                      <div><dt>{t.rosterRejected}</dt><dd>{s1RosterStats.rejected}</dd></div>
                    </dl>
                  </div>

                  <div className="rules-roster-grid">
                    {s1Roster.map((slot) => (
                      <article className={`rules-roster-slot rules-roster-slot-${slot.status}`} key={slot.slot}>
                        <div className="rules-roster-slot-head">
                          <strong>#{String(slot.slot).padStart(2, "0")}</strong>
                          <span>{t.statusLabels[slot.status]}</span>
                        </div>
                        {slot.status === "empty" ? (
                          <p>{t.rosterEmpty}</p>
                        ) : (
                          <>
                            <h3>{slot.characterName || slot.characterId}</h3>
                            <p>{t.creator}: {slot.creator || "-"}</p>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rules-empty-event">{t.comingSoonText}</div>
              )}
            </section>

            <section className="rules-rulebook">
              <div className="rules-section-title">
                {selectedSeason.id === "S1" ? t.rulesTitle : t.comingSoonText}
              </div>

              {visibleRules.length > 0 ? (
                <div className="rules-grid">
                  {visibleRules.map((section, sectionIndex) => (
                    <article className="rules-card" key={section.title}>
                      <div className="rules-card-index">{String(sectionIndex + 1).padStart(2, "0")}</div>
                      <h2>{section.title}</h2>
                      <ul>
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rules-coming-panel">{t.comingSoonText}</div>
              )}
            </section>
          </section>
        </section>

        <footer className="rules-footer">{t.controls}</footer>
      </main>
    </UCWindow>
  );
}
