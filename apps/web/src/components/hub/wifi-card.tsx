import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useThemeStore } from "@/stores/theme-store";
import { Check, Copy, Eye, EyeOff, Wifi } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

const WIFI_SSID = import.meta.env.VITE_WIFI_SSID || "HomeNet";
const WIFI_PASSWORD = import.meta.env.VITE_WIFI_PASSWORD || "welcome2024";
const WIFI_ENCRYPTION = "WPA";
const PASSWORD_HIDE_DELAY_MS = 30_000;

function generateWifiUri(ssid: string, password: string, encryption: string): string {
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
}

export function WifiCard() {
  const config = getCardConfig("wifi");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const uri = generateWifiUri(WIFI_SSID, WIFI_PASSWORD, WIFI_ENCRYPTION);
    QRCode.toDataURL(uri, {
      width: 200,
      margin: 2,
      color: isDark
        ? { dark: "#ffffffFF", light: "#00000000" }
        : { dark: "#000000FF", light: "#ffffff00" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [isDark]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(WIFI_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const togglePassword = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !showPassword;
      setShowPassword(next);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (next) {
        hideTimerRef.current = setTimeout(() => setShowPassword(false), PASSWORD_HIDE_DELAY_MS);
      }
    },
    [showPassword],
  );

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <BentoCard
      testId="widget-card-wifi"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
    >
      <div className="flex flex-col h-full gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wifi size={16} className="text-card-green-accent" />
              <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-sm text-muted-foreground">WiFi</span>
          </div>
        </div>

        {/* SSID */}
        <div className="text-lg font-semibold text-foreground tracking-tight">{WIFI_SSID}</div>

        {/* QR Code - centered, takes available space */}
        <div className="flex-1 flex items-center justify-center">
          {qrDataUrl && (
            <div data-testid="qr-container" className="rounded-xl overflow-hidden">
              <img
                src={qrDataUrl}
                alt={`WiFi QR code for ${WIFI_SSID}`}
                className="w-28 h-28"
                draggable={false}
              />
            </div>
          )}
        </div>

        {/* Password + actions */}
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-mono text-muted-foreground truncate">
            {showPassword ? WIFI_PASSWORD : "\u2022".repeat(Math.min(WIFI_PASSWORD.length, 12))}
          </span>
          <button
            type="button"
            onClick={togglePassword}
            className="p-1.5 rounded-lg hover:bg-card-green-accent/10 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={14} className="text-muted-foreground" />
            ) : (
              <Eye size={14} className="text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-card-green-accent/10 transition-colors"
            aria-label={copied ? "Copied" : "Copy password"}
          >
            {copied ? (
              <Check size={14} className="text-emerald-500" />
            ) : (
              <Copy size={14} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </BentoCard>
  );
}
