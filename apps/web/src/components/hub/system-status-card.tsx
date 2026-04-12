import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Activity } from "lucide-react";

export function SystemStatusCard() {
  const config = getCardConfig("system");

  return (
    <BentoCard
      testId="widget-card-system"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <Activity size={14} className="text-muted-foreground" />
              <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="text-base text-muted-foreground">System</span>
          </div>
          <div className="text-base text-muted-foreground/70">All systems OK</div>
        </div>
      </div>
    </BentoCard>
  );
}
