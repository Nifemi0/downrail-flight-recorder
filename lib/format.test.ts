import { describe, expect, it } from "vitest";

import { shortenAddress } from "./format";

describe("shortenAddress", () => {
  it("shortens a long address while preserving both ends", () => {
    expect(shortenAddress("0x1234567890abcdef")).toBe("0x1234…cdef");
  });

  it("does not shorten already compact values", () => {
    expect(shortenAddress("ETH")).toBe("ETH");
  });
});
