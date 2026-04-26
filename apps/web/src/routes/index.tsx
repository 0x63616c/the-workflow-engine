import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black text-white">
      <h1 className="text-6xl font-semibold tracking-tight">Hello, World!</h1>
    </div>
  );
}
