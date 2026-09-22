import { describe, expect, it } from "vitest";
import * as g from "./game";

describe("offer visibility", () => {
  it.each([538, 539, 1438, 1439])("preserves each offer for its full lifetime across the clock boundary at %i", minuteOfDay => {
    let state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "lumber");
    state = g.refreshOrderPool({ ...state, minuteOfDay, orderIn: 0 });
    const offer = state.orderPool[0];
    expect(offer).toBeDefined();
    expect(offer.remaining).toBeGreaterThanOrEqual(20);
    for (let seconds = 1; seconds < g.ORDER_BOARD_LIFETIME; seconds++) {
      state = g.simulateTick(state);
      expect(state.orderPool.find(o => o.id === offer.id)?.remaining).toBe(g.ORDER_BOARD_LIFETIME - seconds);
    }
    state = g.simulateTick(state);
    expect(state.orderPool.some(o => o.id === offer.id)).toBe(false);
  });

  it("preserves the remaining lifetime when paused and reloaded", () => {
    let state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "lumber");
    state = g.refreshOrderPool({ ...state, orderIn: 0 });
    state = g.loadGame(JSON.stringify({ ...state, paused: true }));
    const pool = state.orderPool;
    for (let seconds = 0; seconds < 60; seconds++) state = g.simulateTick(state);
    expect(state.orderPool).toEqual(pool);
    expect(pool[0].remaining).toBe(g.ORDER_BOARD_LIFETIME);
  });
});
