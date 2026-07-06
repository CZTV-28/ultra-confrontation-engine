import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  battleSpeed: number;
  volume: number;
  effectsIntensity: number;
  setBattleSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setEffectsIntensity: (intensity: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      battleSpeed: 1,
      volume: 80,
      effectsIntensity: 100,
      setBattleSpeed: (speed) =>
        set({ battleSpeed: Math.max(0, Math.min(3, Math.round(speed * 4) / 4)) }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
      setEffectsIntensity: (intensity) =>
        set({ effectsIntensity: Math.max(0, Math.min(100, Math.round(intensity))) }),
    }),
    {
      name: "uce_settings",
    },
  ),
);
