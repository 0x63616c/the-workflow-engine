import { z } from "zod";
import { HaError } from "../../integrations/homeassistant/types";
import {
  getClimateState,
  getLightsState,
  getMediaPlayers,
  mediaPlayerCommand,
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
});
