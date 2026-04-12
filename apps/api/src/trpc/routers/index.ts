import { router } from "../init";
import { devicesRouter } from "./devices";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
  devices: devicesRouter,
});

export type AppRouter = typeof appRouter;
