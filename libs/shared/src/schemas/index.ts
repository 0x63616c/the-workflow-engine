import { z } from "zod";

export const portOffsetSchema = z.coerce.number().int().min(0).max(99).default(0);
