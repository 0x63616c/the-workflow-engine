import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  clearRegistry,
  executeTool,
  getTool,
  getToolDefinitions,
  registerTool,
} from "../../../../integrations/evee/tools/registry";

afterEach(() => {
  clearRegistry();
});

describe("registerTool", () => {
  it("registers a tool and retrieves it by name", () => {
    registerTool({
      name: "test-tool",
      description: "A test tool",
      inputSchema: z.object({ value: z.string() }),
      outputSchema: z.object({ result: z.string() }),
      execute: async ({ value }) => ({ result: value.toUpperCase() }),
    });

    const tool = getTool("test-tool");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("test-tool");
  });

  it("throws on duplicate registration", () => {
    const def = {
      name: "dupe",
      description: "d",
      inputSchema: z.object({}),
      outputSchema: z.object({}),
      execute: async () => ({}),
    };
    registerTool(def);
    expect(() => registerTool(def)).toThrow("already registered");
  });
});

describe("getToolDefinitions", () => {
  it("returns entries with description and inputSchema fields", () => {
    registerTool({
      name: "info-tool",
      description: "A tool for testing definitions",
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.object({ answer: z.string() }),
      execute: async ({ query }) => ({ answer: query }),
    });

    const defs = getToolDefinitions();
    expect(defs["info-tool"]).toBeDefined();
    expect(defs["info-tool"].description).toBe("A tool for testing definitions");
    expect(defs["info-tool"].inputSchema).toBeDefined();
  });
});

describe("executeTool", () => {
  it("executes a registered tool with validated input", async () => {
    registerTool({
      name: "adder",
      description: "adds numbers",
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ sum: z.number() }),
      execute: async ({ a, b }) => ({ sum: a + b }),
    });

    const result = await executeTool("adder", { a: 3, b: 4 });
    expect(result).toEqual({ sum: 7 });
  });

  it("throws on unknown tool", async () => {
    await expect(executeTool("nope", {})).rejects.toThrow("Unknown tool: nope");
  });

  it("throws on invalid input", async () => {
    registerTool({
      name: "strict",
      description: "s",
      inputSchema: z.object({ count: z.number().min(1) }),
      outputSchema: z.object({}),
      execute: async () => ({}),
    });

    await expect(executeTool("strict", { count: -5 })).rejects.toThrow();
  });
});
