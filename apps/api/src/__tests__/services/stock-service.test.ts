import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("yahoo-finance2");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import YahooFinance from "yahoo-finance2";
import { getCryptoQuotes, getStockQuotes } from "../../services/stock-service";

const mockQuoteFn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(YahooFinance).mockImplementation(() => ({ quote: mockQuoteFn }) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getStockQuotes()", () => {
  it("returns formatted quotes for all tickers", async () => {
    mockQuoteFn.mockImplementation(async (symbol: string) => ({
      symbol,
      regularMarketPrice: 12.34,
      regularMarketChange: 0.56,
      regularMarketChangePercent: 4.75,
      shortName: symbol === "SOFI" ? "SoFi Technologies" : symbol,
    }));

    const result = await getStockQuotes();

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      symbol: "SOFI",
      name: "SoFi Technologies",
      price: 12.34,
      change: 0.56,
      changePercent: 4.75,
    });
  });

  it("handles yahoo-finance2 errors gracefully per ticker", async () => {
    mockQuoteFn
      .mockResolvedValueOnce({
        symbol: "SOFI",
        regularMarketPrice: 12.34,
        regularMarketChange: 0.56,
        regularMarketChangePercent: 4.75,
        shortName: "SoFi Technologies",
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        symbol: "NVDA",
        regularMarketPrice: 850.0,
        regularMarketChange: -12.5,
        regularMarketChangePercent: -1.45,
        shortName: "NVIDIA Corporation",
      });

    const result = await getStockQuotes();

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe("SOFI");
    expect(result[1].symbol).toBe("NVDA");
  });
});

describe("getCryptoQuotes()", () => {
  it("returns formatted crypto quotes from CoinGecko", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          bitcoin: {
            usd: 67500.0,
            usd_24h_change: 2.35,
          },
          ethereum: {
            usd: 3450.0,
            usd_24h_change: -1.2,
          },
          dogecoin: {
            usd: 0.165,
            usd_24h_change: 5.67,
          },
        }),
    });

    const result = await getCryptoQuotes();

    expect(result).toEqual([
      { symbol: "BTC", name: "Bitcoin", price: 67500.0, changePercent: 2.35 },
      { symbol: "ETH", name: "Ethereum", price: 3450.0, changePercent: -1.2 },
      { symbol: "DOGE", name: "Dogecoin", price: 0.165, changePercent: 5.67 },
    ]);
  });

  it("throws on CoinGecko API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });

    await expect(getCryptoQuotes()).rejects.toThrow("CoinGecko API error: 429");
  });
});
