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

export const devicesRouter = router({
  lights: publicProcedure.query(async () => {
    try {
      return await getLightsState();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  lightsOn: publicProcedure.mutation(async () => {
    try {
      await turnAllLightsOn();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  lightsOff: publicProcedure.mutation(async () => {
    try {
      await turnAllLightsOff();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  mediaPlayers: publicProcedure.query(async () => {
    try {
      return await getMediaPlayers();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  mediaPlayerCommand: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        command: z.enum(["play", "pause", "next", "previous", "shuffle", "repeat"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await mediaPlayerCommand(input.entityId, input.command);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  setVolume: publicProcedure
    .input(
      z.object({
        entityId: z.string(),
        volumeLevel: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await setVolume(input.entityId, input.volumeLevel);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  climate: publicProcedure.query(async () => {
    try {
      return await getClimateState();
    } catch (err) {
      if (err instanceof HaError) return { error: "HA unavailable" };
      throw err;
    }
  }),

  fanOn: publicProcedure
    .input(z.object({ entityId: z.string(), fanEntityId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      try {
        await turnFanOn(input.entityId, input.fanEntityId);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  fanOff: publicProcedure
    .input(z.object({ entityId: z.string(), fanEntityId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      try {
        await turnFanOff(input.entityId, input.fanEntityId);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

  setTemperature: publicProcedure
    .input(z.object({ entityId: z.string(), temperature: z.number().min(65).max(80) }))
    .mutation(async ({ input }) => {
      try {
        await setTemperature(input.entityId, input.temperature);
      } catch (err) {
        if (err instanceof HaError) return { error: "HA unavailable" };
        throw err;
      }
    }),

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
