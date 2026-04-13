import { usePinStore } from "@/stores/pin-store";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Delete, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type PinPadMode = "unlock" | "setup-enter" | "setup-confirm";

interface PinPadOverlayProps {
  mode: PinPadMode;
  onSuccess: (pin?: string) => void;
  onDismiss: () => void;
}

const DIGIT_BUTTONS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const;

const DOT_IDS = ["d0", "d1", "d2", "d3"] as const;

const MODE_TITLES: Record<PinPadMode, string> = {
  unlock: "Enter PIN",
  "setup-enter": "Create PIN",
  "setup-confirm": "Confirm PIN",
};

function PinDots({ count }: { count: number }) {
  return (
    <div className="flex gap-4 justify-center mb-10">
      {DOT_IDS.map((id, i) => (
        <div
          key={id}
          data-testid="pin-dot"
          data-filled={i < count ? "true" : "false"}
          className={[
            "rounded-full transition-all duration-150",
            "w-5 h-5",
            i < count ? "bg-foreground scale-110" : "border-2 border-foreground/40 bg-transparent",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function PinPadOverlay({ mode, onSuccess, onDismiss }: PinPadOverlayProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const controls = useAnimationControls();
  const { verifyPin, unlock } = usePinStore();
  const submittingRef = useRef(false);

  const handleWrongPin = useCallback(async () => {
    await Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    await controls.start({
      x: [0, -12, 12, -10, 10, -6, 6, 0],
      transition: { duration: 0.35, ease: "easeInOut" },
    });
    setDigits([]);
    submittingRef.current = false;
  }, [controls]);

  const handleSubmit = useCallback(
    async (pin: string) => {
      if (mode === "unlock") {
        const ok = await verifyPin(pin);
        if (ok) {
          unlock();
          onSuccess();
        } else {
          await handleWrongPin();
        }
      } else if (mode === "setup-enter" || mode === "setup-confirm") {
        onSuccess(pin);
      }
      submittingRef.current = false;
    },
    [mode, verifyPin, unlock, onSuccess, handleWrongPin],
  );

  // Auto-submit when 4 digits accumulated — effect decouples state update from submission
  // so fireEvent.click batching in tests works correctly
  useEffect(() => {
    if (digits.length === 4 && !submittingRef.current) {
      submittingRef.current = true;
      handleSubmit(digits.join(""));
    }
  }, [digits, handleSubmit]);

  const handleDigit = useCallback((digit: string) => {
    setDigits((prev) => {
      if (prev.length >= 4) return prev;
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      return [...prev, digit];
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setDigits((prev) => {
      if (prev.length === 0) return prev;
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      return prev.slice(0, -1);
    });
  }, []);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-background">
      <button
        type="button"
        data-testid="pin-btn-dismiss"
        onClick={onDismiss}
        className="absolute top-6 right-6 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
        aria-label="Cancel"
      >
        <X className="w-6 h-6 text-foreground/60" />
      </button>

      <h2 className="text-lg font-light text-foreground/70 mb-8">{MODE_TITLES[mode]}</h2>

      <AnimatePresence mode="wait">
        <motion.div key="pin-dots" animate={controls} className="flex flex-col items-center">
          <PinDots count={digits.length} />
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col gap-3">
        {DIGIT_BUTTONS.map((row, rowIdx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: row index is stable (0-2), not reordered
          <div key={rowIdx} className="flex gap-3">
            {row.map((digit) => (
              <button
                key={digit}
                type="button"
                data-testid={`pin-btn-${digit}`}
                onClick={() => handleDigit(digit)}
                className="w-24 h-24 rounded-full text-3xl font-light text-foreground bg-foreground/8 hover:bg-foreground/15 active:bg-foreground/25 transition-colors flex items-center justify-center select-none"
              >
                {digit}
              </button>
            ))}
          </div>
        ))}

        <div className="flex gap-3">
          <button
            type="button"
            data-testid="pin-btn-backspace"
            onClick={handleBackspace}
            className="w-24 h-24 rounded-full text-foreground/60 bg-transparent hover:bg-foreground/8 transition-colors flex items-center justify-center select-none"
            aria-label="Backspace"
          >
            <Delete className="w-7 h-7" />
          </button>
          <button
            type="button"
            data-testid="pin-btn-0"
            onClick={() => handleDigit("0")}
            className="w-24 h-24 rounded-full text-3xl font-light text-foreground bg-foreground/8 hover:bg-foreground/15 active:bg-foreground/25 transition-colors flex items-center justify-center select-none"
          >
            0
          </button>
          <div className="w-24 h-24" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
