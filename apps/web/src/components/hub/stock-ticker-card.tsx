import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useStocks } from "@/hooks/use-stocks";
import { formatPercent, formatPrice } from "@/lib/stock-formatters";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { TrendingUp } from "lucide-react";

function TickerItem({
  symbol,
  price,
  percent,
}: { symbol: string; price: number; percent: number }) {
  const colorClass = percent >= 0 ? "text-green-400" : "text-red-400";
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground/80">{symbol}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums text-foreground">{formatPrice(price)}</span>
        <span className={`text-sm tabular-nums ${colorClass}`}>{formatPercent(percent)}</span>
      </div>
    </div>
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
          <span className="text-2xl text-muted-foreground/50">{isLoading ? "--" : "N/A"}</span>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard
      testId="widget-card-stocks"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      paletteColor={config?.colorScheme.color}
      onClick={() => expandCard("stocks")}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <span className="text-2xl text-muted-foreground">Markets</span>
          <TrendingUp size={32} className="text-muted-foreground/40" />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <div className="flex justify-end col-span-2">
            <span className="text-xs text-muted-foreground/30">1d</span>
          </div>
          {[...stocks, ...crypto].map((q) => (
            <TickerItem
              key={q.symbol}
              symbol={q.symbol}
              price={q.price}
              percent={q.changePercent}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  );
}
