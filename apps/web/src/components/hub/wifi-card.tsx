import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useThemeStore } from "@/stores/theme-store";
import { Check, Copy, Eye, EyeOff, Wifi } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

const WIFI_SSID = import.meta.env.VITE_WIFI_SSID || "HomeNet";
const WIFI_PASSWORD = import.meta.env.VITE_WIFI_PASSWORD || "welcome2024";
const WIFI_ENCRYPTION = "WPA";
const AUTO_FLIP_BACK_MS = 300_000;

function generateWifiUri(ssid: string, password: string, encryption: string): string {
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
}

export function WifiCard() {
  const config = getCardConfig("wifi");
  const [flipped, setFlipped] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [countdown, setCountdown] = useState(0);
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");

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

  useEffect(() => {
    if (flipped) {
      setCountdown(Math.ceil(AUTO_FLIP_BACK_MS / 1000));
      const tick = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setFlipped(false);
            setShowPassword(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(tick);
    }
    setCountdown(0);
  }, [flipped]);

  const handleFlip = () => {
    setFlipped(!flipped);
    if (flipped) setShowPassword(false);
  };

  return (
    <div
      data-testid="widget-card-wifi"
      className="[perspective:800px]"
      style={{
        ...(config?.gridColumn ? { gridColumn: config.gridColumn } : {}),
        ...(config?.gridRow ? { gridRow: config.gridRow } : {}),
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <BentoCard
            testId="widget-card-wifi-front"
            onClick={handleFlip}
            paletteColor={config?.colorScheme.color}
            className="h-full"
          >
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative">
                    <Wifi size={16} className="text-card-green-accent" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xl text-muted-foreground">WiFi</span>
                </div>
                <div className="text-4xl font-semibold text-foreground tracking-tight">
                  {WIFI_SSID}
                </div>
              </div>
              <div className="text-xl text-muted-foreground/40">tap to share</div>
            </div>
          </BentoCard>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <BentoCard
            testId="widget-card-wifi-back"
            onClick={handleFlip}
            paletteColor={config?.colorScheme.color}
            className="relative h-full overflow-hidden"
          >
            <div className="flex flex-col justify-between h-full">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi size={14} className="text-card-green-accent" />
                  <span className="text-sm font-medium text-foreground">{WIFI_SSID}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex items-center justify-center flex-1 py-2">
                {qrDataUrl && (
                  <div data-testid="qr-container" className="rounded-xl overflow-hidden">
                    <img
                      src={qrDataUrl}
                      alt={`WiFi QR code for ${WIFI_SSID}`}
                      className="w-32 h-32"
                      draggable={false}
                    />
                  </div>
                )}
              </div>

              {/* Password + actions */}
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-mono text-muted-foreground truncate">
                  {showPassword
                    ? WIFI_PASSWORD
                    : "\u2022".repeat(Math.min(WIFI_PASSWORD.length, 12))}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
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
            {countdown > 0 && (
              <span className="absolute bottom-2 right-3 font-mono text-xs tabular-nums text-muted-foreground/25">
                {countdown}
              </span>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
