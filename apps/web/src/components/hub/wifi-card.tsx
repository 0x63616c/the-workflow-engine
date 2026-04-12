import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
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
  const [qrSvg, setQrSvg] = useState<string>("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const uri = generateWifiUri(WIFI_SSID, WIFI_PASSWORD, WIFI_ENCRYPTION);
    QRCode.toString(uri, {
      type: "svg",
      width: 80,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrSvg);
  }, []);

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
      className="[perspective:600px]"
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
          <BentoCard testId="widget-card-wifi-front" onClick={handleFlip} className="h-full">
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative">
                    <Wifi size={16} className="text-foreground" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">WiFi</span>
                </div>
                <div className="text-sm font-medium text-foreground">{WIFI_SSID}</div>
              </div>
              <div className="text-[10px] text-muted-foreground/40 mt-2">tap to share</div>
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
            className="relative h-full overflow-hidden"
          >
            <div className="flex flex-col justify-between h-full">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Wifi size={12} className="text-accent" />
                  <span className="text-xs font-medium text-foreground">{WIFI_SSID}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {showPassword ? WIFI_PASSWORD : "\u2022".repeat(WIFI_PASSWORD.length)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={10} className="text-muted-foreground" />
                    ) : (
                      <Eye size={10} className="text-muted-foreground" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="
                    w-full py-1.5 rounded-lg text-[11px] font-medium
                    bg-accent/15 text-accent hover:bg-accent/25
                    transition-colors flex items-center justify-center gap-1
                  "
                >
                  {copied ? (
                    <>
                      <Check size={10} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  className="rounded-md overflow-hidden bg-white p-1"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: QR SVG from trusted qrcode library
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
            </div>
            {countdown > 0 && (
              <span className="absolute bottom-2 right-3 font-mono text-[10px] tabular-nums text-muted-foreground/25">
                {countdown}
              </span>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
