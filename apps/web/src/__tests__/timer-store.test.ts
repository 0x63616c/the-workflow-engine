import { useTimerStore } from "@/stores/timer-store";
import { afterEach, describe, expect, it } from "vitest";

describe("timer-store", () => {
  afterEach(() => {
    useTimerStore.setState({ status: "idle", duration_MS: 0, remaining_MS: 0 });
  });

  it("initializes with idle status, 0 duration_MS, 0 remaining_MS", () => {
    const state = useTimerStore.getState();
    expect(state.status).toBe("idle");
    expect(state.duration_MS).toBe(0);
    expect(state.remaining_MS).toBe(0);
  });

  it("start() sets status to running with correct duration_MS and remaining_MS", () => {
    useTimerStore.getState().start(300_000);
    const state = useTimerStore.getState();
    expect(state.status).toBe("running");
    expect(state.duration_MS).toBe(300_000);
    expect(state.remaining_MS).toBe(300_000);
  });

  it("pause() sets status from running to paused", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    expect(useTimerStore.getState().status).toBe("paused");
  });

  it("resume() sets status from paused to running", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    useTimerStore.getState().resume();
    expect(useTimerStore.getState().status).toBe("running");
  });

  it("reset() resets to initial state", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().reset();
    const state = useTimerStore.getState();
    expect(state.status).toBe("idle");
    expect(state.duration_MS).toBe(0);
    expect(state.remaining_MS).toBe(0);
  });

  it("tick() decrements remaining_MS", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().remaining_MS).toBe(59_500);
  });

  it("tick() sets status to done when remaining_MS reaches 0", () => {
    useTimerStore.getState().start(500);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().status).toBe("done");
    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick() clamps remaining_MS to 0 (does not go negative)", () => {
    useTimerStore.getState().start(200);
    useTimerStore.getState().tick(500);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
    expect(useTimerStore.getState().status).toBe("done");
  });

  it("tick() does nothing when status is paused", () => {
    useTimerStore.getState().start(60_000);
    useTimerStore.getState().pause();
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(60_000);
  });

  it("tick() does nothing when status is idle", () => {
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
  });

  it("tick() does nothing when status is done", () => {
    useTimerStore.getState().start(500);
    useTimerStore.getState().tick(500);
    useTimerStore.getState().tick(1_000);
    expect(useTimerStore.getState().remaining_MS).toBe(0);
    expect(useTimerStore.getState().status).toBe("done");
  });
});
