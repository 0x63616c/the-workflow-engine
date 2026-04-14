import { getCurrentWeather } from "../../services/weather-service";
import { publicProcedure, router } from "../init";

export const weatherRouter = router({
  current: publicProcedure.query(() => getCurrentWeather()),
});
