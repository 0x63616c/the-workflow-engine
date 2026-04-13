import { create } from "zustand";

// FNV-1a hash. No crypto.subtle dependency, works on plain HTTP.
function hashPin(pin: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    hash ^= pin.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const PIN_LENGTH = 6;

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
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
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

  setPin: (pin: string) => {
    const hash = hashPin(pin);
    try {
      globalThis.localStorage?.setItem("pin-hash", hash);
      globalThis.localStorage?.setItem("pin-enabled", "true");
    } catch {
      // ignore storage errors
    }
    set({ pinHash: hash, enabled: true });
  },

  verifyPin: (pin: string) => {
    const { pinHash } = get();
    if (!pinHash) return false;
    return hashPin(pin) === pinHash;
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
