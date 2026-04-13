import { z } from "zod";
import { HaError } from "../../integrations/homeassistant/types";
import { haRelay } from "../../integrations/homeassistant/ws-relay";
import type { HaStateChangedEvent } from "../../integrations/homeassistant/ws-relay";
import {
  getClimateState,
  getLightsState,
  getMediaPlayers,
  mediaPlayerCommand,
  setTemperature,
  setVolume,
  turnAllLightsOff,
  turnAllLightsOn,
  turnFanOff,
  turnFanOn,
} from "../../services/ha-service";
import { publicProcedure, router } from "../init";

async function withHaErrorHandling<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HaError) return { error: "HA unavailable" };
    throw err;
  }
}

export const devicesRouter = router({
  lights: publicProcedure.query(() => withHaErrorHandling(() => getLightsState())),

  lightsOn: publicProcedure.mutation(() =>
    withHaErrorHandling(async () => {
      await turnAllLightsOn();
      return { success: true };
    }),
  ),

  lightsOff: publicProcedure.mutation(() =>
    withHaErrorHandling(async () => {
      await turnAllLightsOff();
      return { success: true };
    }),
  ),

  mediaPlayers: publicProcedure.query(() => withHaErrorHandling(() => getMediaPlayers())),

  mediaPlayerCommand: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        command: z.enum(["play", "pause", "next", "previous", "shuffle", "repeat"]),
      }),
    )
    .mutation(({ input }) =>
      withHaErrorHandling(async () => {
        await mediaPlayerCommand(input.entityId, input.command);
        return { success: true };
      }),
    ),

  setVolume: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        volumeLevel: z.number().min(0).max(100),
      }),
    )
    .mutation(({ input }) =>
      withHaErrorHandling(async () => {
        await setVolume(input.entityId, input.volumeLevel);
        return { success: true };
      }),
    ),

  climate: publicProcedure.query(() => withHaErrorHandling(() => getClimateState())),

  fanOn: publicProcedure.input(z.object({ entityId: z.string() })).mutation(({ input }) =>
    withHaErrorHandling(async () => {
      await turnFanOn(input.entityId);
      return { success: true };
    }),
  ),

  fanOff: publicProcedure.input(z.object({ entityId: z.string() })).mutation(({ input }) =>
    withHaErrorHandling(async () => {
      await turnFanOff(input.entityId);
      return { success: true };
    }),
  ),

  setTemperature: publicProcedure
    .input(z.object({ entityId: z.string(), temperature: z.number().min(65).max(80) }))
    .mutation(({ input }) =>
      withHaErrorHandling(async () => {
        await setTemperature(input.entityId, input.temperature);
        return { success: true };
      }),
    ),

  onStateChange: publicProcedure
    .input(z.object({ domains: z.array(z.string()).optional() }).optional())
    .subscription(async function* ({ input, signal }) {
      const filterDomains = input?.domains;

      const queue: HaStateChangedEvent[] = [];
      let resolve: (() => void) | null = null;

      const listener = (evt: HaStateChangedEvent) => {
        if (filterDomains && !filterDomains.includes(evt.domain)) return;
        queue.push(evt);
        resolve?.();
        resolve = null;
      };

      haRelay.on("stateChanged", listener);

      try {
        while (!signal?.aborted) {
          if (queue.length > 0) {
            const item = queue.shift();
            if (item) yield item;
          } else {
            await new Promise<void>((res) => {
              resolve = res;
              signal?.addEventListener("abort", () => res(), { once: true });
            });
          }
        }
      } finally {
        haRelay.off("stateChanged", listener);
      }
    }),
});
