import { trpc } from "@/lib/trpc";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data } = trpc.health.buildHash.useQuery();

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h1 className="text-4xl font-light text-foreground">The Workflow Engine</h1>
      {data?.hash && (
        <p className="mt-2 font-mono text-xs font-bold italic text-muted-foreground">
          (#{data.hash})
        </p>
      )}
    </div>
  );
}
