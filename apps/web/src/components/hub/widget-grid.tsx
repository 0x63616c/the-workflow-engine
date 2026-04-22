import "@/components/hub/register-cards";
import { getRegisteredCards } from "@/components/hub/card-registry";
import { CountdownCardMini } from "@/components/hub/countdown-card";
import { useAppConfig } from "@/hooks/use-app-config";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useScreenDimming } from "@/hooks/use-screen-dimming";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useEffect, useRef, useState } from "react";

const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const DEFAULT_DIM_TIMEOUT_MS = 60_000;
const DEFAULT_DIM_BRIGHTNESS = 0.2;
const GRID_COLS = 6;
const GRID_ROWS = 10;
const GRID_GAP_PX = 12; // gap-3 = 12px

function computeCellSize(contentWidth: number): number {
  const totalGaps = (GRID_COLS - 1) * GRID_GAP_PX;
  return (contentWidth - totalGaps) / GRID_COLS;
}

export function WidgetGrid() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const upcoming = trpc.countdownEvents.listUpcoming.useQuery();
  const upcomingEvents = upcoming.data ?? [];
  const { get: getConfig } = useAppConfig();
  const idleTimeout_MS =
    (getConfig("display.idleTimeout_MS") as number | null) ?? DEFAULT_IDLE_TIMEOUT_MS;
  const dimTimeout_MS =
    (getConfig("display.dimTimeout_MS") as number | null) ?? DEFAULT_DIM_TIMEOUT_MS;
  const dimBrightness =
    (getConfig("display.dimBrightness") as number | null) ?? DEFAULT_DIM_BRIGHTNESS;
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize_PX, setCellSize_PX] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setCellSize_PX(computeCellSize(width));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useIdleTimeout(() => expandCard("clock"), idleTimeout_MS, {
    enabled: expandedCardId === null,
  });

  // Dim when idle on the main grid or when clock art is showing (passive).
  // Disable when any interactive card is expanded (settings, music, lights, etc.).
  const dimmingEnabled = expandedCardId === null || expandedCardId === "clock";
  useScreenDimming({ enabled: dimmingEnabled, dimTimeout_MS, dimBrightness });

  const cards = getRegisteredCards();

  return (
    <div data-testid="hub-container" className="relative min-h-full bg-background">
      <div
        ref={gridRef}
        data-testid="widget-grid"
        className="relative grid gap-3 p-5 min-h-full"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridAutoRows: cellSize_PX > 0 ? `${cellSize_PX}px` : undefined,
        }}
      >
        {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
          const col = (i % GRID_COLS) + 1;
          const row = Math.floor(i / GRID_COLS) + 1;
          return (
            <div
              key={`placeholder-${col}-${row}`}
              data-testid={`grid-placeholder-${col}-${row}`}
              aria-hidden="true"
              className="rounded-2xl border"
              style={{
                gridColumn: `${col} / ${col + 1}`,
                gridRow: `${row} / ${row + 1}`,
                borderColor: "color-mix(in srgb, var(--color-foreground) 3%, transparent)",
                backgroundColor: "color-mix(in srgb, var(--color-foreground) 1%, transparent)",
              }}
            />
          );
        })}
        {cards.map((card) => {
          if (card.id === "countdown") {
            return <CountdownCardMini key={card.id} events={upcomingEvents} />;
          }
          const Component = card.component;
          return <Component key={card.id} />;
        })}
      </div>
    </div>
  );
}
