import { BentoCard } from "@/components/hub/bento-card";

interface CalendarEvent {
  title: string;
  time: string;
  color: string;
}

const PLACEHOLDER_EVENT: CalendarEvent | null = {
  title: "Team standup",
  time: "in 2h",
  color: "#d4a574",
};

export function CalendarCard() {
  const event = PLACEHOLDER_EVENT;

  return (
    <BentoCard
      testId="widget-card-calendar"
      gridArea="calendar"
      className="relative overflow-hidden"
    >
      {event && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: event.color }}
        />
      )}
      <div className="pl-2">
        <div className="text-sm text-muted-foreground mb-2">Calendar</div>
        {event ? (
          <>
            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
            <div className="text-xs text-muted-foreground/70 mt-1">{event.time}</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground/50">No events</div>
        )}
      </div>
    </BentoCard>
  );
}
