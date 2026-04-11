import { useAutoReload } from "@/hooks/use-auto-reload";
import { trpc } from "@/lib/trpc";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  useAutoReload();
  const { data } = trpc.health.buildHash.useQuery();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="text-4xl font-light text-foreground">The Workflow Engine</h1>
      {data?.hash && <p className="mt-2 font-mono text-xs text-muted-foreground">{data.hash}</p>}
    </div>
  );
}
