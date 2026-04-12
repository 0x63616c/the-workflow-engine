import { CalendarCard } from "@/components/hub/calendar-card";
import { ClockCard } from "@/components/hub/clock-card";
import { CountdownCardMini } from "@/components/hub/countdown-card";
import { EmailCard } from "@/components/hub/email-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { PhotoCard } from "@/components/hub/photo-card";
import { QuoteCard } from "@/components/hub/quote-card";
import { SystemStatusCard } from "@/components/hub/system-status-card";
import { ThemeToggleCard } from "@/components/hub/theme-toggle-card";
import { WeatherCard } from "@/components/hub/weather-card";
import { WifiCard } from "@/components/hub/wifi-card";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";

const IDLE_TIMEOUT_MS = 45_000;

export function WidgetGrid() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const expandedCardId = useCardExpansionStore((s) => s.expandedCardId);
  const upcoming = trpc.countdownEvents.listUpcoming.useQuery();
  const nextEvent = upcoming.data?.[0] ?? null;

  const { remainingSeconds } = useIdleTimeout(() => expandCard("clock"), IDLE_TIMEOUT_MS, {
    enabled: expandedCardId === null,
  });

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
        <WeatherCard temp={72} condition="Partly Cloudy" high={78} low={64} />
        <ClockCard />
        <CountdownCardMini nextEvent={nextEvent} />
        <PhotoCard />
        <WifiCard />
        <LightsCard />
        <MusicCard />
        <CalendarCard />
        <EmailCard />
        <SystemStatusCard />
        <QuoteCard />
        <ThemeToggleCard />
      </div>
      <span className="fixed bottom-2 left-3 font-mono text-xs tabular-nums text-muted-foreground/30">
        {remainingSeconds}
      </span>
    </div>
  );
}
