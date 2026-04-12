import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { CloudSun } from "lucide-react";

interface WeatherCardProps {
  temp: number;
  condition: string;
  high: number;
  low: number;
}

const CONDITION_GRADIENTS: Record<string, string> = {
  sunny: "from-amber-500/20 to-orange-400/10",
  cloudy: "from-slate-400/20 to-blue-300/10",
  rainy: "from-blue-500/20 to-indigo-400/10",
  default: "from-sky-400/20 to-blue-300/10",
};

function getGradient(condition: string): string {
  const key = condition.toLowerCase();
  for (const [k, v] of Object.entries(CONDITION_GRADIENTS)) {
    if (key.includes(k)) return v;
  }
  return CONDITION_GRADIENTS.default;
}

export function WeatherCard({ temp, condition, high, low }: WeatherCardProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("weather");
  const gradient = getGradient(condition);

  return (
    <BentoCard
      testId="widget-card-weather"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("weather")}
      className={`bg-gradient-to-br ${gradient} relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-5xl font-light text-foreground tracking-tight">{temp}°</span>
          <div className="mt-1 flex items-center gap-2">
            <CloudSun size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{condition}</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground mt-2">
          <div>H: {high}°</div>
          <div>L: {low}°</div>
        </div>
      </div>
    </BentoCard>
  );
}
