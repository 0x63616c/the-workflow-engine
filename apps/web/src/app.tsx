import { RouterProvider, createRouter } from "@tanstack/react-router";
import { OutlineToggle } from "./components/outline-toggle";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <OutlineToggle />
    </>
  );
}
