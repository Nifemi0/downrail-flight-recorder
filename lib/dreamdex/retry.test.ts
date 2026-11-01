import { describe, expect, it, vi } from "vitest";
import { retryTransient } from "./retry";
describe("transient retry", () => {
  it("retries a timeout once and returns the result", async () => { const operation=vi.fn().mockRejectedValueOnce(new Error("network timeout")).mockResolvedValueOnce("ok"); await expect(retryTransient(operation)).resolves.toBe("ok"); expect(operation).toHaveBeenCalledTimes(2); });
  it("does not retry a validation failure", async () => { const operation=vi.fn().mockRejectedValue(new Error("schema invalid")); await expect(retryTransient(operation)).rejects.toThrow("schema invalid"); expect(operation).toHaveBeenCalledTimes(1); });
});
