import { PinPadOverlay } from "@/components/hub/pin-pad";
import { PIN_LENGTH, usePinStore } from "@/stores/pin-store";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/haptics", () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Medium: "MEDIUM" },
  NotificationType: { Error: "ERROR" },
}));

// Stable controls object — must not change identity across renders or handleWrongPin/handleSubmit
// would change identity, causing the auto-submit useEffect to re-fire spuriously.
const { stableControls } = vi.hoisted(() => ({
  stableControls: { start: vi.fn().mockResolvedValue(undefined), set: vi.fn() },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimationControls: () => stableControls,
}));

const mockOnSuccess = vi.fn();
const mockOnDismiss = vi.fn();

const TEST_PIN = "123456";
const WRONG_PIN = "987654";

function clickPin(pin: string) {
  for (const digit of pin) {
    fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
  }
}

function renderOverlay(mode: "unlock" | "setup-enter" | "setup-confirm" = "unlock") {
  return render(<PinPadOverlay mode={mode} onSuccess={mockOnSuccess} onDismiss={mockOnDismiss} />);
}

beforeEach(() => {
  mockOnSuccess.mockClear();
  mockOnDismiss.mockClear();
  stableControls.start.mockClear();
  usePinStore.setState({ pinHash: null, enabled: false, isUnlocked: false });
  try {
    globalThis.localStorage?.removeItem("pin-hash");
    globalThis.localStorage?.removeItem("pin-enabled");
  } catch {
    // ignore
  }
});

afterEach(cleanup);

describe("PinPadOverlay: dot indicators", () => {
  it("renders PIN_LENGTH dot indicators initially all empty", () => {
    renderOverlay();
    const dots = screen.getAllByTestId("pin-dot");
    expect(dots).toHaveLength(PIN_LENGTH);
    for (const dot of dots) {
      expect(dot).toHaveAttribute("data-filled", "false");
    }
  });

  it("fills a dot when a digit is pressed", async () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("pin-btn-1"));
    await waitFor(() => {
      const dots = screen.getAllByTestId("pin-dot");
      expect(dots[0]).toHaveAttribute("data-filled", "true");
      expect(dots[1]).toHaveAttribute("data-filled", "false");
    });
  });

  it("fills all dots after PIN_LENGTH digit presses and calls onSuccess", async () => {
    renderOverlay("setup-confirm");
    clickPin(TEST_PIN);
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(TEST_PIN);
    });
  });
});

describe("PinPadOverlay: digit buttons", () => {
  it("renders buttons for digits 0-9", () => {
    renderOverlay();
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByTestId(`pin-btn-${i}`)).toBeDefined();
    }
  });

  it("renders backspace button", () => {
    renderOverlay();
    expect(screen.getByTestId("pin-btn-backspace")).toBeDefined();
  });

  it("backspace clears the last digit", async () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("pin-btn-1"));
    fireEvent.click(screen.getByTestId("pin-btn-2"));
    fireEvent.click(screen.getByTestId("pin-btn-backspace"));
    await waitFor(() => {
      const dots = screen.getAllByTestId("pin-dot");
      expect(dots[0]).toHaveAttribute("data-filled", "true");
      expect(dots[1]).toHaveAttribute("data-filled", "false");
    });
  });

  it("backspace does nothing when no digits entered", async () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("pin-btn-backspace"));
    await waitFor(() => {
      const dots = screen.getAllByTestId("pin-dot");
      for (const dot of dots) {
        expect(dot).toHaveAttribute("data-filled", "false");
      }
    });
  });
});

describe("PinPadOverlay: auto-submit on PIN_LENGTH digits", () => {
  it("calls onSuccess when correct PIN entered (unlock mode)", async () => {
    usePinStore.getState().setPin(TEST_PIN);
    renderOverlay("unlock");
    clickPin(TEST_PIN);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("shakes and clears on wrong PIN — does not call onSuccess", async () => {
    usePinStore.getState().setPin(TEST_PIN);
    renderOverlay("unlock");
    clickPin(WRONG_PIN);

    await waitFor(() => {
      expect(stableControls.start).toHaveBeenCalled();
    });

    await waitFor(() => {
      const dots = screen.getAllByTestId("pin-dot");
      const filledCount = dots.filter((d) => d.getAttribute("data-filled") === "true").length;
      expect(filledCount).toBe(0);
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("does not accept more than PIN_LENGTH digits", async () => {
    renderOverlay("setup-confirm");
    clickPin(TEST_PIN);
    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalled());
    mockOnSuccess.mockClear();
    fireEvent.click(screen.getByTestId("pin-btn-5"));
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});

describe("PinPadOverlay: cancel / dismiss", () => {
  it("renders a dismiss button", () => {
    renderOverlay();
    expect(screen.getByTestId("pin-btn-dismiss")).toBeDefined();
  });

  it("calls onDismiss when dismiss button pressed", () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("pin-btn-dismiss"));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("PinPadOverlay: setup mode", () => {
  it("in setup-enter mode, calls onSuccess with the PIN without saving hash", async () => {
    renderOverlay("setup-enter");
    clickPin("567890");

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
    expect(mockOnSuccess).toHaveBeenCalledWith("567890");
    expect(usePinStore.getState().pinHash).toBeNull();
  });
});
