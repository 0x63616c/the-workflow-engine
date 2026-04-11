import { useBuildHash } from "@/hooks/use-build-hash";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BuildHashLabel />
    </div>
  );
}

function BuildHashLabel() {
  const { data } = useBuildHash();

  if (!data?.hash) return null;

  return (
    <p className="fixed bottom-2 right-3 font-mono text-xs text-muted-foreground/50">
      (#{data.hash})
    </p>
  );
}
