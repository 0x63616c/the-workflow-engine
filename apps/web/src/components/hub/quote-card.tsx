import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Quote } from "lucide-react";

export function QuoteCard() {
  const config = getCardConfig("quote");

  return (
    <BentoCard
      testId="widget-card-quote"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      borderRadius={config?.borderRadius}
    >
      <div className="flex items-start gap-3">
        <Quote size={14} className="text-muted-foreground/40 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-foreground/80 italic leading-relaxed">
            The best way to predict the future is to invent it.
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">Alan Kay</p>
        </div>
      </div>
    </BentoCard>
  );
}
