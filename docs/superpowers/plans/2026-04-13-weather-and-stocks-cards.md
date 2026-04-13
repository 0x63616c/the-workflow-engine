# Weather & Stock Ticker Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new bento grid cards to the wall panel: a Weather card (current conditions, high/low, UV) and a Stock Ticker card (SOFI, AAPL, NVDA, BTC, ETH, DOGE with price + daily % change).

**Architecture:** Backend services fetch from Open-Meteo (weather) and yahoo-finance2 + CoinGecko (stocks/crypto). New tRPC routers expose the data. Frontend hooks poll via TanStack Query. New card components render compact views in the bento grid with expanded overlay views for more detail.

**Tech Stack:** Open-Meteo API (free, no key), yahoo-finance2 (npm), CoinGecko free API, tRPC, TanStack Query, Tailwind CSS, lucide-react icons, Vitest.

---

## File Map

### Backend (apps/api)

| File | Action | Purpose |
|------|--------|---------|
| `src/services/weather-service.ts` | Create | Fetch current weather from Open-Meteo |
| `src/services/stock-service.ts` | Create | Fetch stock/crypto quotes from yahoo-finance2 + CoinGecko |
| `src/trpc/routers/weather.ts` | Create | tRPC router exposing weather data |
| `src/trpc/routers/stocks.ts` | Create | tRPC router exposing stock/crypto data |
| `src/trpc/routers/index.ts` | Modify | Add weather + stocks routers to appRouter |
| `src/__tests__/services/weather-service.test.ts` | Create | Weather service tests |
| `src/__tests__/services/stock-service.test.ts` | Create | Stock service tests |

### Frontend (apps/web)

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/use-weather.ts` | Create | Hook wrapping weather tRPC query |
| `src/hooks/use-stocks.ts` | Create | Hook wrapping stocks tRPC query |
| `src/components/hub/weather-card.tsx` | Create | Compact weather bento card |
| `src/components/hub/expanded-weather.tsx` | Create | Expanded weather overlay view |
| `src/components/hub/stock-ticker-card.tsx` | Create | Compact stock ticker bento card |
| `src/components/hub/expanded-stocks.tsx` | Create | Expanded stocks overlay view |
| `src/components/hub/register-cards.ts` | Modify | Register weather + stocks cards |
| `src/components/hub/card-overlay.tsx` | Modify | Add expanded views to EXPANDED_VIEWS map |
| `src/__tests__/weather-card.test.tsx` | Create | Weather card component tests |
| `src/__tests__/stock-ticker-card.test.tsx` | Create | Stock ticker card component tests |

### Grid Layout

Current grid (6 cols x 4 rows):

```
 Col:  1       2       3       4       5       6
Row 1: [  Clock (3x2)        ] [4:1  ] [ Countdown (2x1) ]
Row 2: [  Clock              ] [Music] [   WiFi (2x2)    ]
Row 3: [Lights] [ Fan  ] [Clim ] [4:3  ] [   WiFi         ]
Row 4: [ 1:4  ] [ 2:4  ] [ 3:4 ] [Sett ] [ 5:4  ] [ 6:4  ]
```

New card placements:
- **Weather**: `4 / 5`, `1 / 2` (col 4, row 1) - 1x1, top row next to clock
- **Stocks**: `1 / 4`, `4 / 5` (cols 1-3, row 4) - 3x1 wide strip, bottom left

Updated grid:

```
 Col:  1       2       3       4       5       6
Row 1: [  Clock (3x2)        ] [Weath] [ Countdown (2x1) ]
Row 2: [  Clock              ] [Music] [   WiFi (2x2)    ]
Row 3: [Lights] [ Fan  ] [Clim ] [4:3  ] [   WiFi         ]
Row 4: [    Stocks (3x1)     ] [Sett ] [ 5:4  ] [ 6:4  ]
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install yahoo-finance2 in the API workspace**

```bash
cd apps/api && bun add yahoo-finance2
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/api && bun run -e "const yf = require('yahoo-finance2').default; console.log('yahoo-finance2 loaded')"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json bun.lockb
git commit -m "chore: add yahoo-finance2 dependency for stock ticker"
```

