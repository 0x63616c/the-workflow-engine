import { trpc } from "@/lib/trpc";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BuildHash />
    </div>
  );
}

function BuildHash() {
  const { data } = trpc.health.buildHash.useQuery();

  if (!data?.hash) return null;

  return (
    <p className="fixed bottom-2 right-3 font-mono text-xs text-muted-foreground/50">
      (#{data.hash})
    </p>
  );
}
