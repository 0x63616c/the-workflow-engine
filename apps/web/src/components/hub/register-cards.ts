import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { registerCard } from "@/components/hub/card-registry";
import { ClimateCard } from "@/components/hub/climate-card";
import { ClockCard } from "@/components/hub/clock-card";
import { CountdownCardExpanded, CountdownCardMini } from "@/components/hub/countdown-card";
import { ExpandedMusic } from "@/components/hub/expanded-music";
import { FanCard } from "@/components/hub/fan-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { SettingsCard, SettingsCardExpanded } from "@/components/hub/settings-card";
import { WifiCard } from "@/components/hub/wifi-card";

registerCard({
  id: "clock",
  gridColumn: "1 / 4",
  gridRow: "1 / 3",
  colorScheme: { bg: "", accent: "#fafafa", border: "" },
  component: ClockCard,
  expandedView: ClockStateCarousel,
});

registerCard({
  id: "countdown",
  gridColumn: "4 / 7",
  gridRow: "1 / 2",
  colorScheme: {
    bg: "bg-gradient-to-br from-purple-600/15 to-violet-500/10",
    accent: "#8b5cf6",
    border: "border-purple-500/10",
  },
  component: CountdownCardMini,
  expandedView: CountdownCardExpanded,
});

registerCard({
  id: "music",
  gridColumn: "4 / 7",
  gridRow: "2 / 4",
  colorScheme: {
    bg: "bg-gradient-to-br from-slate-600/15 to-slate-500/10",
    accent: "#06b6d4",
    border: "border-slate-500/10",
  },
  component: MusicCard,
  expandedView: ExpandedMusic,
});

registerCard({
  id: "lights",
  gridColumn: "1 / 2",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-gradient-to-br from-amber-400/15 to-yellow-300/10",
    accent: "#f59e0b",
    border: "border-amber-400/10",
  },
  component: LightsCard,
});

registerCard({
  id: "fan",
  gridColumn: "2 / 3",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-gradient-to-br from-cyan-400/15 to-sky-300/10",
    accent: "#22d3ee",
    border: "border-cyan-400/10",
  },
  component: FanCard,
});

registerCard({
  id: "climate",
  gridColumn: "3 / 4",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-gradient-to-br from-green-400/15 to-emerald-300/10",
    accent: "#22c55e",
    border: "border-green-400/10",
  },
  component: ClimateCard,
});

registerCard({
  id: "wifi",
  gridColumn: "1 / 4",
  gridRow: "4 / 5",
  colorScheme: { bg: "", accent: "#22c55e", border: "border-green-500/10" },
  component: WifiCard,
});

registerCard({
  id: "settings",
  gridColumn: "4 / 7",
  gridRow: "4 / 5",
  colorScheme: {
    bg: "bg-gradient-to-br from-neutral-600/15 to-neutral-500/10",
    accent: "#a3a3a3",
    border: "border-neutral-500/10",
  },
  component: SettingsCard,
  expandedView: SettingsCardExpanded,
});
