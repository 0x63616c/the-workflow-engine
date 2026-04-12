import { z } from "zod";

import { getAllConfig, getConfig, setConfig } from "../../services/app-config";
import { publicProcedure, router } from "../init";

const configValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const appConfigRouter = router({
  get: publicProcedure.input(z.object({ key: z.string().min(1) })).query(async ({ ctx, input }) => {
    const value = await getConfig(ctx.db, input.key);
    return { value };
  }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    return getAllConfig(ctx.db);
  }),

  set: publicProcedure
    .input(z.object({ key: z.string().min(1), value: configValueSchema }))
    .mutation(async ({ ctx, input }) => {
      await setConfig(ctx.db, input.key, input.value);
      return { success: true };
    }),
});
