import "@/components/hub/register-cards";
import { getRegisteredCards } from "@/components/hub/card-registry";
import { CountdownCardMini } from "@/components/hub/countdown-card";
import { useAppConfig } from "@/hooks/use-app-config";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useScreenDimming } from "@/hooks/use-screen-dimming";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const DEFAULT_DIM_TIMEOUT_MS = 60_000;
const DEFAULT_DIM_BRIGHTNESS = 0.2;

export function WidgetGrid() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const upcoming = trpc.countdownEvents.listUpcoming.useQuery();
  const nextEvent = upcoming.data?.[0] ?? null;
  const { get: getConfig } = useAppConfig();
  const idleTimeout_MS =
    (getConfig("display.idleTimeout_MS") as number | null) ?? DEFAULT_IDLE_TIMEOUT_MS;
  const dimTimeout_MS =
    (getConfig("display.dimTimeout_MS") as number | null) ?? DEFAULT_DIM_TIMEOUT_MS;
  const dimBrightness =
    (getConfig("display.dimBrightness") as number | null) ?? DEFAULT_DIM_BRIGHTNESS;

  const { remainingSeconds } = useIdleTimeout(() => expandCard("clock"), idleTimeout_MS, {
    enabled: expandedCardId === null,
  });

  // Dim when idle on the main grid or when clock art is showing (passive).
  // Disable when any interactive card is expanded (settings, music, lights, etc.).
  const dimmingEnabled = expandedCardId === null || expandedCardId === "clock";
  useScreenDimming({ enabled: dimmingEnabled, dimTimeout_MS, dimBrightness });

  const cards = getRegisteredCards();

  return (
    <div data-testid="hub-container" className="relative h-full bg-background">
      <div
        data-testid="widget-grid"
        className="relative grid gap-3 p-5 h-full"
        style={{
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
        }}
      >
        {cards.map((card) => {
          if (card.id === "countdown") {
            return <CountdownCardMini key={card.id} nextEvent={nextEvent} />;
          }
          const Component = card.component;
          return <Component key={card.id} />;
        })}
      </div>
      <span className="fixed bottom-2 left-3 font-mono text-xs tabular-nums text-muted-foreground/30">
        {remainingSeconds}
      </span>
    </div>
  );
}
