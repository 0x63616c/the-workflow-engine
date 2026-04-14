import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useStocks() {
  const quotes = trpc.stocks.quotes.useQuery(undefined, {
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS,
    retry: 2,
  });

  return {
    stocks: quotes.data?.stocks ?? [],
    crypto: quotes.data?.crypto ?? [],
    isLoading: quotes.isLoading,
    isError: quotes.isError,
  };
}
