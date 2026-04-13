import { env } from "../env";
import { ha } from "../integrations/homeassistant";

export interface LightsState {
  onCount: number;
  totalCount: number;
}

export interface MediaPlayer {
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

export type MediaPlayerCommand = "play" | "pause" | "next" | "previous" | "shuffle" | "repeat";

const REPEAT_CYCLE: Array<"off" | "one" | "all"> = ["off", "one", "all"];

export interface ClimateState {
  entityId: string;
  friendlyName: string;
  currentTemp: number | null;
  tempUnit: "F" | "C";
  hvacMode: string;
  hvacAction: string | null;
  fanOn: boolean;
  fanEntityId: string | null;
  targetTemp: number | null;
}

export async function getClimateState(): Promise<ClimateState | null> {
  const [entities, fanEntities] = await Promise.all([
    ha.getEntities("climate"),
    ha.getEntities("fan"),
  ]);
  if (entities.length === 0) return null;

  const entity = entities.sort((a, b) => a.entity_id.localeCompare(b.entity_id))[0];

  const attrs = entity.attributes;
  const hvacMode = entity.state;
  const hvacAction = (attrs.hvac_action as string) ?? null;
  const fanOn = hvacMode === "fan_only" || (hvacMode !== "off" && hvacAction === "fan");

  const climateName = entity.entity_id.replace("climate.", "");
  const matchingFan = fanEntities.find((e) => e.entity_id.replace("fan.", "") === climateName);

  return {
    entityId: entity.entity_id,
    friendlyName: (attrs.friendly_name as string) ?? entity.entity_id,
    currentTemp: (attrs.current_temperature as number) ?? null,
    tempUnit: (attrs.temperature_unit as string)?.includes("C") ? "C" : "F",
    hvacMode,
    hvacAction,
    fanOn,
    fanEntityId: matchingFan?.entity_id ?? null,
    targetTemp: typeof attrs.temperature === "number" ? attrs.temperature : null,
  };
}

export async function turnFanOn(entityId: string, fanEntityId?: string | null): Promise<void> {
  if (fanEntityId) {
    await ha.callService("fan", "turn_on", { entity_id: fanEntityId });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "fan_only",
    });
  }
}

export async function turnFanOff(entityId: string, fanEntityId?: string | null): Promise<void> {
  if (fanEntityId) {
    await ha.callService("fan", "turn_off", { entity_id: fanEntityId });
  } else {
    await ha.callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: "off",
    });
  }
}

export async function setTemperature(entityId: string, temperature: number): Promise<void> {
  await ha.callService("climate", "set_temperature", {
    entity_id: entityId,
    temperature,
  });
}

export async function getLightsState(): Promise<LightsState> {
  const entities = await ha.getEntities("light");
  const available = entities.filter((e) => e.state !== "unavailable");
  return {
    onCount: available.filter((e) => e.state === "on").length,
    totalCount: available.length,
  };
}

export async function turnAllLightsOn(): Promise<void> {
  await ha.callService("light", "turn_on", { entity_id: "all" });
}

export async function turnAllLightsOff(): Promise<void> {
  await ha.callService("light", "turn_off", { entity_id: "all" });
}

function normalizePlayerState(state: string): MediaPlayer["state"] {
  if (state === "playing" || state === "paused" || state === "idle" || state === "off") {
    return state;
  }
  return "unavailable";
}

export async function getMediaPlayers(): Promise<MediaPlayer[]> {
  const entities = await ha.getEntities("media_player");
  const players: MediaPlayer[] = entities.map((e) => {
    const attrs = e.attributes;
    const entityPicture = attrs.entity_picture as string | undefined;
    const albumArtUrl =
      entityPicture != null
        ? entityPicture.startsWith("http")
          ? entityPicture
          : `${env.HA_URL}${entityPicture}`
        : undefined;

    return {
      entityId: e.entity_id,
      friendlyName: (attrs.friendly_name as string) ?? e.entity_id,
      state: normalizePlayerState(e.state),
      attributes: {
        mediaTitle: attrs.media_title as string | undefined,
        mediaArtist: attrs.media_artist as string | undefined,
        mediaAlbumName: attrs.media_album_name as string | undefined,
        albumArtUrl,
        volume: Math.round(((attrs.volume_level as number) ?? 0) * 100),
        shuffle: Boolean(attrs.shuffle),
        repeat: (attrs.repeat as "off" | "one" | "all") ?? "off",
        mediaPosition: attrs.media_position as number | undefined,
        mediaDuration: attrs.media_duration as number | undefined,
        mediaPositionUpdatedAt: attrs.media_position_updated_at as string | undefined,
      },
    };
  });

  return players.sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));
}

export async function mediaPlayerCommand(
  entityId: string,
  command: MediaPlayerCommand,
): Promise<void> {
  if (command === "shuffle") {
    const entity = await ha.getEntity(entityId);
    const current = Boolean(entity.attributes.shuffle);
    await ha.callService("media_player", "shuffle_set", { entity_id: entityId, shuffle: !current });
    return;
  }

  if (command === "repeat") {
    const entity = await ha.getEntity(entityId);
    const current = (entity.attributes.repeat as "off" | "one" | "all") ?? "off";
    const idx = REPEAT_CYCLE.indexOf(current);
    const next = REPEAT_CYCLE[(idx + 1) % REPEAT_CYCLE.length];
    await ha.callService("media_player", "repeat_set", { entity_id: entityId, repeat: next });
    return;
  }

  const serviceMap: Record<string, string> = {
    play: "media_play",
    pause: "media_pause",
    next: "media_next_track",
    previous: "media_previous_track",
  };

  await ha.callService("media_player", serviceMap[command], { entity_id: entityId });
}

export async function setVolume(entityId: string, volumeLevel: number): Promise<void> {
  await ha.callService("media_player", "volume_set", {
    entity_id: entityId,
    volume_level: volumeLevel / 100,
  });
}
