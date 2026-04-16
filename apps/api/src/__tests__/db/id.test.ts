import { describe, expect, it } from "vitest";
import { ID_PREFIXES, newId } from "../../db/id";

describe("newId", () => {
  it("generates an ID with the correct prefix", () => {
    const id = newId("conversation");
    expect(id).toMatch(/^conv_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{16}$/);
  });

  it("generates an ID with msg prefix", () => {
    const id = newId("message");
    expect(id.startsWith("msg_")).toBe(true);
    expect(id.length).toBe(4 + 16);
  });

  it("generates an ID with img prefix", () => {
    const id = newId("image");
    expect(id.startsWith("img_")).toBe(true);
  });

  it("generates an ID with llm prefix", () => {
    const id = newId("llmCall");
    expect(id.startsWith("llm_")).toBe(true);
  });

  it("generates an ID with tc prefix", () => {
    const id = newId("toolCall");
    expect(id.startsWith("tc_")).toBe(true);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("conversation")));
    expect(ids.size).toBe(1000);
  });

  it("exports all prefix mappings", () => {
    expect(ID_PREFIXES).toEqual({
      conversation: "conv",
      message: "msg",
      image: "img",
      llmCall: "llm",
      toolCall: "tc",
    });
  });
});
