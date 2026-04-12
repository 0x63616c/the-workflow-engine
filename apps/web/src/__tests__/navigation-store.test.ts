import { useNavigationStore } from "@/stores/navigation-store";
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
});
