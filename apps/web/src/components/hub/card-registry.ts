export interface CardColorScheme {
  bg: string;
  accent: string;
  border: string;
}

export interface CardConfig {
  id: string;
  gridColumn: string;
  gridRow: string;
  colorScheme: CardColorScheme;
  borderRadius?: string;
  hasExpandedView: boolean;
}

export const CARD_CONFIGS: CardConfig[] = [
  {
    id: "weather",
    gridColumn: "1 / 3",
    gridRow: "1 / 3",
    colorScheme: {
      bg: "bg-gradient-to-br from-sky-500/15 to-blue-400/10",
      accent: "#38bdf8",
      border: "border-sky-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "clock",
    gridColumn: "3 / 5",
    gridRow: "1 / 3",
    colorScheme: {
      bg: "",
      accent: "#facc15",
      border: "",
    },
    hasExpandedView: true,
  },
  {
    id: "countdown",
    gridColumn: "5 / 7",
    gridRow: "1 / 2",
    colorScheme: {
      bg: "bg-gradient-to-br from-purple-600/15 to-violet-500/10",
      accent: "#8b5cf6",
      border: "border-purple-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "photo",
    gridColumn: "5 / 7",
    gridRow: "2 / 3",
    colorScheme: {
      bg: "bg-gradient-to-br from-rose-400/15 to-pink-300/10",
      accent: "#fb7185",
      border: "border-rose-400/10",
    },
    borderRadius: "rounded-3xl",
    hasExpandedView: false,
  },
  {
    id: "wifi",
    gridColumn: "1 / 2",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "",
      accent: "#22c55e",
      border: "border-green-500/10",
    },
    hasExpandedView: false,
  },
  {
    id: "lights",
    gridColumn: "2 / 3",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-amber-400/15 to-yellow-300/10",
      accent: "#f59e0b",
      border: "border-amber-400/10",
    },
    hasExpandedView: true,
  },
  {
    id: "music",
    gridColumn: "3 / 4",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-slate-600/15 to-slate-500/10",
      accent: "#06b6d4",
      border: "border-slate-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "calendar",
    gridColumn: "4 / 5",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "",
      accent: "#f97316",
      border: "border-orange-400/10",
    },
    hasExpandedView: true,
  },
  {
    id: "email",
    gridColumn: "5 / 6",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-blue-400/15 to-blue-300/10",
      accent: "#3b82f6",
      border: "border-blue-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "system",
    gridColumn: "6 / 7",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-green-400/10 to-emerald-300/5",
      accent: "#22c55e",
      border: "border-green-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "quote",
    gridColumn: "1 / 3",
    gridRow: "4 / 5",
    colorScheme: {
      bg: "bg-gradient-to-br from-stone-200/10 to-stone-100/5",
      accent: "#84cc16",
      border: "border-stone-300/10",
    },
    borderRadius: "rounded-3xl",
    hasExpandedView: false,
  },
  {
    id: "theme",
    gridColumn: "3 / 4",
    gridRow: "4 / 5",
    colorScheme: {
      bg: "",
      accent: "#d4a574",
      border: "",
    },
    borderRadius: "rounded-full",
    hasExpandedView: false,
  },
];

export function getCardConfig(id: string): CardConfig | undefined {
  return CARD_CONFIGS.find((c) => c.id === id);
}
