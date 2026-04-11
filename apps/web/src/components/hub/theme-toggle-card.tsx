import { BentoCard } from "@/components/hub/bento-card";
import { useThemeStore } from "@/stores/theme-store";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleCard() {
  const activePaletteId = useThemeStore((s) => s.activePaletteId);
  const setActivePalette = useThemeStore((s) => s.setActivePalette);
  const isDark = activePaletteId === "midnight";

  const toggle = () => {
    const next = isDark ? "daylight" : "midnight";
    setActivePalette(next);
    localStorage.setItem("theme-mode", next);
  };

  return (
    <BentoCard
      testId="widget-card-theme"
      gridArea="theme"
      onClick={toggle}
      className="flex flex-col items-center justify-center"
    >
      <div
        className="transition-transform duration-300 ease-out"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        {isDark ? (
          <Moon size={24} className="text-foreground" />
        ) : (
          <Sun size={24} className="text-foreground" />
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
        {isDark ? "Dark" : "Light"}
      </div>
    </BentoCard>
  );
}
