import { MusicCard } from "@/components/hub/music-card";
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
      selector({ view: "hub", setView: setViewFn }),
  ),
}));

const mockUseSonos = vi.mocked(useSonosModule.useSonos);
const sendCommandFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      mediaTitle: "Test Song",
      mediaArtist: "Test Artist",
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
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
    setVolume: vi.fn(),
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

describe("MusicCard", () => {
  it("shows track title and artist from active speaker", () => {
    render(<MusicCard />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("tapping card navigates to sonos view", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(setViewFn).toHaveBeenCalledWith("sonos");
  });

  it("play button calls sendCommand play when paused", () => {
    setupHook({ activeSpeaker: makePlayer({ state: "paused" as const }) });
    render(<MusicCard />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "play");
  });

  it("pause button calls sendCommand pause when playing", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(sendCommandFn).toHaveBeenCalledWith("media_player.living_room", "pause");
  });

  it("shows No speakers when no players", () => {
    setupHook({ players: [], activeSpeaker: null });
    render(<MusicCard />);
    expect(screen.getByText(/no speakers/i)).toBeInTheDocument();
  });

  it("shows Unavailable on error", () => {
    setupHook({ isError: true });
    render(<MusicCard />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
