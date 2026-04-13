import type { CardPaletteColor } from "@/lib/palette";
import type { ComponentType } from "react";

export interface CardColorScheme {
  color: CardPaletteColor;
}

export interface CardConfig {
  id: string;
  gridColumn: string;
  gridRow: string;
  colorScheme: CardColorScheme;
  borderRadius?: string;
  // biome-ignore lint/suspicious/noExplicitAny: cards have varying prop signatures
  component: ComponentType<any>;
  expandedView?: ComponentType;
}

const registry: CardConfig[] = [];

export function registerCard(config: CardConfig): void {
  const existing = registry.findIndex((c) => c.id === config.id);
  if (existing >= 0) {
    registry[existing] = config;
  } else {
    registry.push(config);
  }
}

export function getCardConfig(id: string): CardConfig | undefined {
  return registry.find((c) => c.id === id);
}

export function getRegisteredCards(): readonly CardConfig[] {
  return registry;
}

export function getExpandedView(id: string): ComponentType | undefined {
  return registry.find((c) => c.id === id)?.expandedView;
}

/** @deprecated Use getRegisteredCards() instead */
export const CARD_CONFIGS = registry;
