import type { z } from "zod";

export interface ToolDefinition<
  TInput extends z.ZodType = z.ZodType,
  TOutput extends z.ZodType = z.ZodType,
> {
  name: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute: (input: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

// Singleton registry - cleared only in tests
const registry = new Map<string, ToolDefinition>();

export function registerTool<TInput extends z.ZodType, TOutput extends z.ZodType>(
  definition: ToolDefinition<TInput, TOutput>,
): void {
  if (registry.has(definition.name)) {
    throw new Error(`Tool "${definition.name}" already registered`);
  }
  registry.set(definition.name, definition as unknown as ToolDefinition);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function getToolDefinitions(): Record<
  string,
  { description: string; inputSchema: z.ZodType }
> {
  const defs: Record<string, { description: string; inputSchema: z.ZodType }> = {};
  for (const [name, def] of registry) {
    defs[name] = {
      description: def.description,
      inputSchema: def.inputSchema,
    };
  }
  return defs;
}

export async function executeTool(name: string, input: unknown): Promise<unknown> {
  const def = registry.get(name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  const parsedInput = def.inputSchema.parse(input);
  const result = await def.execute(parsedInput);
  try {
    return def.outputSchema.parse(result);
  } catch (error) {
    throw new Error(
      `Tool "${name}" returned invalid output: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function clearRegistry(): void {
  registry.clear();
}
