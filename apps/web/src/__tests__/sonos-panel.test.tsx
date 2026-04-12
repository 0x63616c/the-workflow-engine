import { SonosPanel } from "@/components/sonos/sonos-panel";
import * as useSonosModule from "@/hooks/use-sonos";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-sonos");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const setViewFn = vi.fn();
vi.mock("@/stores/navigation-store", () => ({
  useNavigationStore: vi.fn(
    (selector: (s: { view: string; setView: typeof setViewFn }) => unknown) =>
      selector({ view: "sonos", setView: setViewFn }),
  ),
}));

const mockUseSonos = vi.mocked(useSonosModule.useSonos);
const sendCommandFn = vi.fn();
const setVolumeFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      mediaTitle: "Test Song",
      mediaArtist: "Test Artist",
      albumArtUrl: undefined,
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
      mediaPosition: 30,
      mediaDuration: 180,
      mediaPositionUpdatedAt: undefined,
    },
    ...overrides,
  };
}

function setupHook(overrides = {}) {
  const player = makePlayer();
  mockUseSonos.mockReturnValue({
    players: [player],
    activeSpeaker: player,
    isLoading: false,
    isError: false,
    sendCommand: sendCommandFn,
    setVolume: setVolumeFn,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

afterEach(() => {
  cleanup();
});

describe("SonosPanel", () => {
  it("renders track title and artist", () => {
    render(<SonosPanel />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("back button calls setView hub", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(setViewFn).toHaveBeenCalledWith("hub");
  });

  it("play/pause button calls sendCommand", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "pause");
  });

  it("next button calls sendCommand next", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "next");
  });

  it("previous button calls sendCommand previous", () => {
    render(<SonosPanel />);
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "previous");
  });

  it("renders all speakers in speaker list", () => {
    const players = [
      makePlayer(),
      makePlayer({
        entityId: "media_player.bedroom",
        friendlyName: "Bedroom",
        state: "paused" as const,
      }),
    ];
    setupHook({ players, activeSpeaker: players[0] });
    render(<SonosPanel />);
    expect(screen.getByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("Bedroom")).toBeInTheDocument();
  });

  it("shows fallback state when no active speaker", () => {
    setupHook({ players: [], activeSpeaker: null });
    render(<SonosPanel />);
    expect(screen.getByText(/no speakers/i)).toBeInTheDocument();
  });

  it("volume slider calls setVolume", async () => {
    vi.useFakeTimers();
    render(<SonosPanel />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    vi.advanceTimersByTime(300);
    expect(setVolumeFn).toHaveBeenCalledWith("media_player.living_room", 75);
    vi.useRealTimers();
  });
});
