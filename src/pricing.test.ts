import { describe, expect, it } from "vitest";
import * as g from "./game";

const resource = (name: string) => g.resources.find(r => g.resourceNames[r] === name)!;

describe("resource pricing", () => {
  it("values scarce metals above common materials across market fluctuations", () => {
    let state = g.emptyState();
    for (let hour = 0; hour < 100; hour++) {
      const prices = ["Çubuk", "Odun", "Kömür", "Demir", "Bakır", "Gümüş", "Altın"].map(n => g.marketPrice(state, resource(n)));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
      for (const r of g.resources) {
        expect(g.marketPrice(state, r)).toBeGreaterThan(0);
        expect(state.marketPrices[r]).toBe(g.marketPrice(state, r));
      }
      state = g.updateMarketPrices(state);
    }
  });

  it("prices every processed product above its full ingredient cost", () => {
    const state = g.updateMarketPrices(g.emptyState());
    for (const recipe of g.siteDefinitions.flatMap(s => s.recipes).filter(r => Object.keys(r.inputs).length)) {
      const cost = Object.entries(recipe.inputs).reduce((sum, [r, n]) => sum + g.marketPrice(state, r as g.Resource) * n!, 0);
      expect(g.marketPrice(state, recipe.output)).toBeGreaterThan(cost);
    }
    const next = { ...state, marketPrices: { ...state.marketPrices, wood: state.marketPrices.wood * 2 } };
    expect(g.marketPrice(next, resource("Mobilya"))).toBeGreaterThan(g.marketPrice(state, resource("Mobilya")));
  });

  it("migrates flat-price saves while preserving player assets and accepted contracts", () => {
    const state = g.emptyState();
    const order: g.Order = { id: 1, merchantId: 0, needs: { ...g.zeroStock(), wood: 2 }, reward: 50, remaining: 30, duration: 60 };
    const old = { ...state, version: 16, money: 1234, stock: { ...state.stock, iron: 12 }, order, orderPool: [order], basePrices: Object.fromEntries(g.resources.map(r => [r, 10])), marketPrices: Object.fromEntries(g.resources.map(r => [r, 10])) };
    const migrated = g.loadGame(JSON.stringify(old));
    expect(migrated.money).toBe(old.money);
    expect(migrated.stock).toEqual(old.stock);
    expect(migrated.order).toEqual(order);
    expect(migrated.orderPool).toEqual([]);
    expect(migrated.basePrices).toEqual(state.basePrices);
    expect(g.loadGame(JSON.stringify(g.updateMarketPrices(migrated))).marketPrices).toEqual(g.updateMarketPrices(migrated).marketPrices);
  });

  it("uses resource values for trades without profitable instant round trips", () => {
    const state = { ...g.emptyState(), money: 10000 };
    for (const r of g.tradeResources) {
      const bought = g.tradeResource(state, r, 1, "buy");
      expect(bought.stock[r]).toBe(1);
      const sold = g.tradeResource(bought, r, 1, "sell");
      expect(sold.stock[r]).toBe(0);
      expect(sold.money).toBeLessThan(state.money);
    }
  });
});