---

## Task 2: Weather Service (Backend)

**Files:**
- Create: `apps/api/src/services/weather-service.ts`
- Create: `apps/api/src/__tests__/services/weather-service.test.ts`

- [ ] **Step 1: Write failing test for getCurrentWeather**

```typescript
// apps/api/src/__tests__/services/weather-service.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getCurrentWeather } from "../../services/weather-service";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOCK_OPEN_METEO_RESPONSE = {
  current: {
    temperature_2m: 22.5,
    weather_code: 1,
    uv_index: 6.2,
  },
  daily: {
    temperature_2m_max: [26.0],
    temperature_2m_min: [18.0],
  },
};

describe("getCurrentWeather()", () => {
  it("returns formatted weather data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
    });

    const result = await getCurrentWeather();

    expect(result).toEqual({
      temperature: 22.5,
      condition: "Mainly clear",
      conditionCode: 1,
      highTemp: 26.0,
      lowTemp: 18.0,
      uvIndex: 6.2,
    });
  });

  it("calls Open-Meteo with correct parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
    });

    await getCurrentWeather();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("api.open-meteo.com");
    expect(url).toContain("current=temperature_2m,weather_code,uv_index");
    expect(url).toContain("daily=temperature_2m_max,temperature_2m_min");
    expect(url).toContain("temperature_unit=fahrenheit");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(getCurrentWeather()).rejects.toThrow("Weather API error: 500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && bunx vitest run src/__tests__/services/weather-service.test.ts
```

Expected: FAIL with "Cannot find module" or similar.

- [ ] **Step 3: Implement weather service**

```typescript
// apps/api/src/services/weather-service.ts

// TODO: Update coordinates to Calum's actual home location
const LATITUDE = 28.0836;
const LONGITUDE = -80.6081;

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export interface WeatherData {
  temperature: number;
  condition: string;
  conditionCode: number;
  highTemp: number;
  lowTemp: number;
  uvIndex: number;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
    uv_index: number;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function getCurrentWeather(): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(LATITUDE),
    longitude: String(LONGITUDE),
    current: "temperature_2m,weather_code,uv_index",
    daily: "temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_days: "1",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  return {
    temperature: data.current.temperature_2m,
    condition: WEATHER_CODES[data.current.weather_code] ?? "Unknown",
    conditionCode: data.current.weather_code,
    highTemp: data.daily.temperature_2m_max[0],
    lowTemp: data.daily.temperature_2m_min[0],
    uvIndex: data.current.uv_index,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && bunx vitest run src/__tests__/services/weather-service.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/weather-service.ts apps/api/src/__tests__/services/weather-service.test.ts
git commit -m "feat: add weather service with Open-Meteo integration"
```

---

## Task 3: Stock Service (Backend)

**Files:**
- Create: `apps/api/src/services/stock-service.ts`
- Create: `apps/api/src/__tests__/services/stock-service.test.ts`

- [ ] **Step 1: Write failing test for getStockQuotes and getCryptoQuotes**

```typescript
// apps/api/src/__tests__/services/stock-service.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("yahoo-finance2", () => ({
  default: {
    quote: vi.fn(),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import yahooFinance from "yahoo-finance2";
import { getCryptoQuotes, getStockQuotes } from "../../services/stock-service";

const mockYahooQuote = vi.mocked(yahooFinance.quote);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getStockQuotes()", () => {
  it("returns formatted quotes for all tickers", async () => {
    mockYahooQuote.mockImplementation(async (symbol: string) => ({
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
    mockYahooQuote
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && bunx vitest run src/__tests__/services/stock-service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement stock service**

```typescript
// apps/api/src/services/stock-service.ts
import yahooFinance from "yahoo-finance2";

const STOCK_SYMBOLS = ["SOFI", "AAPL", "NVDA"] as const;

const CRYPTO_IDS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
] as const;

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

