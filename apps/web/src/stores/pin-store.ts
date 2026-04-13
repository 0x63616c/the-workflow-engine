import { create } from "zustand";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadFromStorage(): { pinHash: string | null; enabled: boolean } {
  try {
    const pinHash = globalThis.localStorage?.getItem("pin-hash") ?? null;
    const enabled = globalThis.localStorage?.getItem("pin-enabled") === "true";
    return { pinHash, enabled };
  } catch {
    return { pinHash: null, enabled: false };
  }
}

interface PinState {
  pinHash: string | null;
  enabled: boolean;
  isUnlocked: boolean;
}

interface PinActions {
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  enable: () => void;
  disable: () => void;
}

const initial = loadFromStorage();

export const usePinStore = create<PinState & PinActions>((set, get) => ({
  pinHash: initial.pinHash,
  enabled: initial.enabled,
  isUnlocked: false,

  setPin: async (pin: string) => {
    const hash = await hashPin(pin);
    try {
      globalThis.localStorage?.setItem("pin-hash", hash);
      globalThis.localStorage?.setItem("pin-enabled", "true");
    } catch {
      // ignore storage errors
    }
    set({ pinHash: hash, enabled: true });
  },

  verifyPin: async (pin: string) => {
    const { pinHash } = get();
    if (!pinHash) return false;
    const hash = await hashPin(pin);
    return hash === pinHash;
  },

  unlock: () => set({ isUnlocked: true }),

  lock: () => set({ isUnlocked: false }),

  enable: () => {
    try {
      globalThis.localStorage?.setItem("pin-enabled", "true");
    } catch {
      // ignore storage errors
    }
    set({ enabled: true });
  },

  disable: () => {
    try {
      globalThis.localStorage?.setItem("pin-enabled", "false");
    } catch {
      // ignore storage errors
    }
    set({ enabled: false });
  },
}));
