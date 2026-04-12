import { ClockStateCarousel } from "@/components/art-clock/clock-state-carousel";
import { registerCard } from "@/components/hub/card-registry";
import { ClimateCard } from "@/components/hub/climate-card";
import { ClockCard } from "@/components/hub/clock-card";
import { CountdownCardExpanded, CountdownCardMini } from "@/components/hub/countdown-card";
import { ExpandedMusic } from "@/components/hub/expanded-music";
import { FanCard } from "@/components/hub/fan-card";
import { LightsCard } from "@/components/hub/lights-card";
import { MusicCard } from "@/components/hub/music-card";
import { WifiCard } from "@/components/hub/wifi-card";

registerCard({
  id: "clock",
  gridColumn: "1 / 4",
  gridRow: "1 / 3",
  colorScheme: { bg: "", accent: "#fafafa", border: "border-white/25" },
  component: ClockCard,
  expandedView: ClockStateCarousel,
});

registerCard({
  id: "countdown",
  gridColumn: "4 / 7",
  gridRow: "1 / 2",
  colorScheme: {
    bg: "bg-purple-600/20",
    accent: "#a855f7",
    border: "border-purple-500",
  },
  component: CountdownCardMini,
  expandedView: CountdownCardExpanded,
});

registerCard({
  id: "music",
  gridColumn: "4 / 7",
  gridRow: "2 / 4",
  colorScheme: {
    bg: "bg-cyan-500/20",
    accent: "#06b6d4",
    border: "border-cyan-500",
  },
  component: MusicCard,
  expandedView: ExpandedMusic,
});

registerCard({
  id: "lights",
  gridColumn: "1 / 2",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-amber-400/20",
    accent: "#f59e0b",
    border: "border-amber-400",
  },
  component: LightsCard,
});

registerCard({
  id: "fan",
  gridColumn: "2 / 3",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-sky-400/20",
    accent: "#38bdf8",
    border: "border-sky-400",
  },
  component: FanCard,
});

registerCard({
  id: "climate",
  gridColumn: "3 / 4",
  gridRow: "3 / 4",
  colorScheme: {
    bg: "bg-green-500/20",
    accent: "#22c55e",
    border: "border-green-500",
  },
  component: ClimateCard,
});

registerCard({
  id: "wifi",
  gridColumn: "1 / 4",
  gridRow: "4 / 5",
  colorScheme: { bg: "", accent: "#22c55e", border: "border-green-500" },
  component: WifiCard,
});
