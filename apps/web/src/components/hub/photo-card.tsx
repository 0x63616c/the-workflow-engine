import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { Image } from "lucide-react";

export function PhotoCard() {
  const config = getCardConfig("photo");

  return (
    <BentoCard
      testId="widget-card-photo"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      borderRadius={config?.borderRadius}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <Image size={20} className="text-muted-foreground/50 mb-2" />
        <span className="text-xs text-muted-foreground/40">Photo Frame</span>
      </div>
    </BentoCard>
  );
}
