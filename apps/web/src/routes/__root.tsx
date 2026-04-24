import { AppShell } from "@/components/app-shell";
import { ConnectionStatus } from "@/components/connection-status";
import { ErrorBoundary } from "@/components/error-boundary";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CardOverlay } from "@/components/hub/card-overlay";
import { ToastProvider } from "@/components/toast-provider";
import { useAutoReload } from "@/hooks/use-auto-reload";
import { initFaro } from "@/lib/faro";
import { Outlet, createRootRoute } from "@tanstack/react-router";

initFaro(import.meta.env.VITE_FARO_URL ?? "", "evee-web", import.meta.env.VITE_BUILD_HASH ?? "dev");

function RootLayout() {
  useAutoReload();

  return (
    <>
      <ToastProvider />
      <ErrorBoundary>
        <AppShell>
          <Outlet />
        </AppShell>
        <Header />
        <Footer />
        <CardOverlay />
        <ConnectionStatus />
      </ErrorBoundary>
    </>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
