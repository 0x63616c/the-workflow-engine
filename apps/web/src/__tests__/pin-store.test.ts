import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  const mod = await import("@/stores/pin-store");
  usePinStore = mod.usePinStore;
  usePinStore.setState({ pinHash: null, enabled: false, isUnlocked: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("pin-store: setPin", () => {
  it("stores a hashed value, not plaintext", () => {
    const { setPin } = usePinStore.getState();
    setPin("123456");
    const { pinHash } = usePinStore.getState();
    expect(pinHash).not.toBeNull();
    expect(pinHash).not.toBe("123456");
    expect(pinHash).toMatch(/^[0-9a-f]+$/);
  });

  it("persists pinHash to localStorage", () => {
    const { setPin } = usePinStore.getState();
    setPin("567890");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("pin-hash", expect.any(String));
  });

  it("enables PIN after setPin", () => {
    const { setPin } = usePinStore.getState();
    setPin("123456");
    expect(usePinStore.getState().enabled).toBe(true);
  });
});

describe("pin-store: verifyPin", () => {
  it("returns true for correct PIN", () => {
    const { setPin, verifyPin } = usePinStore.getState();
    setPin("123456");
    expect(verifyPin("123456")).toBe(true);
  });

  it("returns false for wrong PIN", () => {
    const { setPin, verifyPin } = usePinStore.getState();
    setPin("123456");
    expect(verifyPin("999999")).toBe(false);
  });

  it("returns false when no PIN is set", () => {
    const { verifyPin } = usePinStore.getState();
    expect(verifyPin("123456")).toBe(false);
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
    mockLocalStorage.store["pin-hash"] = "abcdef12";
    mockLocalStorage.store["pin-enabled"] = "true";

    vi.resetModules();
    const mod = await import("@/stores/pin-store");
    const freshStore = mod.usePinStore;

    expect(freshStore.getState().pinHash).toBe("abcdef12");
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
