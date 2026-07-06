import type { CSSProperties } from "react";
import { useSettingsStore } from "../../../store/settingsStore";
import "./UCWindow.css";

interface UCWindowProps {
  children: React.ReactNode;
}

export default function UCWindow({ children }: UCWindowProps) {
  const effectsIntensity = useSettingsStore((state) => state.effectsIntensity);
  const windowStyle = {
    "--uce-effect-strength": effectsIntensity / 100,
  } as CSSProperties;

  return (
    <div className="uc-window" style={windowStyle}>
      {children}
    </div>
  );
}
