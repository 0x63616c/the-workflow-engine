import { CalendarCard } from "@/components/hub/calendar-card";
import { ClockCard } from "@/components/hub/clock-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { ThemeToggleCard } from "@/components/hub/theme-toggle-card";
import { WeatherCard } from "@/components/hub/weather-card";
import { WifiCard } from "@/components/hub/wifi-card";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useNavigationStore } from "@/stores/navigation-store";

const IDLE_TIMEOUT_MS = 45_000;

export function WidgetGrid() {
  const setView = useNavigationStore((s) => s.setView);
  const view = useNavigationStore((s) => s.view);

  const { remainingSeconds } = useIdleTimeout(() => setView("clock"), IDLE_TIMEOUT_MS, {
    enabled: view === "hub",
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-dismiss hub on iPad touch panel
    <div
      data-testid="hub-container"
      className="relative h-full bg-background"
      onClick={() => setView("clock")}
    >
      <div
        data-testid="widget-grid"
        className="relative grid gap-3 p-5 h-full"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr",
          gridTemplateAreas: `
              "weather weather clock"
              "wifi    lights  lights"
              "calendar music  theme"
            `,
        }}
      >
        <WeatherCard temp={72} condition="Partly Cloudy" high={78} low={64} />
        <ClockCard />
        <WifiCard />
        <LightsCard />
        <CalendarCard />
        <MusicCard />
        <ThemeToggleCard />
      </div>
      <span className="absolute bottom-2 left-3 font-mono text-xs tabular-nums text-muted-foreground/30">
        {remainingSeconds}
      </span>
    </div>
  );
}
