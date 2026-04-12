import { create } from "zustand";

type View = "clock" | "hub" | "sonos";

interface NavigationState {
  view: View;
}

interface NavigationActions {
  setView: (view: View) => void;
}

export const useNavigationStore = create<NavigationState & NavigationActions>((set) => ({
  view: "clock",
  setView: (view) => set({ view }),
}));
