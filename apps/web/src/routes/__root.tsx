import { AppShell } from "@/components/app-shell";
import { ConnectionStatus } from "@/components/connection-status";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAutoReload } from "@/hooks/use-auto-reload";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
  useAutoReload();

  return (
    <ErrorBoundary>
      <AppShell>
        <Outlet />
      </AppShell>
      <ConnectionStatus />
    </ErrorBoundary>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
