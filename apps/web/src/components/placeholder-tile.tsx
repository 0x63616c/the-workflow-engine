interface PlaceholderTileProps {
  label: string;
  className?: string;
}

export function PlaceholderTile({ label, className }: PlaceholderTileProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-card border border-border bg-surface font-mono text-foreground-muted text-xs uppercase tracking-widest ${className ?? ""}`}
    >
      {label}
    </div>
  );
}
