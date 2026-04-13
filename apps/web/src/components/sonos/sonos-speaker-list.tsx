import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

interface Player {
  entityId: string;
  friendlyName: string;
  state: string;
  attributes: { volume: number; shuffle: boolean; repeat: "off" | "one" | "all" };
}

interface SonosSpeakerListProps {
  players: Player[];
  setVolume: (entityId: string, volume: number) => void;
}

function SpeakerRow({
  player,
  setVolume,
}: { player: Player; setVolume: (entityId: string, volume: number) => void }) {
  const debouncedSetVolume = useDebouncedCallback(
    (v: number) => setVolume(player.entityId, v),
    200,
  );

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-foreground/70 w-28 truncate">{player.friendlyName}</span>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={player.attributes.volume}
        onChange={(e) => debouncedSetVolume(Number(e.target.value))}
        className="flex-1 accent-foreground/60"
      />
      <span className="text-xs text-foreground/30 w-8 text-right">{player.attributes.volume}%</span>
    </div>
  );
}

export function SonosSpeakerList({ players, setVolume }: SonosSpeakerListProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {players.map((p) => (
        <SpeakerRow key={p.entityId} player={p} setVolume={setVolume} />
      ))}
    </div>
  );
}
