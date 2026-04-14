import { StockTickerCard } from "@/components/hub/stock-ticker-card";
import * as useStocksModule from "@/hooks/use-stocks";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-stocks");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseStocks = vi.mocked(useStocksModule.useStocks);

function setupHook(overrides = {}) {
  mockUseStocks.mockReturnValue({
    stocks: [
      {
        symbol: "SOFI",
        name: "SoFi Technologies",
        price: 12.34,
        change: 0.56,
        changePercent: 4.75,
      },
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 198.5,
        change: -2.3,
        changePercent: -1.15,
      },
      {
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        price: 850.0,
        change: 15.0,
        changePercent: 1.8,
      },
    ],
    crypto: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: 67500.0,
        changePercent: 2.35,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: 3450.0,
        changePercent: -1.2,
      },
      {
        symbol: "DOGE",
        name: "Dogecoin",
        price: 0.165,
        changePercent: 5.67,
      },
    ],
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  setupHook();
});

describe("StockTickerCard", () => {
  it("renders SOFI ticker prominently", () => {
    render(<StockTickerCard />);
    expect(screen.getByText("SOFI")).toBeInTheDocument();
    expect(screen.getByText("$12.34")).toBeInTheDocument();
  });

  it("renders all stock tickers", () => {
    render(<StockTickerCard />);
    expect(screen.getByText("SOFI")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("NVDA")).toBeInTheDocument();
  });

  it("renders crypto tickers", () => {
    render(<StockTickerCard />);
    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getByText("DOGE")).toBeInTheDocument();
  });

  it("shows positive change in green", () => {
    render(<StockTickerCard />);
    const sofiChange = screen.getByText("+4.75%");
    expect(sofiChange.className).toContain("text-green");
  });

  it("shows negative change in red", () => {
    render(<StockTickerCard />);
    const aaplChange = screen.getByText("-1.15%");
    expect(aaplChange.className).toContain("text-red");
  });

  it("shows loading state", () => {
    setupHook({ isLoading: true, stocks: [], crypto: [] });
    render(<StockTickerCard />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("shows error state", () => {
    setupHook({ isError: true, isLoading: false, stocks: [], crypto: [] });
    render(<StockTickerCard />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
