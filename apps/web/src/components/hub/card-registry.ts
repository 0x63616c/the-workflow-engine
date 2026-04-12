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
    id: "clock",
    gridColumn: "1 / 4",
    gridRow: "1 / 3",
    colorScheme: {
      bg: "",
      accent: "#fafafa",
      border: "",
    },
    hasExpandedView: true,
  },
  {
    id: "countdown",
    gridColumn: "4 / 7",
    gridRow: "1 / 2",
    colorScheme: {
      bg: "bg-gradient-to-br from-purple-600/15 to-violet-500/10",
      accent: "#8b5cf6",
      border: "border-purple-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "music",
    gridColumn: "4 / 7",
    gridRow: "2 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-slate-600/15 to-slate-500/10",
      accent: "#06b6d4",
      border: "border-slate-500/10",
    },
    hasExpandedView: true,
  },
  {
    id: "lights",
    gridColumn: "1 / 2",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-amber-400/15 to-yellow-300/10",
      accent: "#f59e0b",
      border: "border-amber-400/10",
    },
    hasExpandedView: true,
  },
  {
    id: "fan",
    gridColumn: "2 / 3",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-cyan-400/15 to-sky-300/10",
      accent: "#22d3ee",
      border: "border-cyan-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "climate",
    gridColumn: "3 / 4",
    gridRow: "3 / 4",
    colorScheme: {
      bg: "bg-gradient-to-br from-green-400/15 to-emerald-300/10",
      accent: "#22c55e",
      border: "border-green-400/10",
    },
    hasExpandedView: false,
  },
  {
    id: "wifi",
    gridColumn: "1 / 4",
    gridRow: "4 / 5",
    colorScheme: {
      bg: "",
      accent: "#22c55e",
      border: "border-green-500/10",
    },
    hasExpandedView: false,
  },
];

export function getCardConfig(id: string): CardConfig | undefined {
  return CARD_CONFIGS.find((c) => c.id === id);
}
