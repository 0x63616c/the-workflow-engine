import { Link, useRouterState } from "@tanstack/react-router";
import {
  Car,
  Home,
  Lightbulb,
  type LucideIcon,
  Music2,
  Settings,
  Thermometer,
  Wifi,
} from "lucide-react";

interface NavItem {
  to: "/" | "/lights" | "/music" | "/tesla" | "/climate" | "/wifi" | "/settings";
  label: string;
  Icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/lights", label: "Lights", Icon: Lightbulb },
  { to: "/music", label: "Music", Icon: Music2 },
  { to: "/tesla", label: "Tesla", Icon: Car },
  { to: "/climate", label: "Climate", Icon: Thermometer },
  { to: "/wifi", label: "Wi-Fi", Icon: Wifi },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="-translate-x-1/2 absolute bottom-6 left-1/2 z-30 flex">
      <ul className="flex items-center gap-1 rounded-pill border border-border bg-surface/40 p-2 shadow-2xl backdrop-blur-2xl">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                className="flex items-center gap-2 whitespace-nowrap rounded-pill px-4 py-2.5 font-medium text-foreground-muted text-sm transition-colors duration-200 data-[active=true]:bg-foreground data-[active=true]:font-bold data-[active=true]:text-background hover:text-foreground"
              >
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="grid">
                  <span aria-hidden className="invisible col-start-1 row-start-1 font-bold">
                    {label}
                  </span>
                  <span className="col-start-1 row-start-1">{label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
