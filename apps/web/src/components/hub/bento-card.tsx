import { useThemeStore } from "@/stores/theme-store";
import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
  gridArea?: string;
}

export function BentoCard({ children, className = "", onClick, testId, gridArea }: BentoCardProps) {
  const isDark = useThemeStore((s) => s.activePaletteId === "midnight");

  return (
    <div
      data-testid={testId}
      className={`
        rounded-2xl p-5 transition-all duration-150 ease-out
        backdrop-blur-sm border
        ${onClick ? "cursor-pointer active:scale-[0.97]" : ""}
        ${className}
      `}
      style={{
        ...(gridArea ? { gridArea } : {}),
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
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
