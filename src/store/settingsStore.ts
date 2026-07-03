import { create } from "zustand";

interface SettingsState {
  battleSpeed: number;
  volume: number;
  setBattleSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  battleSpeed: 1000,
  volume: 80,
  setBattleSpeed: (speed) => set({ battleSpeed: speed }),
  setVolume: (volume) => set({ volume }),
}));