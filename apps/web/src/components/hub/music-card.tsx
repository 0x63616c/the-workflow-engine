import { BentoCard } from "@/components/hub/bento-card";
import { Pause, Play } from "lucide-react";

interface MusicState {
  playing: boolean;
  track: string;
  artist: string;
}

const PLACEHOLDER_MUSIC: MusicState = {
  playing: false,
  track: "Not playing",
  artist: "",
};

function EqualizerBars({ active }: { active: boolean }) {
  const barHeights = [60, 100, 40, 80];

  return (
    <div className="flex items-end gap-0.5 h-4">
      {barHeights.map((height, i) => (
        <div
          key={height}
          className={`
            w-[3px] rounded-full bg-accent transition-all
            ${active ? "animate-[equalizer_1s_ease-in-out_infinite]" : ""}
          `}
          style={{
            height: active ? undefined : "3px",
            animationDelay: active ? `${i * 0.15}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function MusicCard() {
  const music = PLACEHOLDER_MUSIC;

  return (
    <BentoCard testId="widget-card-music" gridArea="music">
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Music</div>
            <EqualizerBars active={music.playing} />
          </div>
          <div className="text-sm text-foreground truncate">{music.track}</div>
          {music.artist && (
            <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">{music.artist}</div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          {music.playing ? (
            <Pause size={14} className="text-muted-foreground" />
          ) : (
            <Play size={14} className="text-muted-foreground" />
          )}
        </div>
      </div>
    </BentoCard>
  );
}
