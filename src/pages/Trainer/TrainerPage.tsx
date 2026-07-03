import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import UCWindow from "../../components/common/UCWindow/UCWindow";
import UCPanel from "../../components/common/UCPanel/UCPanel";
import UCText from "../../components/common/UCText/UCText";

interface TrainerPageProps {
  goBack: () => void;
}

export default function TrainerPage({ goBack }: TrainerPageProps) {
  const { t } = useTranslation();

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

  return (
    <UCWindow>
      <UCPanel>
        <h1 style={{ color: "white", fontSize: "32px", marginBottom: "20px" }}>
          {t("aiTrainer")}
        </h1>
        <UCText text={t("comingSoon")} speed={40} />
      </UCPanel>
    </UCWindow>
  );
}