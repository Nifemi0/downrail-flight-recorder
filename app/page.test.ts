import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { readMarkets } = vi.hoisted(() => ({ readMarkets: vi.fn() }));
vi.mock("@/lib/dreamdex/markets", () => ({ getMarketSnapshot: readMarkets }));
vi.mock("./market-console", () => ({ MarketConsole: () => createElement("div", null, "market console") }));
import HomePage from "./page";
beforeEach(() => { readMarkets.mockReset(); });
describe("market source failure", () => {
  it("shows the market workspace after a successful read", async () => { readMarkets.mockResolvedValue({supported:[]}); expect(renderToStaticMarkup(await HomePage())).toContain("market console"); });
  it("renders a truthful retry state when market discovery fails", async () => {
    readMarkets.mockRejectedValue(new Error("offline"));
    const html=renderToStaticMarkup(await HomePage());
    expect(html).toContain("market data"); expect(html).toContain("Try again"); expect(html).toContain("Open a local chain-event archive"); expect(html).toContain("FILLTRAIL"); expect(html).not.toContain("DOWNRAIL"); expect(html).not.toContain("market console");
  });
  it("renders a truthful retry state when market discovery times out", async () => {
    vi.useFakeTimers();
    try { readMarkets.mockReturnValue(new Promise(() => {})); const pending=HomePage(); await vi.advanceTimersByTimeAsync(12000); const html=renderToStaticMarkup(await pending); expect(html).toContain("market data"); expect(html).toContain("Try again"); expect(html).not.toContain("market console"); }
    finally { vi.useRealTimers(); }
  });
});
