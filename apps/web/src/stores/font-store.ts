import { create } from "zustand";

export interface FontOption {
  id: string;
  name: string;
  family: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "satoshi", name: "Satoshi", family: "'Satoshi', sans-serif" },
  { id: "inter", name: "Inter", family: "'Inter Variable', sans-serif" },
  { id: "general-sans", name: "General Sans", family: "'General Sans', sans-serif" },
  { id: "cabinet-grotesk", name: "Cabinet Grotesk", family: "'Cabinet Grotesk', sans-serif" },
  { id: "clash-display", name: "Clash Display", family: "'Clash Display', sans-serif" },
  { id: "space-grotesk", name: "Space Grotesk", family: "'Space Grotesk Variable', sans-serif" },
  { id: "sora", name: "Sora", family: "'Sora Variable', sans-serif" },
  { id: "outfit", name: "Outfit", family: "'Outfit Variable', sans-serif" },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    family: "'Plus Jakarta Sans Variable', sans-serif",
  },
  { id: "manrope", name: "Manrope", family: "'Manrope Variable', sans-serif" },
  {
    id: "geist-mono",
    name: "Geist Mono",
    family: "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace",
  },
];

const STORAGE_KEY = "font-family";

function getInitialFontId(): string {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored && FONT_OPTIONS.some((f) => f.id === stored)) return stored;
  } catch {}
  return "satoshi";
}

interface FontState {
  activeFontId: string;
  setActiveFont: (id: string) => void;
  getActiveFont: () => FontOption;
}

export const useFontStore = create<FontState>((set, get) => ({
  activeFontId: getInitialFontId(),

  setActiveFont: (id: string) => {
    if (!FONT_OPTIONS.some((f) => f.id === id)) return;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, id);
    } catch {}
    set({ activeFontId: id });
  },

  getActiveFont: () => {
    const { activeFontId } = get();
    return FONT_OPTIONS.find((f) => f.id === activeFontId) ?? FONT_OPTIONS[0];
  },
}));
