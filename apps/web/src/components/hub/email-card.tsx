import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Mail } from "lucide-react";

export function EmailCard() {
  const config = getCardConfig("email");

  return (
    <BentoCard
      testId="widget-card-email"
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
            <Mail size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <div className="text-lg font-light text-foreground">3 unread</div>
        </div>
      </div>
    </BentoCard>
  );
}
