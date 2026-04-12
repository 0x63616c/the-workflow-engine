import { create } from "zustand";

interface CardExpansionState {
  expandedCardId: string | null;
}

interface CardExpansionActions {
  expandCard: (id: string) => void;
  contractCard: () => void;
}

export const useCardExpansionStore = create<CardExpansionState & CardExpansionActions>((set) => ({
  expandedCardId: null,
  expandCard: (id) => set({ expandedCardId: id }),
  contractCard: () => set({ expandedCardId: null }),
}));
