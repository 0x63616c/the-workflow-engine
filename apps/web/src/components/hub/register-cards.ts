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
  colorScheme: { color: "iris" },
  component: ClockCard,
  expandedView: ClockStateCarousel,
});

registerCard({
  id: "countdown",
  gridColumn: "5 / 7",
  gridRow: "1 / 2",
  colorScheme: { color: "purple" },
  component: CountdownCardMini,
  expandedView: CountdownCardExpanded,
});

registerCard({
  id: "music",
  gridColumn: "4 / 5",
  gridRow: "2 / 3",
  colorScheme: { color: "blue" },
  component: MusicCard,
  expandedView: ExpandedMusic,
});

registerCard({
  id: "lights",
  gridColumn: "1 / 2",
  gridRow: "3 / 4",
  colorScheme: { color: "amber" },
  component: LightsCard,
});

registerCard({
  id: "fan",
  gridColumn: "2 / 3",
  gridRow: "3 / 4",
  colorScheme: { color: "cyan" },
  component: FanCard,
});

registerCard({
  id: "climate",
  gridColumn: "3 / 4",
  gridRow: "3 / 4",
  colorScheme: { color: "teal" },
  component: ClimateCard,
});

registerCard({
  id: "wifi",
  gridColumn: "5 / 7",
  gridRow: "2 / 4",
  colorScheme: { color: "green" },
  component: WifiCard,
});

registerCard({
  id: "settings",
  gridColumn: "4 / 5",
  gridRow: "4 / 5",
  colorScheme: { color: "slate" },
  component: SettingsCard,
  expandedView: SettingsCardExpanded,
});
