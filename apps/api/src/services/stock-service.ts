import YahooFinance from "yahoo-finance2";

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
  const yf = new YahooFinance();
  const results: StockQuote[] = [];

  for (const symbol of STOCK_SYMBOLS) {
    try {
      const quote = await yf.quote(symbol);
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

type CoinGeckoResponse = Record<string, { usd: number; usd_24h_change: number }>;

export async function getCryptoQuotes(): Promise<CryptoQuote[]> {
  const ids = CRYPTO_IDS.map((c) => c.id).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
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
