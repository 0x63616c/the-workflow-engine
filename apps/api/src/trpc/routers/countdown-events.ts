import { z } from "zod";

import {
  createCountdownEvent,
  getCountdownEventById,
  listPastCountdownEvents,
  listUpcomingCountdownEvents,
  removeCountdownEvent,
  updateCountdownEvent,
} from "../../services/countdown-events";
import { publicProcedure, router } from "../init";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const countdownEventInput = z.object({
  title: z.string().min(1),
  date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD format"),
});

export const countdownEventsRouter = router({
  listUpcoming: publicProcedure.query(({ ctx }) => {
    return listUpcomingCountdownEvents(ctx.db);
  }),

  listPast: publicProcedure.query(({ ctx }) => {
    return listPastCountdownEvents(ctx.db);
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => {
    return getCountdownEventById(ctx.db, input.id);
  }),

  create: publicProcedure.input(countdownEventInput).mutation(({ ctx, input }) => {
    return createCountdownEvent(ctx.db, input);
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1),
        date: z.string().regex(dateRegex, "Date must be YYYY-MM-DD format"),
      }),
    )
    .mutation(({ ctx, input }) => {
      return updateCountdownEvent(ctx.db, input.id, {
        title: input.title,
        date: input.date,
      });
    }),

  remove: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    await removeCountdownEvent(ctx.db, input.id);
    return { success: true };
  }),
});
