import { describe, expect, it } from "vitest";

import { CARD_CONFIGS, getCardConfig } from "@/components/hub/card-registry";

describe("card-registry", () => {
  it("has 7 card configs", () => {
    expect(CARD_CONFIGS).toHaveLength(7);
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
    const clock = getCardConfig("clock");
    expect(clock).toBeDefined();
    expect(clock?.gridColumn).toBe("1 / 4");
    expect(clock?.gridRow).toBe("1 / 3");
  });

  it("getCardConfig returns undefined for unknown id", () => {
    expect(getCardConfig("nonexistent")).toBeUndefined();
  });

  it("wifi card has no expanded view", () => {
    const wifi = getCardConfig("wifi");
    expect(wifi?.hasExpandedView).toBe(false);
  });

  it("fan card has no expanded view", () => {
    const fan = getCardConfig("fan");
    expect(fan?.hasExpandedView).toBe(false);
  });

  it("music card has expanded view", () => {
    const music = getCardConfig("music");
    expect(music?.hasExpandedView).toBe(true);
  });
});
