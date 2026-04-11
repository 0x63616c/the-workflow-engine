import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
