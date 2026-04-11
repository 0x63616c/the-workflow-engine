import { useNavigationStore } from "@/stores/navigation-store";
import { afterEach, describe, expect, it } from "vitest";

describe("navigation-store", () => {
  afterEach(() => {
    useNavigationStore.setState({ view: "clock", animated: false });
  });

  it("initializes with clock view and no animation", () => {
    const state = useNavigationStore.getState();
    expect(state.view).toBe("clock");
    expect(state.animated).toBe(false);
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

  it("setView with animated=true sets animated flag", () => {
    useNavigationStore.getState().setView("clock", true);
    expect(useNavigationStore.getState().animated).toBe(true);
  });

  it("setView defaults animated to false", () => {
    useNavigationStore.getState().setView("hub");
    expect(useNavigationStore.getState().animated).toBe(false);
  });
});
