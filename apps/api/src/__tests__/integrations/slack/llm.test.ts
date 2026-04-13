import { describe, expect, it, vi } from "vitest";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({ text: "Hello! I'm Evee." }),
    stepCountIs: vi.fn().mockReturnValue(() => true),
  };
});

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn().mockReturnValue(() => "mock-model"),
}));

vi.mock("../../../env", () => ({
  env: { OPENROUTER_API_KEY: "test-key" },
}));

vi.mock("../../../lib/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { generateText } from "ai";
import { chatCompletion } from "../../../integrations/slack/llm";

describe("chatCompletion", () => {
  it("returns a chat completion response", async () => {
    const result = await chatCompletion([{ role: "user", content: "Hi Evee!" }]);
    expect(result).toBe("Hello! I'm Evee.");
  });

  it("returns fallback when text is empty", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "",
    } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never);

    const result = await chatCompletion([{ role: "user", content: "test" }]);
    expect(result).toBe("I'm not sure what to say.");
  });

  it("passes system prompt and tools to generateText", async () => {
    await chatCompletion([{ role: "user", content: "test" }]);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("Evee"),
        tools: expect.any(Object),
        messages: [{ role: "user", content: "test" }],
      }),
    );
  });
});
