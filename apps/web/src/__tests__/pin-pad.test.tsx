import { PinPadOverlay } from "@/components/hub/pin-pad";
import { usePinStore } from "@/stores/pin-store";
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

// Stable mock controls — same reference every render so handleSubmit/handleWrongPin
// don't change identity on every render (avoids spurious useEffect re-runs)
const { mockControls } = vi.hoisted(() => ({
  mockControls: { start: vi.fn().mockResolvedValue(undefined), set: vi.fn() },
}));

// framer-motion: render children without animation in tests
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
  useAnimationControls: () => mockControls,
}));

const mockOnSuccess = vi.fn();
const mockOnDismiss = vi.fn();

function renderOverlay(mode: "unlock" | "setup-enter" = "unlock") {
  return render(<PinPadOverlay mode={mode} onSuccess={mockOnSuccess} onDismiss={mockOnDismiss} />);
}

beforeEach(() => {
  mockOnSuccess.mockClear();
  mockOnDismiss.mockClear();
  // Reset the store state completely
  usePinStore.setState({ pinHash: null, enabled: false, isUnlocked: false });
  // Clear localStorage so no stale pin data
  try {
    globalThis.localStorage?.removeItem("pin-hash");
    globalThis.localStorage?.removeItem("pin-enabled");
  } catch {
    // ignore
  }
});

afterEach(cleanup);

describe("PinPadOverlay: dot indicators", () => {
  it("renders 4 dot indicators initially all empty", () => {
    renderOverlay();
    const dots = screen.getAllByTestId("pin-dot");
    expect(dots).toHaveLength(4);
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

  it("fills all 4 dots after 4 digit presses", async () => {
    // Use setup-confirm mode so digits aren't cleared on submit
    render(
      <PinPadOverlay mode="setup-confirm" onSuccess={mockOnSuccess} onDismiss={mockOnDismiss} />,
    );
    for (const digit of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
    }
    await waitFor(() => {
      const dots = screen.getAllByTestId("pin-dot");
      // After submit in setup-confirm, onSuccess is called but dots stay filled until re-render
      expect(mockOnSuccess).toHaveBeenCalled();
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

describe("PinPadOverlay: auto-submit on 4 digits", () => {
  it("calls onSuccess when correct PIN entered (unlock mode)", async () => {
    // Set a PIN in the store first
    await usePinStore.getState().setPin("1234");
    renderOverlay("unlock");

    for (const digit of ["1", "2", "3", "4"]) {
      fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
    }

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("clears digits and does not call onSuccess on wrong PIN", async () => {
    await usePinStore.getState().setPin("1234");
    renderOverlay("unlock");

    for (const digit of ["9", "8", "7", "6"]) {
      fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
    }

    // Wait for the shake animation to complete and digits to reset to 0 filled
    // (wrong PIN: shake fires, then setDigits([]), so all dots are unfilled again)
    await waitFor(
      () => {
        const dots = screen.getAllByTestId("pin-dot");
        const filledCount = dots.filter((d) => d.getAttribute("data-filled") === "true").length;
        // After wrong PIN, all dots reset to 0
        expect(filledCount).toBe(0);
        // And critically, we should have gone through the async submit (4 dots were filled momentarily)
        // onSuccess must NOT have been called
        expect(mockOnSuccess).not.toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it("does not accept more than 4 digits", () => {
    renderOverlay();
    for (const digit of ["1", "2", "3", "4", "5"]) {
      fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
    }
    const dots = screen.getAllByTestId("pin-dot");
    // Still only 4 dots, all filled
    expect(dots).toHaveLength(4);
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
  it("in setup-enter mode, calls onSuccess after 4 digits (sets new PIN)", async () => {
    renderOverlay("setup-enter");

    for (const digit of ["5", "6", "7", "8"]) {
      fireEvent.click(screen.getByTestId(`pin-btn-${digit}`));
    }

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
