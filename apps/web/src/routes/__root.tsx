import { ChatButton } from "@/components/chat-button";
import { Header } from "@/components/header";
import { Nav } from "@/components/nav";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
  return (
    <div className="relative flex h-full w-full flex-col">
      <Header />
      <main data-testid="page-scroll" className="flex-1 overflow-y-auto px-9">
        <Outlet />
      </main>
      <Nav />
      <ChatButton />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
