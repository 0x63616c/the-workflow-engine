import { describe, expect, it } from "vitest";

import "@/components/hub/register-cards";
import { getCardConfig, getRegisteredCards } from "@/components/hub/card-registry";

describe("card-registry", () => {
  it("has 10 card configs", () => {
    expect(getRegisteredCards()).toHaveLength(10);
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

  it("clock card has a palette color assigned", () => {
    const clock = getCardConfig("clock");
    expect(clock?.colorScheme.color).toBe("iris");
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

  it("settings card has expanded view and correct grid position", () => {
    const settings = getCardConfig("settings");
    expect(settings?.expandedView).toBeDefined();
    expect(settings?.gridColumn).toBe("6 / 7");
    expect(settings?.gridRow).toBe("4 / 5");
  });
});