export async function getStockQuotes(): Promise<StockQuote[]> {
  const results: StockQuote[] = [];

  for (const symbol of STOCK_SYMBOLS) {
    try {
      const quote = await yahooFinance.quote(symbol);
      results.push({
        symbol: quote.symbol ?? symbol,
        name: quote.shortName ?? symbol,
        price: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
      });
    } catch {
      // Skip failed tickers, return what we can
    }
  }

  return results;
}

type CoinGeckoResponse = Record<
  string,
  { usd: number; usd_24h_change: number }
>;

export async function getCryptoQuotes(): Promise<CryptoQuote[]> {
  const ids = CRYPTO_IDS.map((c) => c.id).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data: CoinGeckoResponse = await response.json();

  return CRYPTO_IDS.map((coin) => ({
    symbol: coin.symbol,
    name: coin.name,
    price: data[coin.id]?.usd ?? 0,
    changePercent: data[coin.id]?.usd_24h_change ?? 0,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && bunx vitest run src/__tests__/services/stock-service.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/stock-service.ts apps/api/src/__tests__/services/stock-service.test.ts
git commit -m "feat: add stock and crypto service with yahoo-finance2 and CoinGecko"
```

---

## Task 4: Weather tRPC Router

**Files:**
- Create: `apps/api/src/trpc/routers/weather.ts`
- Modify: `apps/api/src/trpc/routers/index.ts`

- [ ] **Step 1: Create weather router**

```typescript
// apps/api/src/trpc/routers/weather.ts
import { getCurrentWeather } from "../../services/weather-service";
import { publicProcedure, router } from "../init";

export const weatherRouter = router({
  current: publicProcedure.query(() => getCurrentWeather()),
});
```

- [ ] **Step 2: Add weather router to appRouter**

Modify `apps/api/src/trpc/routers/index.ts`:

```typescript
import { router } from "../init";
import { appConfigRouter } from "./app-config";
import { countdownEventsRouter } from "./countdown-events";
import { devicesRouter } from "./devices";
import { healthRouter } from "./health";
import { weatherRouter } from "./weather";

export const appRouter = router({
  health: healthRouter,
  countdownEvents: countdownEventsRouter,
  devices: devicesRouter,
  appConfig: appConfigRouter,
  weather: weatherRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Verify API typechecks**

```bash
cd apps/api && bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/trpc/routers/weather.ts apps/api/src/trpc/routers/index.ts
git commit -m "feat: add weather tRPC router"
```

---

## Task 5: Stocks tRPC Router

**Files:**
- Create: `apps/api/src/trpc/routers/stocks.ts`
- Modify: `apps/api/src/trpc/routers/index.ts`

- [ ] **Step 1: Create stocks router**

```typescript
// apps/api/src/trpc/routers/stocks.ts
import { getCryptoQuotes, getStockQuotes } from "../../services/stock-service";
import { publicProcedure, router } from "../init";

export const stocksRouter = router({
  quotes: publicProcedure.query(async () => {
    const [stocks, crypto] = await Promise.all([
      getStockQuotes(),
      getCryptoQuotes(),
    ]);
    return { stocks, crypto };
  }),
});
```

- [ ] **Step 2: Add stocks router to appRouter**

Modify `apps/api/src/trpc/routers/index.ts` to add:

```typescript
import { stocksRouter } from "./stocks";
```

And add to the router object:

```typescript
stocks: stocksRouter,
```

- [ ] **Step 3: Verify API typechecks**

```bash
cd apps/api && bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/trpc/routers/stocks.ts apps/api/src/trpc/routers/index.ts
git commit -m "feat: add stocks tRPC router"
```

---

## Task 6: Weather Frontend Hook

**Files:**
- Create: `apps/web/src/hooks/use-weather.ts`

- [ ] **Step 1: Create use-weather hook**

```typescript
// apps/web/src/hooks/use-weather.ts
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 900_000; // 15 minutes

export function useWeather() {
  const weather = trpc.weather.current.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: 2,
  });

  return {
    temperature: weather.data?.temperature ?? null,
    condition: weather.data?.condition ?? null,
    conditionCode: weather.data?.conditionCode ?? null,
    highTemp: weather.data?.highTemp ?? null,
    lowTemp: weather.data?.lowTemp ?? null,
    uvIndex: weather.data?.uvIndex ?? null,
    isLoading: weather.isLoading,
    isError: weather.isError,
  };
}
```

- [ ] **Step 2: Verify web typechecks**

```bash
cd apps/web && bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-weather.ts
git commit -m "feat: add useWeather hook with 15-min polling"
```

---

## Task 7: Stocks Frontend Hook

**Files:**
- Create: `apps/web/src/hooks/use-stocks.ts`

- [ ] **Step 1: Create use-stocks hook**

```typescript
// apps/web/src/hooks/use-stocks.ts
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useStocks() {
  const quotes = trpc.stocks.quotes.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: 2,
  });

  return {
    stocks: quotes.data?.stocks ?? [],
    crypto: quotes.data?.crypto ?? [],
    isLoading: quotes.isLoading,
    isError: quotes.isError,
  };
}
```

- [ ] **Step 2: Verify web typechecks**

```bash
cd apps/web && bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-stocks.ts
git commit -m "feat: add useStocks hook with 60s polling"
```

---

## Task 8: Weather Card Component (Compact)

**Files:**
- Create: `apps/web/src/components/hub/weather-card.tsx`
- Create: `apps/web/src/__tests__/weather-card.test.tsx`

- [ ] **Step 1: Write failing test for WeatherCard**

```tsx
// apps/web/src/__tests__/weather-card.test.tsx
import { WeatherCard } from "@/components/hub/weather-card";
import * as useWeatherModule from "@/hooks/use-weather";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-weather");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn((selector: (s: { activePaletteId: string }) => unknown) =>
    selector({ activePaletteId: "midnight" }),
  ),
}));

const mockUseWeather = vi.mocked(useWeatherModule.useWeather);

function setupHook(overrides = {}) {
  mockUseWeather.mockReturnValue({
    temperature: 75,
    condition: "Partly cloudy",
    conditionCode: 2,
    highTemp: 82,
    lowTemp: 68,
    uvIndex: 6.2,
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

describe("WeatherCard", () => {
  it("renders current temperature", () => {
    render(<WeatherCard />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("renders condition text", () => {
    render(<WeatherCard />);
    expect(screen.getByText("Partly cloudy")).toBeInTheDocument();
  });

  it("renders high and low temps", () => {
    render(<WeatherCard />);
    expect(screen.getByText(/82/)).toBeInTheDocument();
    expect(screen.getByText(/68/)).toBeInTheDocument();
  });

  it("renders UV index", () => {
    render(<WeatherCard />);
    expect(screen.getByText(/6\.2/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    setupHook({ isLoading: true });
    render(<WeatherCard />);
    expect(screen.getByText("--")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && bunx vitest run src/__tests__/weather-card.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement WeatherCard**

```tsx
// apps/web/src/components/hub/weather-card.tsx
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { displayValue } from "@/components/hub/display-value";
import { useWeather } from "@/hooks/use-weather";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud;
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function WeatherCard() {
  const config = getCardConfig("weather");
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const {
    temperature,
    condition,
    conditionCode,
    highTemp,
    lowTemp,
    uvIndex,
    isLoading,
    isError,
  } = useWeather();

  const Icon = getWeatherIcon(conditionCode);
  const tempDisplay = displayValue({
    isLoading,
    isError,
    value: temperature,
    formatter: (v) => `${Math.round(v as number)}`,
  });

  return (
    <BentoCard
      testId="widget-card-weather"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("weather")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-lg text-muted-foreground">Weather</span>
          <Icon size={24} className="text-muted-foreground/60" />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl font-light text-foreground tabular-nums">
                {tempDisplay}
              </span>
              {!isLoading && !isError && temperature !== null && (
                <span className="text-lg text-muted-foreground/50">
                  {"\u00b0F"}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              {displayValue({ isLoading, isError, value: condition })}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground/50 space-y-0.5">
            <div>
              H:{" "}
              {displayValue({
                isLoading,
                isError,
                value: highTemp,
                formatter: (v) => `${Math.round(v as number)}\u00b0`,
              })}
              {"  "}L:{" "}
              {displayValue({
                isLoading,
                isError,
                value: lowTemp,
                formatter: (v) => `${Math.round(v as number)}\u00b0`,
              })}
            </div>
            <div>
              UV{" "}
              {displayValue({
                isLoading,
                isError,
                value: uvIndex,
                formatter: (v) =>
                  String(Math.round((v as number) * 10) / 10),
              })}
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && bunx vitest run src/__tests__/weather-card.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/weather-card.tsx apps/web/src/__tests__/weather-card.test.tsx
git commit -m "feat: add weather card compact view component"
```

---

## Task 9: Stock Ticker Card Component (Compact)

**Files:**
- Create: `apps/web/src/components/hub/stock-ticker-card.tsx`
- Create: `apps/web/src/__tests__/stock-ticker-card.test.tsx`

- [ ] **Step 1: Write failing test for StockTickerCard**

```tsx
// apps/web/src/__tests__/stock-ticker-card.test.tsx
import { StockTickerCard } from "@/components/hub/stock-ticker-card";
import * as useStocksModule from "@/hooks/use-stocks";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-stocks");
vi.mock("@/stores/theme-store", () => ({
  useThemeStore: vi.fn(
    (selector: (s: { activePaletteId: string }) => unknown) =>
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
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && bunx vitest run src/__tests__/stock-ticker-card.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement StockTickerCard**

```tsx
// apps/web/src/components/hub/stock-ticker-card.tsx
import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useStocks } from "@/hooks/use-stocks";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { TrendingUp } from "lucide-react";

function formatPrice(price: number): string {
  if (price >= 1000)
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(3)}`;
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function ChangeText({ percent }: { percent: number }) {
  const colorClass = percent >= 0 ? "text-green-400" : "text-red-400";
  return (
    <span className={`text-xs tabular-nums ${colorClass}`}>
      {formatPercent(percent)}
    </span>
  );
}

export function StockTickerCard() {
  const config = getCardConfig("stocks");
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const { stocks, crypto, isLoading, isError } = useStocks();

  if (isLoading || isError) {
    return (
      <BentoCard
        testId="widget-card-stocks"
        gridColumn={config?.gridColumn}
        gridRow={config?.gridRow}
        paletteColor={config?.colorScheme.color}
      >
        <div className="flex items-center justify-center h-full">
          <span className="text-muted-foreground/50">
            {isLoading ? "--" : "N/A"}
          </span>
        </div>
      </BentoCard>
    );
  }

  const allQuotes = [
    ...stocks.map((s) => ({ ...s, changePercent: s.changePercent })),
    ...crypto,
  ];

  return (
    <BentoCard
      testId="widget-card-stocks"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("stocks")}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg text-muted-foreground">Markets</span>
          <TrendingUp size={20} className="text-muted-foreground/40" />
        </div>
        <div className="flex-1 flex items-center">
          <div className="grid grid-cols-6 gap-x-4 gap-y-1 w-full">
            {allQuotes.map((q) => (
              <div key={q.symbol} className="flex flex-col items-center">
                <span className="text-xs font-medium text-foreground/80">
                  {q.symbol}
                </span>
                <span className="text-sm tabular-nums text-foreground">
                  {formatPrice(q.price)}
                </span>
                <ChangeText percent={q.changePercent} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/web && bunx vitest run src/__tests__/stock-ticker-card.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/hub/stock-ticker-card.tsx apps/web/src/__tests__/stock-ticker-card.test.tsx
git commit -m "feat: add stock ticker card compact view component"
```

---

## Task 10: Expanded Weather View

**Files:**
- Create: `apps/web/src/components/hub/expanded-weather.tsx`

- [ ] **Step 1: Implement ExpandedWeather**

```tsx
// apps/web/src/components/hub/expanded-weather.tsx
import { useWeather } from "@/hooks/use-weather";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud;
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if (code <= 77 || (code >= 85 && code <= 86)) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function getUvLabel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function ExpandedWeather() {
  const {
    temperature,
    condition,
    conditionCode,
    highTemp,
    lowTemp,
    uvIndex,
    isLoading,
    isError,
  } = useWeather();

  const Icon = getWeatherIcon(conditionCode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Loading weather...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Weather unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-6">
      <Icon size={64} className="text-muted-foreground/60 mb-4" />
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-7xl font-light text-foreground tabular-nums">
          {temperature !== null ? Math.round(temperature) : "--"}
        </span>
        <span className="text-2xl text-muted-foreground/50">{"\u00b0F"}</span>
      </div>
      <div className="text-xl text-muted-foreground mb-8">
        {condition ?? "Unknown"}
      </div>
      <div className="grid grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">High</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {highTemp !== null ? `${Math.round(highTemp)}\u00b0` : "--"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">Low</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {lowTemp !== null ? `${Math.round(lowTemp)}\u00b0` : "--"}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground/50 mb-1">UV Index</div>
          <div className="text-2xl font-light text-foreground tabular-nums">
            {uvIndex !== null ? Math.round(uvIndex * 10) / 10 : "--"}
          </div>
          {uvIndex !== null && (
            <div className="text-xs text-muted-foreground/40">
              {getUvLabel(uvIndex)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/hub/expanded-weather.tsx
git commit -m "feat: add expanded weather overlay view"
```

---

## Task 11: Expanded Stocks View

**Files:**
- Create: `apps/web/src/components/hub/expanded-stocks.tsx`

- [ ] **Step 1: Implement ExpandedStocks**

```tsx
// apps/web/src/components/hub/expanded-stocks.tsx
import { useStocks } from "@/hooks/use-stocks";
import { TrendingDown, TrendingUp } from "lucide-react";

function formatPrice(price: number): string {
  if (price >= 1000)
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function QuoteRow({
  symbol,
  name,
  price,
  changePercent,
  change,
}: {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change?: number;
}) {
  const isPositive = changePercent >= 0;
  const colorClass = isPositive ? "text-green-400" : "text-red-400";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={16} className={colorClass} />
        <div>
          <div className="text-base font-medium text-foreground">
            {symbol}
          </div>
          <div className="text-xs text-muted-foreground/50">{name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base tabular-nums text-foreground">
          {formatPrice(price)}
        </div>
        <div className={`text-sm tabular-nums ${colorClass}`}>
          {change !== undefined && (
            <span className="mr-1">
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}
            </span>
          )}
          {formatPercent(changePercent)}
        </div>
      </div>
    </div>
  );
}

export function ExpandedStocks() {
  const { stocks, crypto, isLoading, isError } = useStocks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Loading quotes...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50">
        Market data unavailable
      </div>
    );
  }

  return (
    <div className="flex flex-col px-8 pt-6 pb-8 overflow-y-auto h-full">
      <h2 className="text-xl font-light text-foreground mb-4">Stocks</h2>
      <div className="mb-6">
        {stocks.map((s) => (
          <QuoteRow
            key={s.symbol}
            symbol={s.symbol}
            name={s.name}
            price={s.price}
            changePercent={s.changePercent}
            change={s.change}
          />
        ))}
      </div>
      <h2 className="text-xl font-light text-foreground mb-4">Crypto</h2>
      <div>
        {crypto.map((c) => (
          <QuoteRow
            key={c.symbol}
            symbol={c.symbol}
            name={c.name}
            price={c.price}
            changePercent={c.changePercent}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/hub/expanded-stocks.tsx
git commit -m "feat: add expanded stocks overlay view"
```

---

## Task 12: Register Cards and Wire Up Expanded Views

**Files:**
- Modify: `apps/web/src/components/hub/register-cards.ts`
- Modify: `apps/web/src/components/hub/card-overlay.tsx`

- [ ] **Step 1: Register weather and stocks cards**

Add to `apps/web/src/components/hub/register-cards.ts`:

Add imports at the top:
```typescript
import { ExpandedStocks } from "@/components/hub/expanded-stocks";
import { ExpandedWeather } from "@/components/hub/expanded-weather";
import { StockTickerCard } from "@/components/hub/stock-ticker-card";
import { WeatherCard } from "@/components/hub/weather-card";
```

Add registrations at the bottom:
```typescript
registerCard({
  id: "weather",
  gridColumn: "4 / 5",
  gridRow: "1 / 2",
  colorScheme: { color: "orange" },
  component: WeatherCard,
  expandedView: ExpandedWeather,
});

registerCard({
  id: "stocks",
  gridColumn: "1 / 4",
  gridRow: "4 / 5",
  colorScheme: { color: "crimson" },
  component: StockTickerCard,
  expandedView: ExpandedStocks,
});
```

Note: Using "crimson" for stocks to avoid color conflict with WiFi card (green).

- [ ] **Step 2: Add expanded views to card-overlay.tsx EXPANDED_VIEWS map**

In `apps/web/src/components/hub/card-overlay.tsx`, add imports:
```typescript
import { ExpandedStocks } from "@/components/hub/expanded-stocks";
import { ExpandedWeather } from "@/components/hub/expanded-weather";
```

Add entries to `EXPANDED_VIEWS`:
```typescript
weather: ExpandedWeather,
stocks: ExpandedStocks,
```

- [ ] **Step 3: Verify full typecheck passes**

```bash
cd apps/web && bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/hub/register-cards.ts apps/web/src/components/hub/card-overlay.tsx
git commit -m "feat: register weather and stocks cards in bento grid"
```

---

## Task 13: Run Full Test Suite and Lint

- [ ] **Step 1: Run all API tests**

```bash
cd apps/api && bunx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run all web tests**

```bash
cd apps/web && bunx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Run linter**

```bash
bun run lint:fix
```

Expected: No errors after auto-fix.

- [ ] **Step 4: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors.

- [ ] **Step 5: Run boundary check**

```bash
bun run check:boundaries
```

Expected: No violations. Weather and stock services only import external APIs. Routers only import services.

- [ ] **Step 6: Commit any lint fixes**

```bash
git add -A && git commit -m "chore: lint fixes for weather and stocks cards"
```

---

## Task 14: Visual Verification

- [ ] **Step 1: Start dev server**

```bash
tilt up
```

- [ ] **Step 2: Open browser at iPad resolution and verify weather card**

Use agent-browser headless at iPad resolution (2732x2048). Navigate to `http://localhost:4200`. Verify:
- Weather card shows in col 4, row 1
- Temperature, condition, high/low, UV all render
- Card is tappable and expands to overlay

- [ ] **Step 3: Verify stock ticker card**

- Stock ticker card shows in cols 1-3, row 4
- All 6 tickers visible (SOFI, AAPL, NVDA, BTC, ETH, DOGE)
- Positive changes green, negative changes red
- Card is tappable and expands to overlay with detailed view

- [ ] **Step 4: Verify no regressions**

- All existing cards still render correctly
- Grid layout has no overlaps
- Clock idle timeout still works
- Card overlay dismiss (swipe/tap backdrop) still works

- [ ] **Step 5: Capture screenshots**

Save screenshots to `docs/screenshots/` for both compact grid view and expanded views.

---

## Self-Review Checklist

1. **Spec coverage:**
   - [x] Weather: current temp, conditions, high/low, UV
   - [x] Stocks: SOFI (first), AAPL, NVDA, BTC, ETH, DOGE
   - [x] Compact views in bento grid
   - [x] Expanded overlay views
   - [x] Polling intervals (15min weather, 60s stocks)

2. **Placeholder scan:** No TBD/TODO found (except coordinates note).

3. **Type consistency:** `WeatherData`, `StockQuote`, `CryptoQuote` types used consistently across service -> router -> hook -> component.

4. **Open question:** The weather service hardcodes placeholder coordinates. Calum needs to confirm lat/long for his home location, or this can be made configurable via app-config.
