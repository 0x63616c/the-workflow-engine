import { create } from "zustand";

export const CLOCK_STATE_COUNT = 14;

type View = "clock" | "hub" | "sonos" | "timer";

interface NavigationState {
  view: View;
  clockStateIndex: number;
}

interface NavigationActions {
  setView: (view: View) => void;
  setClockStateIndex: (index: number) => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  clockStateIndex: 0,
  setView: (view) => set({ view }),
  setClockStateIndex: (index) =>
    set({
      clockStateIndex: Math.max(
        0,
        Math.min(CLOCK_STATE_COUNT - 1, Math.round(Number.isNaN(index) ? 0 : index)),
      ),
    }),
}));
