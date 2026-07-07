import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HomePage from "../pages/Home/HomePage";
import BattlePage from "../pages/Battle/BattlePage";
import CreatorPage from "../pages/Creator/CreatorPage";
import RulesPage from "../pages/Rules/RulesPage";
import ReviewPage from "../pages/Review/ReviewPage";
import SeasonRosterPage from "../pages/SeasonRoster/SeasonRosterPage";
import TrainerPage from "../pages/Trainer/TrainerPage";
import TournamentBattlePage from "../pages/TournamentBattle/TournamentBattlePage";
import ReplayPage from "../pages/Replay/ReplayPage";
import DevelopersPage from "../pages/Developers/DevelopersPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import { readDeveloperSession } from "../services/developerAccess";

type Page =
  | "home"
  | "battle"
  | "creator"
  | "rules"
  | "review"
  | "seasonRoster"
  | "trainer"
  | "tournamentBattle"
  | "replay"
  | "developers"
  | "settings";

const pageMap: Record<string, Page> = {
  "/": "home",
  "/battle": "battle",
  "/creator": "creator",
  "/rules": "rules",
  "/review": "review",
  "/season-roster": "seasonRoster",
  "/trainer": "trainer",
  "/tournament-battle": "tournamentBattle",
  "/replay": "replay",
  "/developers": "developers",
  "/settings": "settings",
};

const pathMap: Record<Page, string> = {
  home: "/",
  battle: "/battle",
  creator: "/creator",
  rules: "/rules",
  review: "/review",
  seasonRoster: "/season-roster",
  trainer: "/trainer",
  tournamentBattle: "/tournament-battle",
  replay: "/replay",
  developers: "/developers",
  settings: "/settings",
};

function getPageFromLocation(): Page {
  return pageMap[window.location.pathname] || "home";
}

function isProtectedPage(page: Page) {
  return page === "review" || page === "seasonRoster" || page === "trainer" || page === "tournamentBattle" || page === "developers";
}

export default function AppRouter() {
  const [currentPage, setCurrentPage] = useState<Page>(() => getPageFromLocation());

  useEffect(() => {
    setCurrentPage(getPageFromLocation());
  }, []);

  const navigateTo = (page: Page) => {
    if (isProtectedPage(page) && !readDeveloperSession()) {
      page = "home";
    }
    const path = pathMap[page];
    window.history.pushState({ page }, "", path);
    setCurrentPage(page);
  };

  const goBack = () => {
    window.history.back();
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromLocation());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const pageProps = {
    navigateTo,
    goBack,
  };

  const renderPage = () => {
    if (isProtectedPage(currentPage) && !readDeveloperSession()) {
      return <HomePage {...pageProps} />;
    }

    switch (currentPage) {
      case "battle":
        return <BattlePage {...pageProps} />;
      case "creator":
        return <CreatorPage {...pageProps} />;
      case "rules":
        return <RulesPage {...pageProps} />;
      case "review":
        return <ReviewPage {...pageProps} />;
      case "seasonRoster":
        return <SeasonRosterPage {...pageProps} />;
      case "trainer":
        return <TrainerPage {...pageProps} />;
      case "tournamentBattle":
        return <TournamentBattlePage {...pageProps} />;
      case "replay":
        return <ReplayPage {...pageProps} />;
      case "developers":
        return <DevelopersPage {...pageProps} />;
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
