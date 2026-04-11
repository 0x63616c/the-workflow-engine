import type { LucideIcon } from "lucide-react";

interface WidgetCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  value: string;
  onClick?: () => void;
}

export function WidgetCard({ id, icon: Icon, title, value, onClick }: WidgetCardProps) {
  return (
    <div
      data-testid={`widget-card-${id}`}
      className={`rounded-xl border border-border bg-card p-6 ${onClick ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          onClick?.();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center">
        <Icon size={20} className="text-muted-foreground" />
        <span className="ml-2 text-sm font-[300] text-muted-foreground">{title}</span>
      </div>
      <div className="mt-3 text-2xl font-[200] text-foreground">{value}</div>
    </div>
  );
}
