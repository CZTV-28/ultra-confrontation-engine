import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HomePage from "../pages/Home/HomePage";
import BattlePage from "../pages/Battle/BattlePage";
import TrainerPage from "../pages/Trainer/TrainerPage";
import ReplayPage from "../pages/Replay/ReplayPage";
import SettingsPage from "../pages/Settings/SettingsPage";

type Page = "home" | "battle" | "trainer" | "replay" | "settings";

const pageMap: Record<string, Page> = {
  "/": "home",
  "/battle": "battle",
  "/trainer": "trainer",
  "/replay": "replay",
  "/settings": "settings",
};

const pathMap: Record<Page, string> = {
  home: "/",
  battle: "/battle",
  trainer: "/trainer",
  replay: "/replay",
  settings: "/settings",
};

export default function AppRouter() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  useEffect(() => {
    const currentPath = window.location.pathname;
    const page = pageMap[currentPath];
    if (page) {
      setCurrentPage(page);
    }
  }, []);

  const navigateTo = (page: Page) => {
    const path = pathMap[page];
    window.history.pushState({ page }, "", path);
    setCurrentPage(page);
  };

  const goBack = () => {
    window.history.back();
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const page = pageMap[path] || "home";
      setCurrentPage(page);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const pageProps = {
    navigateTo,
    goBack,
  };

  const renderPage = () => {
    switch (currentPage) {
      case "battle":
        return <BattlePage {...pageProps} />;
      case "trainer":
        return <TrainerPage {...pageProps} />;
      case "replay":
        return <ReplayPage {...pageProps} />;
      case "settings":
        return <SettingsPage {...pageProps} />;
      default:
        return <HomePage {...pageProps} />;
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000000" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}