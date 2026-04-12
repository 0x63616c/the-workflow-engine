import { useSonos } from "@/hooks/use-sonos";
import { trpc } from "@/lib/trpc";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    devices: {
      mediaPlayers: {
        useQuery: vi.fn(),
      },
      mediaPlayerCommand: {
        useMutation: vi.fn(),
      },
      setVolume: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockMediaPlayersQuery = vi.mocked(trpc.devices.mediaPlayers.useQuery);
const mockCommandMutation = vi.mocked(trpc.devices.mediaPlayerCommand.useMutation);
const mockVolumeMutation = vi.mocked(trpc.devices.setVolume.useMutation);

const commandMutateFn = vi.fn();
const volumeMutateFn = vi.fn();

function makePlayer(overrides = {}) {
  return {
    entityId: "media_player.living_room",
    friendlyName: "Living Room",
    state: "playing" as const,
    attributes: {
      volume: 60,
      shuffle: false,
      repeat: "off" as const,
    },
    ...overrides,
  };
}

function setupMocks({ queryData = undefined as unknown, isLoading = false, isError = false } = {}) {
  mockMediaPlayersQuery.mockReturnValue({ data: queryData, isLoading, isError } as never);
  mockCommandMutation.mockReturnValue({ mutate: commandMutateFn } as never);
  mockVolumeMutation.mockReturnValue({ mutate: volumeMutateFn } as never);
}

describe("useSonos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty players when loading", () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useSonos());
    expect(result.current.players).toEqual([]);
    expect(result.current.activeSpeaker).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns players array on success", () => {
    const players = [
      makePlayer(),
      makePlayer({
        entityId: "media_player.bedroom",
        friendlyName: "Bedroom",
        state: "paused" as const,
      }),
    ];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.players).toHaveLength(2);
  });

  it("activeSpeaker is first playing speaker", () => {
    const players = [
      makePlayer({
        entityId: "media_player.bedroom",
        friendlyName: "Bedroom",
        state: "paused" as const,
      }),
      makePlayer({
        entityId: "media_player.living_room",
        friendlyName: "Living Room",
        state: "playing" as const,
      }),
    ];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker?.entityId).toBe("media_player.living_room");
  });

  it("activeSpeaker falls back to first player when none playing", () => {
    const players = [
      makePlayer({ entityId: "media_player.a", state: "paused" as const }),
      makePlayer({ entityId: "media_player.b", state: "paused" as const }),
    ];
    setupMocks({ queryData: players });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker?.entityId).toBe("media_player.a");
  });

  it("activeSpeaker is null when no players", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    expect(result.current.activeSpeaker).toBeNull();
  });

  it("returns isError true when query fails", () => {
    setupMocks({ isError: true });
    const { result } = renderHook(() => useSonos());
    expect(result.current.isError).toBe(true);
  });

  it("returns isError true when data contains error field", () => {
    setupMocks({ queryData: { error: "HA unavailable" } });
    const { result } = renderHook(() => useSonos());
    expect(result.current.isError).toBe(true);
  });

  it("sendCommand calls mutation with correct args", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    result.current.sendCommand("media_player.living_room", "play");
    expect(commandMutateFn).toHaveBeenCalledWith({
      entityId: "media_player.living_room",
      command: "play",
    });
  });

  it("setVolume calls mutation with correct args", () => {
    setupMocks({ queryData: [] });
    const { result } = renderHook(() => useSonos());
    result.current.setVolume("media_player.living_room", 75);
    expect(volumeMutateFn).toHaveBeenCalledWith({
      entityId: "media_player.living_room",
      volumeLevel: 75,
    });
  });
});
