import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Calendar } from "lucide-react";

interface CountdownEvent {
  id: number;
  title: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDaysRemaining(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

interface CountdownCardMiniProps {
  nextEvent: CountdownEvent | null;
}

export function CountdownCardMini({ nextEvent }: CountdownCardMiniProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("countdown");

  return (
    <BentoCard
      testId="widget-card-countdown"
      gridColumn={config?.gridColumn}
      gridRow={config?.gridRow}
      colorScheme={{
        bg: config?.colorScheme.bg,
        border: config?.colorScheme.border,
      }}
      onClick={() => expandCard("countdown")}
    >
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Countdown</span>
          </div>
          {nextEvent ? (
            <>
              <div className="text-sm font-medium text-foreground truncate">{nextEvent.title}</div>
              <div className="text-2xl font-light text-foreground mt-1">
                {formatDaysRemaining(daysUntil(nextEvent.date))}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground/50">No events</div>
          )}
        </div>
      </div>
    </BentoCard>
  );
}

export function CountdownCardExpanded() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-light text-foreground">Countdown</h2>
      </div>
      <p className="text-muted-foreground">Countdown events will be loaded from the API.</p>
    </div>
  );
}
