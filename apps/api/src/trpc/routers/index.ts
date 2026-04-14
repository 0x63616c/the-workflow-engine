import { router } from "../init";
import { appConfigRouter } from "./app-config";
import { countdownEventsRouter } from "./countdown-events";
import { devicesRouter } from "./devices";
import { healthRouter } from "./health";
import { stocksRouter } from "./stocks";
import { weatherRouter } from "./weather";

export const appRouter = router({
  health: healthRouter,
  countdownEvents: countdownEventsRouter,
  devices: devicesRouter,
  appConfig: appConfigRouter,
  weather: weatherRouter,
  stocks: stocksRouter,
});

export type AppRouter = typeof appRouter;
