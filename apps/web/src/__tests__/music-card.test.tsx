import { MusicCard } from "@/components/hub/music-card";
import * as useSonosModule from "@/hooks/use-sonos";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-sonos");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseSonos = vi.mocked(useSonosModule.useSonos);

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
    sendCommand: vi.fn(),
    setVolume: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
  useCardExpansionStore.setState({ expandedCardId: null });
});

afterEach(() => {
  cleanup();
});

describe("MusicCard", () => {
  it("shows track title from active speaker", () => {
    render(<MusicCard />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
  });

  it("tapping card expands music card", () => {
    render(<MusicCard />);
    fireEvent.click(screen.getByTestId("widget-card-music"));
    expect(useCardExpansionStore.getState().expandedCardId).toBe("music");
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
