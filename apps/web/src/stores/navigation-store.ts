import { create } from "zustand";

interface NavigationState {
  view: "clock" | "hub";
}

interface NavigationActions {
  setView: (view: "clock" | "hub") => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  setView: (view) => set({ view }),
}));
