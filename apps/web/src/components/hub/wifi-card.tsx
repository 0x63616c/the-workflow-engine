import { BentoCard } from "@/components/hub/bento-card";
import { Check, Copy, Eye, EyeOff, Wifi, X } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

const WIFI_SSID = "HomeNet";
const WIFI_PASSWORD = "welcome2024";
const WIFI_ENCRYPTION = "WPA";

function generateWifiUri(ssid: string, password: string, encryption: string): string {
  return `WIFI:T:${encryption};S:${ssid};P:${password};;`;
}

export function WifiCard() {
  const [expanded, setExpanded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uri = generateWifiUri(WIFI_SSID, WIFI_PASSWORD, WIFI_ENCRYPTION);
    QRCode.toString(uri, {
      type: "svg",
      width: 120,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrSvg);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(WIFI_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setShowPassword(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  if (expanded) {
    return (
      <div
        ref={cardRef}
        data-testid="widget-card-wifi-expanded"
        className="
          absolute z-50 inset-x-5 top-1/4
          rounded-2xl p-6
          bg-card backdrop-blur-md border border-border
          shadow-2xl
          animate-[scaleIn_200ms_ease-out]
        "
        style={{ gridArea: "wifi" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Wifi size={18} className="text-accent" />
            <span className="text-sm font-medium text-foreground">WiFi Details</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setShowPassword(false);
            }}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">
              Network
            </div>
            <div className="text-foreground font-medium">{WIFI_SSID}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">
              Password
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-mono text-sm">
                {showPassword ? WIFI_PASSWORD : "\u2022".repeat(WIFI_PASSWORD.length)}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={14} className="text-muted-foreground" />
                ) : (
                  <Eye size={14} className="text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="
              w-full py-2.5 rounded-xl text-sm font-medium
              bg-accent/15 text-accent hover:bg-accent/25
              transition-colors flex items-center justify-center gap-2
            "
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Password
              </>
            )}
          </button>

          <div className="flex justify-center pt-2">
            <div
              className="rounded-xl overflow-hidden bg-white p-2"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: QR SVG from trusted qrcode library
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <div className="text-center text-[10px] text-muted-foreground/40">Scan to connect</div>
        </div>
      </div>
    );
  }

  return (
    <BentoCard testId="widget-card-wifi" gridArea="wifi" onClick={() => setExpanded(true)}>
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
  );
}
