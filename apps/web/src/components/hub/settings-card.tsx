import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useAppConfig } from "@/hooks/use-app-config";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { useThemeStore } from "@/stores/theme-store";
import { Settings } from "lucide-react";

const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const DEFAULT_DIM_TIMEOUT_MS = 60_000;
const DEFAULT_DIM_BRIGHTNESS = 0.2;

export function SettingsCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("settings");

  return (
    <BentoCard
      testId="widget-card-settings"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("settings")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Settings</span>
          <Settings size={16} className="text-muted-foreground/60" />
        </div>
      </div>
    </BentoCard>
  );
}

export function SettingsCardExpanded() {
  const { get } = useAppConfig();
  const activePaletteId = useThemeStore((s) => s.activePaletteId);
  const setActivePalette = useThemeStore((s) => s.setActivePalette);

  const pingQuery = trpc.health.ping.useQuery(undefined, { refetchInterval: 5_000 });
  const buildHashQuery = trpc.health.buildHash.useQuery();

  const idleTimeout_MS =
    (get("display.idleTimeout_MS") as number | null) ?? DEFAULT_IDLE_TIMEOUT_MS;
  const idleTimeout_S = Math.round(idleTimeout_MS / 1000);
  const dimTimeout_MS = (get("display.dimTimeout_MS") as number | null) ?? DEFAULT_DIM_TIMEOUT_MS;
  const dimTimeout_S = Math.round(dimTimeout_MS / 1000);
  const dimBrightness = (get("display.dimBrightness") as number | null) ?? DEFAULT_DIM_BRIGHTNESS;
  const dimBrightnessPercent = Math.round(dimBrightness * 100);

  const apiStatus = pingQuery.isError
    ? "Unavailable"
    : pingQuery.isLoading
      ? "Checking..."
      : "Online";
  const buildHash = buildHashQuery.data?.hash ?? "unknown";

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-xl font-light text-foreground mb-6">Settings</h2>

      <section className="mb-8">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          Appearance
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setActivePalette("midnight")}
            className={`flex-1 py-3 text-sm font-medium border transition-colors ${
              activePaletteId === "midnight"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground/30"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setActivePalette("daylight")}
            className={`flex-1 py-3 text-sm font-medium border transition-colors ${
              activePaletteId === "daylight"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground/30"
            }`}
          >
            Light
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          Display
        </h3>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">Idle timeout</span>
          <span className="text-sm text-muted-foreground">{idleTimeout_S}s</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">Dim timeout</span>
          <span className="text-sm text-muted-foreground">{dimTimeout_S}s</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">Dim brightness</span>
          <span className="text-sm text-muted-foreground">{dimBrightnessPercent}%</span>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          System
        </h3>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">API</span>
          <span
            className={`text-sm ${
              pingQuery.isError
                ? "text-destructive"
                : pingQuery.isLoading
                  ? "text-muted-foreground"
                  : "text-green-400"
            }`}
          >
            {apiStatus}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">Build</span>
          <span className="text-sm text-muted-foreground font-mono">{buildHash}</span>
        </div>
      </section>
    </div>
  );
}
