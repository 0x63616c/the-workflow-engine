import { Header } from "@/components/header";
import { Nav } from "@/components/nav";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
  return (
    <div className="relative h-full w-full">
      <Header />
      <main data-testid="page-scroll" className="h-full w-full overflow-y-auto px-9 pt-30 pb-32">
        <Outlet />
      </main>
      <Nav />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
