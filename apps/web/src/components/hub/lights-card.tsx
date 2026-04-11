import { BentoCard } from "@/components/hub/bento-card";

interface Room {
  name: string;
  on: boolean;
}

const PLACEHOLDER_ROOMS: Room[] = [
  { name: "Living", on: true },
  { name: "Kitchen", on: true },
  { name: "Bedroom", on: false },
  { name: "Office", on: true },
  { name: "Bathroom", on: false },
];

export function LightsCard() {
  const onCount = PLACEHOLDER_ROOMS.filter((r) => r.on).length;
  const total = PLACEHOLDER_ROOMS.length;

  return (
    <BentoCard testId="widget-card-lights" gridArea="lights">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-3">Lights</div>
          <div className="text-lg font-light text-foreground">
            {onCount} of {total} on
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          {PLACEHOLDER_ROOMS.map((room) => (
            <div key={room.name} className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${
                    room.on
                      ? "bg-accent shadow-[0_0_8px_var(--color-accent)] scale-110"
                      : "bg-muted-foreground/20"
                  }
                `}
                title={room.name}
              />
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                {room.name.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
