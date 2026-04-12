import { create } from "zustand";

export type TimerStatus = "idle" | "running" | "paused" | "done";

interface TimerState {
  status: TimerStatus;
  duration_MS: number;
  remaining_MS: number;
}

interface TimerActions {
  start: (duration_MS: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (elapsed_MS: number) => void;
}

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  status: "idle",
  duration_MS: 0,
  remaining_MS: 0,

  start: (duration_MS) => set({ status: "running", duration_MS, remaining_MS: duration_MS }),

  pause: () => {
    if (get().status === "running") set({ status: "paused" });
  },

  resume: () => {
    if (get().status === "paused") set({ status: "running" });
  },

  reset: () => set({ status: "idle", duration_MS: 0, remaining_MS: 0 }),

  tick: (elapsed_MS) => {
    const { status, remaining_MS } = get();
    if (status !== "running") return;
    const next = Math.max(0, remaining_MS - elapsed_MS);
    set({ remaining_MS: next, ...(next === 0 ? { status: "done" } : {}) });
  },
}));
