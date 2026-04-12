import { formatTime } from "@/components/art-clock/art-clock";
import { WidgetCard } from "@/components/hub/widget-card";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { useNavigationStore } from "@/stores/navigation-store";
import { Bell, Calendar, Clock, CloudSun, Lightbulb, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CLOCK_UPDATE_INTERVAL_MS = 1000;
const IDLE_TIMEOUT_MS = 45_000;

interface PlaceholderWidget {
  id: string;
  icon: LucideIcon;
  title: string;
  value?: string;
}

const PLACEHOLDER_WIDGETS: PlaceholderWidget[] = [
  { id: "clock", icon: Clock, title: "Clock" },
  { id: "weather", icon: CloudSun, title: "Weather", value: "72\u00b0F" },
  { id: "lights", icon: Lightbulb, title: "Lights", value: "3 on" },
  { id: "music", icon: Music, title: "Music", value: "Not playing" },
  { id: "calendar", icon: Calendar, title: "Calendar", value: "No events" },
  { id: "notifications", icon: Bell, title: "Notifications", value: "None" },
];

export function WidgetGrid() {
  const setView = useNavigationStore((s) => s.setView);
  const view = useNavigationStore((s) => s.view);
  const now = useCurrentTime(CLOCK_UPDATE_INTERVAL_MS);
  const { hours, minutes, period } = formatTime(now);
  const clockValue = `${hours}:${minutes} ${period}`;

  const { remainingSeconds } = useIdleTimeout(() => setView("clock"), IDLE_TIMEOUT_MS, {
    enabled: view === "hub",
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-dismiss hub on iPad touch panel
    <div data-testid="hub-container" className="relative h-full" onClick={() => setView("clock")}>
      <div data-testid="widget-grid" className="grid grid-cols-2 gap-4 p-6">
        {PLACEHOLDER_WIDGETS.map((widget) => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            icon={widget.icon}
            title={widget.title}
            value={widget.id === "clock" ? clockValue : (widget.value ?? "")}
            onClick={widget.id === "clock" ? () => setView("clock") : undefined}
          />
        ))}
      </div>
      <span className="fixed bottom-2 left-3 font-mono text-xs tabular-nums text-muted-foreground/30">
        {remainingSeconds}
      </span>
    </div>
  );
}
