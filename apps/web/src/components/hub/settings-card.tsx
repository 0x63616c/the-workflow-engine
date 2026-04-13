import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { PinPadOverlay } from "@/components/hub/pin-pad";
import { useAppConfig } from "@/hooks/use-app-config";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { usePinStore } from "@/stores/pin-store";
import { useThemeStore } from "@/stores/theme-store";
import { Settings } from "lucide-react";
import { useCallback, useState } from "react";

const DEFAULT_IDLE_TIMEOUT_MS = 45_000;
const DEFAULT_DIM_TIMEOUT_MS = 60_000;
const DEFAULT_DIM_BRIGHTNESS = 0.2;

export function SettingsCard() {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("settings");
  const { enabled, isUnlocked } = usePinStore();
  const [showPinPad, setShowPinPad] = useState(false);

  const handleClick = useCallback(() => {
    if (enabled && !isUnlocked) {
      setShowPinPad(true);
    } else {
      expandCard("settings");
    }
  }, [enabled, isUnlocked, expandCard]);

  const handlePinSuccess = useCallback(() => {
    setShowPinPad(false);
    expandCard("settings");
  }, [expandCard]);

  const handlePinDismiss = useCallback(() => {
    setShowPinPad(false);
  }, []);

  return (
    <>
      <BentoCard
        testId="widget-card-settings"
        gridColumn={config?.gridColumn}
        gridRow={config?.gridRow}
        paletteColor={config?.colorScheme.color}
        onClick={handleClick}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Settings</span>
            <Settings size={16} className="text-muted-foreground/60" />
          </div>
        </div>
      </BentoCard>

      {showPinPad && (
        <PinPadOverlay mode="unlock" onSuccess={handlePinSuccess} onDismiss={handlePinDismiss} />
      )}
    </>
  );
}

export function SettingsCardExpanded() {
  const { get } = useAppConfig();
  const activePaletteId = useThemeStore((s) => s.activePaletteId);
  const setActivePalette = useThemeStore((s) => s.setActivePalette);
  const { enabled, pinHash, enable, disable, setPin, lock } = usePinStore();
  const [pinSetupMode, setPinSetupMode] = useState<
    "idle" | "setup-enter" | "setup-confirm" | "change-verify"
  >("idle");
  const [pendingPin, setPendingPin] = useState<string | null>(null);

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

  const handleToggle = useCallback(() => {
    if (enabled) {
      disable();
      lock();
    } else if (pinHash) {
      enable();
    } else {
      // No PIN set yet — start setup
      setPinSetupMode("setup-enter");
    }
  }, [enabled, pinHash, enable, disable, lock]);

  const handleSetupEnterSuccess = useCallback((pin?: string) => {
    if (!pin) return;
    setPendingPin(pin);
    setPinSetupMode("setup-confirm");
  }, []);

  const handleSetupConfirmSuccess = useCallback(
    async (pin?: string) => {
      if (!pin || pin !== pendingPin) {
        // Mismatch — restart
        setPendingPin(null);
        setPinSetupMode("setup-enter");
        return;
      }
      await setPin(pin);
      enable();
      setPendingPin(null);
      setPinSetupMode("idle");
    },
    [pendingPin, setPin, enable],
  );

  const handleChangePinVerifySuccess = useCallback(() => {
    setPinSetupMode("setup-enter");
  }, []);

  if (pinSetupMode === "setup-enter") {
    return (
      <PinPadOverlay
        mode="setup-enter"
        onSuccess={handleSetupEnterSuccess}
        onDismiss={() => setPinSetupMode("idle")}
      />
    );
  }

  if (pinSetupMode === "setup-confirm") {
    return (
      <PinPadOverlay
        mode="setup-confirm"
        onSuccess={handleSetupConfirmSuccess}
        onDismiss={() => {
          setPendingPin(null);
          setPinSetupMode("idle");
        }}
      />
    );
  }

  if (pinSetupMode === "change-verify") {
    return (
      <PinPadOverlay
        mode="unlock"
        onSuccess={handleChangePinVerifySuccess}
        onDismiss={() => setPinSetupMode("idle")}
      />
    );
  }

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

      <section className="mb-8">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
          Security
        </h3>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <span className="text-sm text-foreground">PIN lock</span>
          <button
            type="button"
            data-testid="pin-toggle"
            onClick={handleToggle}
            className={[
              "relative w-12 h-6 rounded-full transition-colors",
              enabled ? "bg-foreground" : "bg-foreground/20",
            ].join(" ")}
            aria-label={enabled ? "Disable PIN lock" : "Enable PIN lock"}
          >
            <span
              className={[
                "absolute top-1 w-4 h-4 rounded-full bg-background transition-transform",
                enabled ? "translate-x-7" : "translate-x-1",
              ].join(" ")}
            />
          </button>
        </div>
        {pinHash && (
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-sm text-foreground">Change PIN</span>
            <button
              type="button"
              data-testid="pin-change-btn"
              onClick={() => setPinSetupMode("change-verify")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change
            </button>
          </div>
        )}
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
