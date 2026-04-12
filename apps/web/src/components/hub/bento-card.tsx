import { useThemeStore } from "@/stores/theme-store";
import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
  gridColumn?: string;
  gridRow?: string;
  colorScheme?: {
    bg?: string;
    border?: string;
  };
  borderRadius?: string;
}

export function BentoCard({
  children,
  className = "",
  onClick,
  testId,
  gridColumn,
  gridRow,
  colorScheme,
  borderRadius,
}: BentoCardProps) {
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");
  const radiusClass = borderRadius ?? "rounded-2xl";

  return (
    <div
      data-testid={testId}
      className={`
        ${radiusClass} p-5 transition-all duration-150 ease-out
        border bg-card
        ${onClick ? "cursor-pointer active:scale-[0.97]" : ""}
        ${colorScheme?.bg ?? ""}
        ${colorScheme?.border ?? ""}
        ${className}
      `}
      style={{
        ...(gridColumn ? { gridColumn } : {}),
        ...(gridRow ? { gridRow } : {}),
        borderColor: colorScheme?.border
          ? undefined
          : isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.06)",
        boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
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
