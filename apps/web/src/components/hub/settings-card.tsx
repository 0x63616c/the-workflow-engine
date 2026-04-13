import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { PinPadOverlay } from "@/components/hub/pin-pad";
import { useAppConfig } from "@/hooks/use-app-config";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { FONT_OPTIONS, useFontStore } from "@/stores/font-store";
import { usePinStore } from "@/stores/pin-store";
import { useThemeStore } from "@/stores/theme-store";
import { Check, Clock, Eye, Lock, Moon, Palette, Server, Settings, Sun, Type } from "lucide-react";
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
            <span className="text-2xl text-muted-foreground">Settings</span>
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

/* ── Section wrapper with subtle card treatment ────────────────────── */

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon size={15} className="text-muted-foreground/60" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/* ── Segmented pill toggle for theme ───────────────────────────────── */

function ThemeSegmentedControl({
  activePaletteId,
  setActivePalette,
}: {
  activePaletteId: string;
  setActivePalette: (id: string) => void;
}) {
  const options = [
    { id: "midnight", label: "Dark", icon: Moon },
    { id: "daylight", label: "Light", icon: Sun },
  ] as const;

  return (
    <div className="flex rounded-lg bg-foreground/[0.06] p-1 gap-1">
      {options.map(({ id, label, icon: SegIcon }) => {
        const active = activePaletteId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActivePalette(id)}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <SegIcon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Font picker grid with preview ─────────────────────────────────── */

function FontPicker() {
  const activeFontId = useFontStore((s) => s.activeFontId);
  const setActiveFont = useFontStore((s) => s.setActiveFont);

  return (
    <div className="grid grid-cols-2 gap-2">
      {FONT_OPTIONS.map((font) => {
        const active = activeFontId === font.id;
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => setActiveFont(font.id)}
            className={[
              "relative flex flex-col items-start px-3 py-3 rounded-lg text-left transition-all duration-200",
              active
                ? "bg-foreground/10 ring-1 ring-foreground/20"
                : "bg-foreground/[0.03] hover:bg-foreground/[0.06]",
            ].join(" ")}
          >
            <span
              className="text-base text-foreground leading-tight truncate w-full"
              style={{ fontFamily: font.family }}
            >
              {font.name}
            </span>
            <span
              className="text-[11px] text-muted-foreground/50 mt-1 truncate w-full"
              style={{ fontFamily: font.family }}
            >
              Aa Bb Cc 0123
            </span>
            {active && (
              <div className="absolute top-2 right-2">
                <Check size={12} className="text-accent" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Setting row ───────────────────────────────────────────────────── */

function SettingRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between py-3",
        last ? "" : "border-b border-foreground/[0.06]",
      ].join(" ")}
    >
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

/* ── Toggle switch ─────────────────────────────────────────────────── */

function Toggle({
  enabled,
  onToggle,
  testId,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  testId?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onToggle}
      className={[
        "relative w-11 h-6 rounded-full transition-colors duration-200",
        enabled ? "bg-accent" : "bg-foreground/15",
      ].join(" ")}
      aria-label={label}
    >
      <span
        className={[
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

/* ── Status dot ────────────────────────────────────────────────────── */

function StatusDot({ status }: { status: "online" | "loading" | "error" }) {
  const colors = {
    online: "bg-emerald-400",
    loading: "bg-amber-400 animate-pulse",
    error: "bg-red-400",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

/* ── Main expanded view ────────────────────────────────────────────── */

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

  const apiStatus = pingQuery.isError ? "error" : pingQuery.isLoading ? "loading" : "online";
  const apiLabel = pingQuery.isError
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
        key="setup-enter"
        mode="setup-enter"
        onSuccess={handleSetupEnterSuccess}
        onDismiss={() => setPinSetupMode("idle")}
      />
    );
  }

  if (pinSetupMode === "setup-confirm") {
    return (
      <PinPadOverlay
        key="setup-confirm"
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
        key="change-verify"
        mode="unlock"
        onSuccess={handleChangePinVerifySuccess}
        onDismiss={() => setPinSetupMode("idle")}
      />
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <h2 className="text-2xl font-light text-foreground mb-8">Settings</h2>

      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        {/* ── Left column: Appearance ──────────────────────────── */}
        <div className="flex flex-col gap-6">
          <SettingsSection icon={Palette} title="Appearance">
            <ThemeSegmentedControl
              activePaletteId={activePaletteId}
              setActivePalette={setActivePalette}
            />
          </SettingsSection>

          <SettingsSection icon={Type} title="Font">
            <FontPicker />
          </SettingsSection>
        </div>

        {/* ── Right column: Display, Security, System ─────────── */}
        <div className="flex flex-col gap-6">
          <SettingsSection icon={Eye} title="Display">
            <SettingRow
              label="Idle timeout"
              value={
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground/40" />
                  {idleTimeout_S}s
                </span>
              }
            />
            <SettingRow
              label="Dim timeout"
              value={
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground/40" />
                  {dimTimeout_S}s
                </span>
              }
            />
            <SettingRow
              label="Dim brightness"
              value={
                <span className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/40 transition-all"
                      style={{ width: `${dimBrightnessPercent}%` }}
                    />
                  </div>
                  {dimBrightnessPercent}%
                </span>
              }
              last
            />
          </SettingsSection>

          <SettingsSection icon={Lock} title="Security">
            <SettingRow
              label="PIN lock"
              value={
                <Toggle
                  enabled={enabled}
                  onToggle={handleToggle}
                  testId="pin-toggle"
                  label={enabled ? "Disable PIN lock" : "Enable PIN lock"}
                />
              }
              last={!pinHash}
            />
            {pinHash && (
              <SettingRow
                label="Change PIN"
                value={
                  <button
                    type="button"
                    data-testid="pin-change-btn"
                    onClick={() => setPinSetupMode("change-verify")}
                    className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
                  >
                    Change
                  </button>
                }
                last
              />
            )}
          </SettingsSection>

          <SettingsSection icon={Server} title="System">
            <SettingRow
              label="API"
              value={
                <span className="flex items-center gap-2">
                  <StatusDot status={apiStatus} />
                  <span
                    className={
                      apiStatus === "error"
                        ? "text-destructive"
                        : apiStatus === "loading"
                          ? "text-muted-foreground"
                          : "text-emerald-400"
                    }
                  >
                    {apiLabel}
                  </span>
                </span>
              }
            />
            <SettingRow
              label="Build"
              value={
                <span className="font-mono text-xs bg-foreground/[0.06] px-2 py-0.5 rounded">
                  #{buildHash}
                </span>
              }
              last
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
