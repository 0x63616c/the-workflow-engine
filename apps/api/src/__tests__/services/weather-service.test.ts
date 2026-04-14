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
