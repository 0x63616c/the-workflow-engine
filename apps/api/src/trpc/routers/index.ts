import { router } from "../init";
import { countdownEventsRouter } from "./countdown-events";
import { devicesRouter } from "./devices";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
  countdownEvents: countdownEventsRouter,
  devices: devicesRouter,
});

export type AppRouter = typeof appRouter;
