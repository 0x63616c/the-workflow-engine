import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Store is imported after mocks are set up
let usePinStore: typeof import("@/stores/pin-store").usePinStore;

const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
  length: 0,
  key: vi.fn(),
};

beforeEach(async () => {
  vi.resetModules();
  mockLocalStorage.store = {};
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  globalThis.localStorage = mockLocalStorage as unknown as Storage;

  // Mock crypto.subtle for hashing (use vi.stubGlobal since crypto is read-only in jsdom)
  const mockDigest = vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
    // Deterministic fake hash: just return bytes of input as-is padded to 32 bytes
    const view = new Uint8Array(data);
    const result = new Uint8Array(32);
    result.set(view.slice(0, Math.min(view.length, 32)));
    return result.buffer;
  });
  vi.stubGlobal("crypto", { subtle: { digest: mockDigest } });

  const mod = await import("@/stores/pin-store");
  usePinStore = mod.usePinStore;
  // Reset store state
  usePinStore.setState({ pinHash: null, enabled: false, isUnlocked: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("pin-store: setPin", () => {
  it("stores a hashed value, not plaintext", async () => {
    const { setPin } = usePinStore.getState();
    await setPin("1234");
    const { pinHash } = usePinStore.getState();
    expect(pinHash).not.toBeNull();
    expect(pinHash).not.toBe("1234");
    // Should be a hex string (64 chars for SHA-256)
    expect(pinHash).toMatch(/^[0-9a-f]+$/);
  });

  it("persists pinHash to localStorage", async () => {
    const { setPin } = usePinStore.getState();
    await setPin("5678");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("pin-hash", expect.any(String));
  });

  it("enables PIN after setPin", async () => {
    const { setPin } = usePinStore.getState();
    await setPin("1234");
    expect(usePinStore.getState().enabled).toBe(true);
  });
});

describe("pin-store: verifyPin", () => {
  it("returns true for correct PIN", async () => {
    const { setPin, verifyPin } = usePinStore.getState();
    await setPin("1234");
    const result = await verifyPin("1234");
    expect(result).toBe(true);
  });

  it("returns false for wrong PIN", async () => {
    const { setPin, verifyPin } = usePinStore.getState();
    await setPin("1234");
    const result = await verifyPin("9999");
    expect(result).toBe(false);
  });

  it("returns false when no PIN is set", async () => {
    const { verifyPin } = usePinStore.getState();
    const result = await verifyPin("1234");
    expect(result).toBe(false);
  });
});

describe("pin-store: unlock / lock", () => {
  it("unlock sets isUnlocked to true", () => {
    const { unlock } = usePinStore.getState();
    expect(usePinStore.getState().isUnlocked).toBe(false);
    unlock();
    expect(usePinStore.getState().isUnlocked).toBe(true);
  });

  it("lock sets isUnlocked to false", () => {
    usePinStore.setState({ isUnlocked: true });
    const { lock } = usePinStore.getState();
    lock();
    expect(usePinStore.getState().isUnlocked).toBe(false);
  });

  it("isUnlocked is not persisted to localStorage", () => {
    const { unlock } = usePinStore.getState();
    unlock();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith("pin-unlocked", expect.anything());
  });
});

describe("pin-store: enable / disable", () => {
  it("enable sets enabled to true and persists", () => {
    const { enable } = usePinStore.getState();
    enable();
    expect(usePinStore.getState().enabled).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("pin-enabled", "true");
  });

  it("disable sets enabled to false and persists", () => {
    usePinStore.setState({ enabled: true });
    const { disable } = usePinStore.getState();
    disable();
    expect(usePinStore.getState().enabled).toBe(false);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("pin-enabled", "false");
  });
});

describe("pin-store: localStorage persistence on init", () => {
  it("loads pinHash and enabled from localStorage on module init", async () => {
    mockLocalStorage.store["pin-hash"] =
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    mockLocalStorage.store["pin-enabled"] = "true";

    vi.resetModules();
    const mod = await import("@/stores/pin-store");
    const freshStore = mod.usePinStore;

    expect(freshStore.getState().pinHash).toBe(
      "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    );
    expect(freshStore.getState().enabled).toBe(true);
  });

  it("defaults to null pinHash and disabled when localStorage is empty", async () => {
    vi.resetModules();
    const mod = await import("@/stores/pin-store");
    const freshStore = mod.usePinStore;

    expect(freshStore.getState().pinHash).toBeNull();
    expect(freshStore.getState().enabled).toBe(false);
  });
});
