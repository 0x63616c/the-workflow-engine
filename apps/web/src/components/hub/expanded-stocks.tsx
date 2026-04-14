import { useStocks } from "@/hooks/use-stocks";
import { formatPercent, formatPrice } from "@/lib/stock-formatters";
import { TrendingDown, TrendingUp } from "lucide-react";

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
          <div className="text-base font-medium text-foreground">{symbol}</div>
          <div className="text-xs text-muted-foreground/50">{name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-base tabular-nums text-foreground">{formatPrice(price)}</div>
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
