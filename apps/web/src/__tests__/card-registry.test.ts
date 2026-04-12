import { describe, expect, it } from "vitest";

import "@/components/hub/register-cards";
import { getCardConfig, getRegisteredCards } from "@/components/hub/card-registry";

describe("card-registry", () => {
  it("has 7 card configs", () => {
    expect(getRegisteredCards()).toHaveLength(7);
  });

  it("each card has required fields", () => {
    for (const config of getRegisteredCards()) {
      expect(config.id).toBeTruthy();
      expect(config.gridColumn).toBeTruthy();
      expect(config.gridRow).toBeTruthy();
      expect(config.colorScheme).toBeDefined();
      expect(config.component).toBeDefined();
    }
  });

  it("getCardConfig returns config by id", () => {
    const clock = getCardConfig("clock");
    expect(clock).toBeDefined();
    expect(clock?.gridColumn).toBe("1 / 4");
    expect(clock?.gridRow).toBe("1 / 3");
  });

  it("clock card has a prominent border (not empty string)", () => {
    const clock = getCardConfig("clock");
    expect(clock?.colorScheme.border).toBeTruthy();
  });

  it("getCardConfig returns undefined for unknown id", () => {
    expect(getCardConfig("nonexistent")).toBeUndefined();
  });

  it("wifi card has no expanded view", () => {
    const wifi = getCardConfig("wifi");
    expect(wifi?.expandedView).toBeUndefined();
  });

  it("fan card has no expanded view", () => {
    const fan = getCardConfig("fan");
    expect(fan?.expandedView).toBeUndefined();
  });

  it("music card has expanded view", () => {
    const music = getCardConfig("music");
    expect(music?.expandedView).toBeDefined();
  });

  it("no card uses gradient backgrounds", () => {
    for (const config of getRegisteredCards()) {
      expect(config.colorScheme.bg).not.toContain("gradient");
    }
  });

  it("no card uses low-opacity faint borders", () => {
    for (const config of getRegisteredCards()) {
      if (config.colorScheme.border) {
        expect(config.colorScheme.border).not.toMatch(/\/\d+/);
      }
    }
  });
});
