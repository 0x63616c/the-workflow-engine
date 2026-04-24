import { describe, expect, it } from "vitest";
import { HaError } from "../../integrations/homeassistant/types";

describe("HaError", () => {
  it("is an instance of Error", () => {
    const err = new HaError(401, "Unauthorized");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets name to HaError", () => {
    const err = new HaError(401, "Unauthorized");
    expect(err.name).toBe("HaError");
  });

  it("stores status code", () => {
    const err = new HaError(503, "Service Unavailable");
    expect(err.status).toBe(503);
  });

  it("stores message", () => {
    const err = new HaError(404, "Not Found");
    expect(err.message).toBe("Not Found");
  });
});
