import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      title: "超类史诗",
      subtitle: "Ultra Confrontation Engine",
      startSimulation: "开始模拟",
      aiTrainer: "AI 训练",
      replay: "回放",
      settings: "设置",
      back: "按 X 返回",
      comingSoon: "即将推出...",
    },
  },
  en: {
    translation: {
      title: "ULTRA CONFRONTATION",
      subtitle: "Ultra Confrontation Engine",
      startSimulation: "Start Simulation",
      aiTrainer: "AI Trainer",
      replay: "Replay",
      settings: "Settings",
      back: "Press X to go back",
      comingSoon: "Coming soon...",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "zh",
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;