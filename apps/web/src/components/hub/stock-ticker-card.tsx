import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useStocks } from "@/hooks/use-stocks";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { TrendingUp } from "lucide-react";

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(3)}`;
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function ChangeText({ percent }: { percent: number }) {
  const colorClass = percent >= 0 ? "text-green-400" : "text-red-400";
  return <span className={`text-xs tabular-nums ${colorClass}`}>{formatPercent(percent)}</span>;
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
          <span className="text-muted-foreground/50">{isLoading ? "--" : "N/A"}</span>
        </div>
      </BentoCard>
    );
  }

  const allQuotes = [...stocks.map((s) => ({ ...s, changePercent: s.changePercent })), ...crypto];

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
                <span className="text-xs font-medium text-foreground/80">{q.symbol}</span>
                <span className="text-sm tabular-nums text-foreground">{formatPrice(q.price)}</span>
                <ChangeText percent={q.changePercent} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
