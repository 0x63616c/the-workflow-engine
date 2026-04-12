import { afterEach, describe, expect, it } from "vitest";

import { useCardExpansionStore } from "@/stores/card-expansion-store";

describe("card-expansion-store", () => {
  afterEach(() => {
    useCardExpansionStore.setState({ expandedCardId: null });
  });

  it("initializes with no card expanded", () => {
    const state = useCardExpansionStore.getState();
    expect(state.expandedCardId).toBeNull();
  });

  it("expandCard sets expandedCardId", () => {
    useCardExpansionStore.getState().expandCard("weather");
    expect(useCardExpansionStore.getState().expandedCardId).toBe("weather");
  });

  it("contractCard sets expandedCardId to null", () => {
    useCardExpansionStore.getState().expandCard("weather");
    useCardExpansionStore.getState().contractCard();
    expect(useCardExpansionStore.getState().expandedCardId).toBeNull();
  });

  it("expanding another card replaces the current one", () => {
    useCardExpansionStore.getState().expandCard("weather");
    useCardExpansionStore.getState().expandCard("clock");
    expect(useCardExpansionStore.getState().expandedCardId).toBe("clock");
  });
});
