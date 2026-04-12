import { router } from "../init";
import { appConfigRouter } from "./app-config";
import { countdownEventsRouter } from "./countdown-events";
import { devicesRouter } from "./devices";
import { healthRouter } from "./health";

export const appRouter = router({
  health: healthRouter,
  countdownEvents: countdownEventsRouter,
  devices: devicesRouter,
  appConfig: appConfigRouter,
});

export type AppRouter = typeof appRouter;
