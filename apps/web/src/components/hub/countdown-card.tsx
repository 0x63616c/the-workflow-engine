import { BentoCard } from "@/components/hub/bento-card";
import { getCardConfig } from "@/components/hub/card-registry";
import { trpc } from "@/lib/trpc";
import { useCardExpansionStore } from "@/stores/card-expansion-store";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

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

function formatDaysPast(days: number): string {
  const absDays = Math.abs(days);
  if (absDays === 0) return "Today";
  if (absDays === 1) return "1 day ago";
  return `${absDays} days ago`;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CountdownCardMiniProps {
  nextEvent: CountdownEvent | null;
}

export function CountdownCardMini({ nextEvent }: CountdownCardMiniProps) {
  const expandCard = useCardExpansionStore((s) => s.expandCard);
  const config = getCardConfig("countdown");

  const days = nextEvent ? daysUntil(nextEvent.date) : null;
  const daysNumber = days !== null ? Math.abs(days) : null;
  const daysLabel = days !== null && days < 0 ? "days ago" : "days";

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
      <div className="flex items-center justify-between h-full gap-4">
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={13} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Countdown</span>
          </div>
          {nextEvent ? (
            <div className="text-xl font-medium text-foreground leading-tight truncate">
              {nextEvent.title}
            </div>
          ) : (
            <div className="text-base text-muted-foreground/50">No events</div>
          )}
        </div>
        {nextEvent && days !== null && (
          <div className="flex flex-col items-end justify-center shrink-0">
            <div className="text-6xl font-bold text-foreground leading-none tabular-nums">
              {days === 0 ? "0" : daysNumber}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {days === 0 ? "today" : daysLabel}
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}

export function CountdownCardExpanded() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");

  const utils = trpc.useUtils();
  const upcoming = trpc.countdownEvents.listUpcoming.useQuery();
  const past = trpc.countdownEvents.listPast.useQuery();
  const createMutation = trpc.countdownEvents.create.useMutation({
    onSuccess: () => {
      utils.countdownEvents.listUpcoming.invalidate();
      utils.countdownEvents.listPast.invalidate();
      setShowForm(false);
      setFormTitle("");
      setFormDate("");
    },
  });
  const removeMutation = trpc.countdownEvents.remove.useMutation({
    onSuccess: () => {
      utils.countdownEvents.listUpcoming.invalidate();
      utils.countdownEvents.listPast.invalidate();
    },
  });

  const events: CountdownEvent[] | undefined = tab === "upcoming" ? upcoming.data : past.data;
  const isLoading = tab === "upcoming" ? upcoming.isLoading : past.isLoading;

  const handleSave = () => {
    if (!formTitle.trim() || !formDate) return;
    createMutation.mutate({ title: formTitle.trim(), date: formDate });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-light text-foreground">Countdown</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="p-3 rounded-lg hover:bg-muted transition-colors"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            tab === "upcoming" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            tab === "past" ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Past
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-lg bg-muted/50 space-y-3">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Event title"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormTitle("");
                setFormDate("");
              }}
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-1">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {events?.map((event) => {
          const days = daysUntil(event.date);
          return (
            <div
              key={event.id}
              className="flex items-center justify-between py-3 border-b border-border/50"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{event.title}</div>
                <div className="text-xs text-muted-foreground/70">
                  {formatEventDate(event.date)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-sm text-muted-foreground">
                  {days >= 0 ? formatDaysRemaining(days) : formatDaysPast(days)}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate({ id: event.id })}
                  className="p-2.5 rounded hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} className="text-muted-foreground/50" />
                </button>
              </div>
            </div>
          );
        })}
        {!isLoading && events?.length === 0 && (
          <p className="text-sm text-muted-foreground/50">No events</p>
        )}
      </div>
    </div>
  );
}
