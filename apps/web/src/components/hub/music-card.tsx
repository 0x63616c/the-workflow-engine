import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useSonos } from "@/hooks/use-sonos";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

function EqualizerBars({ active }: { active: boolean }) {
  const barHeights = [60, 100, 40, 80];

  return (
    <div className="flex items-end gap-0.5 h-4">
      {barHeights.map((height, i) => (
        <div
          key={height}
          className={`
            w-[3px] rounded-full bg-card-blue-accent transition-all
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
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("music");
  const { activeSpeaker, players, isError } = useSonos();

  const isPlaying = activeSpeaker?.state === "playing";
  const track = activeSpeaker?.attributes.mediaTitle;

  return (
    <BentoCard
      testId="widget-card-music"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("music")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-xl text-muted-foreground">Music</span>
          <EqualizerBars active={isPlaying} />
        </div>
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {isError ? (
            <div className="text-lg text-muted-foreground/50">Unavailable</div>
          ) : players.length === 0 ? (
            <div className="text-lg text-muted-foreground/50">No speakers</div>
          ) : (
            <div className="text-lg text-foreground truncate">{track ?? "Not playing"}</div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}
