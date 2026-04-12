import { describe, expect, it } from "vitest";

import { CARD_CONFIGS, getCardConfig } from "@/components/hub/card-registry";

describe("card-registry", () => {
  it("has 12 card configs", () => {
    expect(CARD_CONFIGS).toHaveLength(12);
  });

  it("each card has required fields", () => {
    for (const config of CARD_CONFIGS) {
      expect(config.id).toBeTruthy();
      expect(config.gridColumn).toBeTruthy();
      expect(config.gridRow).toBeTruthy();
      expect(config.colorScheme).toBeDefined();
      expect(typeof config.hasExpandedView).toBe("boolean");
    }
  });

  it("getCardConfig returns config by id", () => {
    const weather = getCardConfig("weather");
    expect(weather).toBeDefined();
    expect(weather?.gridColumn).toBe("1 / 3");
    expect(weather?.gridRow).toBe("1 / 3");
  });

  it("getCardConfig returns undefined for unknown id", () => {
    expect(getCardConfig("nonexistent")).toBeUndefined();
  });

  it("wifi card has no expanded view", () => {
    const wifi = getCardConfig("wifi");
    expect(wifi?.hasExpandedView).toBe(false);
  });

  it("theme card has no expanded view", () => {
    const theme = getCardConfig("theme");
    expect(theme?.hasExpandedView).toBe(false);
  });

  it("weather card has expanded view", () => {
    const weather = getCardConfig("weather");
    expect(weather?.hasExpandedView).toBe(true);
  });
});
