import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";

interface SonosControlsProps {
  entityId: string;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  sendCommand: (entityId: string, command: string) => void;
}

export function SonosControls({
  entityId,
  isPlaying,
  shuffle,
  repeat,
  sendCommand,
}: SonosControlsProps) {
  const activeClass = "text-accent";
  const inactiveClass = "text-white/40";

  return (
    <div className="flex items-center justify-center gap-8">
      <button
        type="button"
        aria-label="Shuffle"
        onClick={() => sendCommand(entityId, "shuffle")}
        className={`p-3 rounded-full ${shuffle ? activeClass : inactiveClass}`}
      >
        <Shuffle size={18} />
      </button>
      <button
        type="button"
        aria-label="Previous"
        onClick={() => sendCommand(entityId, "previous")}
        className="p-2 rounded-full text-white/80"
      >
        <SkipBack size={22} />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={() => sendCommand(entityId, isPlaying ? "pause" : "play")}
        className="p-2 rounded-full text-white"
      >
        {isPlaying ? <Pause size={28} /> : <Play size={28} />}
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => sendCommand(entityId, "next")}
        className="p-2 rounded-full text-white/80"
      >
        <SkipForward size={22} />
      </button>
      <button
        type="button"
        aria-label="Repeat"
        onClick={() => sendCommand(entityId, "repeat")}
        className={`p-3 rounded-full ${repeat !== "off" ? activeClass : inactiveClass}`}
      >
        {repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
      </button>
    </div>
  );
}
