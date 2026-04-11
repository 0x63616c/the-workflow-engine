import { env } from "../../env";
import { publicProcedure, router } from "../init";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok" as const, timestamp: Date.now() };
  }),
  buildHash: publicProcedure.query(() => {
    return { hash: env.BUILD_HASH };
  }),
});
