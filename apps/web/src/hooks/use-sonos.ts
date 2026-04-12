import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5_000;

export interface SonosPlayer {
  entityId: string;
  friendlyName: string;
  state: "playing" | "paused" | "idle" | "off" | "unavailable";
  attributes: {
    mediaTitle?: string;
    mediaArtist?: string;
    mediaAlbumName?: string;
    albumArtUrl?: string;
    volume: number;
    shuffle: boolean;
    repeat: "off" | "one" | "all";
    mediaPosition?: number;
    mediaDuration?: number;
    mediaPositionUpdatedAt?: string;
  };
}

export function useSonos() {
  const mediaPlayers = trpc.devices.mediaPlayers.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  });
  const commandMutation = trpc.devices.mediaPlayerCommand.useMutation();
  const volumeMutation = trpc.devices.setVolume.useMutation();

  const data = mediaPlayers.data;
  const hasError = !Array.isArray(data) && data != null && "error" in data;
  const players = Array.isArray(data) ? (data as SonosPlayer[]) : [];
  const activeSpeaker = players.find((p) => p.state === "playing") ?? players[0] ?? null;

  return {
    players,
    activeSpeaker,
    isLoading: mediaPlayers.isLoading,
    isError: hasError || mediaPlayers.isError,
    sendCommand: (entityId: string, command: string) =>
      commandMutation.mutate({
        entityId,
        command: command as "play" | "pause" | "next" | "previous" | "shuffle" | "repeat",
      }),
    setVolume: (entityId: string, volumeLevel: number) =>
      volumeMutation.mutate({ entityId, volumeLevel }),
  };
}
