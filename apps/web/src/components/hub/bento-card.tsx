import { type CardPaletteColor, cardColorVar } from "@/lib/palette";
import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
  gridColumn?: string;
  gridRow?: string;
  paletteColor?: CardPaletteColor;
  borderRadius?: string;
}

export function BentoCard({
  children,
  className = "",
  onClick,
  testId,
  gridColumn,
  gridRow,
  paletteColor,
  borderRadius,
}: BentoCardProps) {
  const radiusClass = borderRadius ?? "rounded-2xl";

  return (
    <div
      data-testid={testId}
      className={`
        ${radiusClass} p-5 transition-all duration-150 ease-out
        border bg-card
        ${onClick ? "cursor-pointer active:scale-[0.97]" : ""}
        ${className}
      `}
      style={{
        ...(gridColumn ? { gridColumn } : {}),
        ...(gridRow ? { gridRow } : {}),
        borderColor: paletteColor ? cardColorVar(paletteColor, "border") : "var(--color-border)",
        backgroundColor: paletteColor ? cardColorVar(paletteColor, "tint") : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
