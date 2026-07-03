import { create } from "zustand";

interface SettingsState {
  battleSpeed: number;
  volume: number;
  setBattleSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  battleSpeed: 1,
  volume: 80,
  setBattleSpeed: (speed) =>
    set({ battleSpeed: Math.max(0, Math.min(3, Math.round(speed * 4) / 4)) }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
}));
