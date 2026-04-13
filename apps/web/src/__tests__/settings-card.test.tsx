import { SettingsCard, SettingsCardExpanded } from "@/components/hub/settings-card";
import { useAppConfig } from "@/hooks/use-app-config";
import { trpc } from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-app-config");
vi.mock("@/lib/trpc", () => ({
  trpc: {
    health: {
      ping: { useQuery: vi.fn() },
      buildHash: { useQuery: vi.fn() },
    },
    devices: {
      lights: { useQuery: vi.fn() },
    },
  },
}));
vi.mock("@/stores/card-expansion-store", () => ({
  useCardExpansionStore: vi.fn((selector) =>
    selector({ expandCard: vi.fn(), expandedCardId: null }),
  ),
}));
const mockSetActivePalette = vi.fn();
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector) =>
    selector({ activePaletteId: "midnight", setActivePalette: mockSetActivePalette }),
  ),
}));

const mockUseAppConfig = vi.mocked(useAppConfig);

function setupAppConfig({
  idleTimeout = 45000,
  isLoading = false,
}: { idleTimeout?: number; isLoading?: boolean } = {}) {
  const setFn = vi.fn();
  mockUseAppConfig.mockReturnValue({
    get: (key: string) => {
      if (key === "display.idleTimeout_MS") return idleTimeout;
      return null;
    },
    set: setFn,
    isLoading,
  });
  return setFn;
}

describe("SettingsCard", () => {
  it("renders the gear icon and Settings label", () => {
    setupAppConfig();
    render(<SettingsCard />);
    expect(screen.getByTestId("widget-card-settings")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });
});

describe("SettingsCardExpanded", () => {
  it("renders Appearance section with Dark and Light buttons", () => {
    setupAppConfig();
    vi.mocked(trpc.health.ping.useQuery).mockReturnValue({
      data: { status: "ok", timestamp: Date.now() },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(trpc.health.buildHash.useQuery).mockReturnValue({
      data: { hash: "abc123", deployedAt: "2026-04-12" },
      isLoading: false,
    } as never);
    vi.mocked(trpc.devices.lights.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);

    render(<SettingsCardExpanded />);
    expect(screen.getByText("Appearance")).toBeDefined();
    expect(screen.getByRole("button", { name: /dark/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /light/i })).toBeDefined();
  });

  it("calls setActivePalette when theme button is clicked", () => {
    setupAppConfig();
    vi.mocked(trpc.health.ping.useQuery).mockReturnValue({
      data: { status: "ok", timestamp: Date.now() },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(trpc.health.buildHash.useQuery).mockReturnValue({
      data: { hash: "abc123", deployedAt: "2026-04-12" },
      isLoading: false,
    } as never);
    vi.mocked(trpc.devices.lights.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);

    render(<SettingsCardExpanded />);
    fireEvent.click(screen.getByRole("button", { name: /light/i }));
    expect(mockSetActivePalette).toHaveBeenCalledWith("daylight");
  });

  it("renders Display section with idle timeout", () => {
    setupAppConfig({ idleTimeout: 45000 });
    vi.mocked(trpc.health.ping.useQuery).mockReturnValue({
      data: { status: "ok", timestamp: Date.now() },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(trpc.health.buildHash.useQuery).mockReturnValue({
      data: { hash: "abc123", deployedAt: "2026-04-12" },
      isLoading: false,
    } as never);
    vi.mocked(trpc.devices.lights.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);

    render(<SettingsCardExpanded />);
    expect(screen.getByText("Display")).toBeDefined();
    expect(screen.getByText(/idle timeout/i)).toBeDefined();
  });

  it("renders System section with build hash", () => {
    setupAppConfig();
    vi.mocked(trpc.health.ping.useQuery).mockReturnValue({
      data: { status: "ok", timestamp: Date.now() },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(trpc.health.buildHash.useQuery).mockReturnValue({
      data: { hash: "abc1234", deployedAt: "2026-04-12" },
      isLoading: false,
    } as never);
    vi.mocked(trpc.devices.lights.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);

    render(<SettingsCardExpanded />);
    expect(screen.getByText("System")).toBeDefined();
    expect(screen.getByText(/abc1234/)).toBeDefined();
  });

  it("renders System section with API status", () => {
    setupAppConfig();
    vi.mocked(trpc.health.ping.useQuery).mockReturnValue({
      data: { status: "ok", timestamp: Date.now() },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(trpc.health.buildHash.useQuery).mockReturnValue({
      data: { hash: "abc123", deployedAt: "2026-04-12" },
      isLoading: false,
    } as never);
    vi.mocked(trpc.devices.lights.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);

    render(<SettingsCardExpanded />);
    expect(screen.getByText(/api/i)).toBeDefined();
  });
});
