import { describe, expect, it } from "vitest";
import { displayMoney } from "./format";

describe("money display", () => {
  it("rounds positive and negative values rather than truncating losses", () => {
    expect(displayMoney("-0.23756")).toBe("≈ -0.24");
    expect(displayMoney("1.995")).toBe("≈ 2.00");
    expect(displayMoney("-1.994")).toBe("≈ -1.99");
  });
  it("retains meaningful precision near zero without floating-point conversion", () => {
    expect(displayMoney("-0.00652")).toBe("-0.00652");
    expect(displayMoney("0.000123456")).toBe("≈ 0.000123");
    expect(displayMoney("0")).toBe("0.00");
    expect(displayMoney("9007199254740993.999")).toBe("≈ 9007199254740994.00");
  });
});
