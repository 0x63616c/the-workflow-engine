import { create } from "zustand";

interface NavigationState {
  view: "clock" | "hub";
  animated: boolean;
}

interface NavigationActions {
  setView: (view: "clock" | "hub", animated?: boolean) => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  animated: false,
  setView: (view, animated = false) => set({ view, animated }),
}));
