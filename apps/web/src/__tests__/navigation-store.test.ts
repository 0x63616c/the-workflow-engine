import { CLOCK_STATE_COUNT, useNavigationStore } from "@/stores/navigation-store";
import { afterEach, describe, expect, it } from "vitest";

describe("navigation-store", () => {
  afterEach(() => {
    useNavigationStore.setState({ view: "clock" });
  });

  it("initializes with clock view", () => {
    const state = useNavigationStore.getState();
    expect(state.view).toBe("clock");
  });

  it("setView changes view to hub", () => {
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().view).toBe("hub");
  });

  it("setView changes view back to clock", () => {
    useNavigationStore.getState().setView("hub");
    useNavigationStore.getState().setView("clock");
    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("setView changes view to sonos", () => {
    useNavigationStore.getState().setView("sonos");
    expect(useNavigationStore.getState().view).toBe("sonos");
  });

  it("setView changes view from sonos back to hub", () => {
    useNavigationStore.getState().setView("sonos");
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().view).toBe("hub");
  });

  it("setView changes view to timer", () => {
    useNavigationStore.getState().setView("timer");
    expect(useNavigationStore.getState().view).toBe("timer");
  });

  it("setView changes view from timer back to hub", () => {
    useNavigationStore.getState().setView("timer");
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().view).toBe("hub");
  });
});

describe("clockStateIndex", () => {
  afterEach(() => {
    useNavigationStore.setState({ view: "clock" });
  });

  it("initializes clockStateIndex to 0", () => {
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("setClockStateIndex sets index to 3", () => {
    useNavigationStore.getState().setClockStateIndex(3);
    expect(useNavigationStore.getState().clockStateIndex).toBe(3);
  });

  it("setClockStateIndex clamps below 0 to 0", () => {
    useNavigationStore.getState().setClockStateIndex(-1);
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("setClockStateIndex clamps above 11 to 11", () => {
    useNavigationStore.getState().setClockStateIndex(12);
    expect(useNavigationStore.getState().clockStateIndex).toBe(11);
  });

  it("setClockStateIndex clamps NaN to 0", () => {
    useNavigationStore.getState().setClockStateIndex(Number.NaN);
    expect(useNavigationStore.getState().clockStateIndex).toBe(0);
  });

  it("changing clockStateIndex does not affect view", () => {
    useNavigationStore.getState().setClockStateIndex(5);
    expect(useNavigationStore.getState().view).toBe("clock");
  });

  it("changing view does not affect clockStateIndex", () => {
    useNavigationStore.getState().setClockStateIndex(3);
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().clockStateIndex).toBe(3);
  });

  it("CLOCK_STATE_COUNT is 12", () => {
    expect(CLOCK_STATE_COUNT).toBe(12);
  });
});
