import { env } from "../../env";
import { publicProcedure, router } from "../init";

const SERVER_STARTED_AT = new Date().toISOString();

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok" as const, timestamp: Date.now() };
  }),
  buildHash: publicProcedure.query(() => {
    return { hash: env.BUILD_HASH, deployedAt: SERVER_STARTED_AT };
  }),
});
