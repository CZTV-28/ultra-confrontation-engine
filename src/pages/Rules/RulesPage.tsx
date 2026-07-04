import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import "./RulesPage.css";

interface RulesPageProps {
  goBack: () => void;
}

const content = {
  zh: {
    eyebrow: "UCE S1 ORIGIN",
    title: "参赛者规则与提交说明",
    subtitle: "本页面用于参赛者在提交角色设计前快速确认 S1 赛季的硬性限制、审核项和导出流程。",
    back: "返回",
    flowTitle: "提交流程",
    flow: [
      "进入角色设计模块，填写角色资料、技能参数、被动说明和训练备注。",
      "确认红色校验项全部消失后，导出 .ucechar 角色信息文件。",
      "将 .ucechar 文件发送给赛事官方，由官方进行规则审核、训练或导入比赛库。",
    ],
    lockedTitle: "S1 固定限制",
    locked: [
      "角色生命固定为 500 HP，不允许参赛者手动修改。",
      "角色能量固定为 250 MP，不允许参赛者手动修改。",
      "S1 采用 30 轮次模拟，不再设置单轮回合上限。",
      "远程技能的蓝耗由程序根据伤害、命中率和射程自动计算。",
    ],
    skillTitle: "技能审核重点",
    skills: [
      "平A是角色固有动作，AI 可以在战斗中决定是否额外花蓝提高伤害。",
      "近战技能可以选择提高伤害或附加 DEBUFF，但二者不能同时存在。",
      "远程技能在设计阶段锁定属性，AI 不能在模拟中临时选择强化方向。",
      "格挡和闪避的反击设计会增加蓝耗，蓝耗先结算，再判断技能结果。",
      "被动技能由玩家自定义，但每名角色最多一个被动，且被动只能描述一个单一效果元素。",
    ],
    packageTitle: "导出文件",
    package: [
      ".ucechar 是参赛者提交给官方的角色信息包，不是最终 AI 模型。",
      "文件内包含角色、技能、被动、训练备注、UCE 版本、S1 规则版本和 SHA-256 校验码。",
      "官方收到文件后会进行合规审核；含有 DEBUFF、反击或自定义被动的设计需要重点审核。",
    ],
  },
  en: {
    eyebrow: "UCE S1 ORIGIN",
    title: "Participant Rules and Submission Guide",
    subtitle:
      "Use this page to confirm S1 hard limits, review items, and the character submission flow before exporting.",
    back: "Back",
    flowTitle: "Submission Flow",
    flow: [
      "Open Character Forge and fill in profile, skills, passive details, and training notes.",
      "Export the .ucechar character info file after all red validation items are fixed.",
      "Send the .ucechar file to tournament officials for review, training, or import into the tournament library.",
    ],
    lockedTitle: "S1 Fixed Limits",
    locked: [
      "Character HP is fixed at 500 and cannot be manually changed by participants.",
      "Character MP is fixed at 250 and cannot be manually changed by participants.",
      "S1 uses 30 simulation rounds with no per-round turn cap.",
      "Ranged MP cost is calculated automatically from damage, hit rate, and range.",
    ],
    skillTitle: "Skill Review Focus",
    skills: [
      "Basic attack is intrinsic. The AI may decide during battle whether to spend MP for more damage.",
      "Melee may boost damage or attach a debuff, but those two choices are mutually exclusive.",
      "Ranged attributes are locked at design time. The AI cannot choose temporary ranged boosts during simulation.",
      "Block and dodge counter designs increase MP cost. MP is paid before the skill result is resolved.",
      "Passives are custom, but each character may have at most one passive with exactly one effect element.",
    ],
    packageTitle: "Export File",
    package: [
      ".ucechar is the character info package submitted to officials, not the final AI model.",
      "It contains character data, skills, passive data, training notes, UCE version, S1 rules version, and a SHA-256 checksum.",
      "Officials review the file for compliance. Debuffs, counters, and custom passives require special attention.",
    ],
  },
};

export default function RulesPage({ goBack }: RulesPageProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("en") ? "en" : "zh";
  const t = content[lang];

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

  const sections = [
    { title: t.flowTitle, items: t.flow },
    { title: t.lockedTitle, items: t.locked },
    { title: t.skillTitle, items: t.skills },
    { title: t.packageTitle, items: t.package },
  ];

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

        <section className="rules-grid">
          {sections.map((section, sectionIndex) => (
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
        </section>
      </main>
    </UCWindow>
  );
}
