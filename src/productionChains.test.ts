import { describe, expect, it } from "vitest";
import * as g from "./game";
import { applyCommand } from "./commands";
const resource = (name: string) => g.resources.find(r => g.resourceNames[r] === name)!;
function ready(id: string) {
  let state = g.purchaseSite({ ...g.emptyState(), money: 100000, laborEventIn: 99999 }, id);
  const site = g.siteDefinitions.find(s => s.id === id)!;
  for (const type of site.equipment.filter(t => t !== "feed")) state = g.buyEquipment(state, id, type);
  return g.assignJob(state, state.workers[0].id, site.job);
}
function tick(state: g.GameState, count: number) {
  for (let i = 0; i < count; i++) state = g.simulateTick(state);
  return state;
}
describe("production chains", () => {
  it("every equipment and recipe ingredient has a producer and market listing", () => {
    const inputs = g.siteDefinitions.flatMap(s => s.recipes.flatMap(r => Object.keys(r.inputs)));
    for (const r of [...inputs, ...Object.values(g.equipmentResources)]) expect(g.tradeResources).toContain(r);
    expect(new Set(g.resources).size).toBe(g.resources.length);
  });
  it.each(g.siteDefinitions.filter(s => s.category === "workshop").flatMap(s => s.recipes.map(r => [s.id, r] as const)))("%s processes exactly the requested quantity", (id, recipe) => {
    let state = ready(id);
    for (const [r, n] of Object.entries(recipe.inputs)) state.stock[r as g.Resource] = n! * 3;
    expect(tick(state, 5).stock[recipe.output]).toBe(0);
    state = g.setProduction(state, id, recipe.output, 2);
    const next = tick(state, 20);
    expect(next.stock[recipe.output]).toBe(2);
    expect(g.productionRemaining(next.sites[id], recipe.output)).toBe(0);
    for (const [r, n] of Object.entries(recipe.inputs)) expect(next.stock[r as g.Resource]).toBe(n);
  });
  it("produces leather and sticks alongside meat and wood", () => {
    expect(tick(ready("lumber"), 5).stock[resource("Çubuk")]).toBe(1);
    expect(tick(ready("hunter"), 5).stock[resource("Deri")]).toBe(1);
  });
  it("feeds from shared stock without spending money and stops when exhausted", () => {
    let state = ready("coop"); state.stock.feed = 1;
    const next = tick(state, 60);
    expect(next.stock.feed).toBe(0);
    expect(next.money).toBe(state.money);
    expect(next.stock.egg).toBe(12);
    expect(tick(next, 10).stock.egg).toBe(12);
    expect(state.stock.feed).toBe(1);
  });
  it("transfers produced equipment exactly once and validates network commands", () => {
    const state = ready("lumber"); state.stock[g.equipmentResources.axe] = 1;
    const next = applyCommand(state, { type: "equipFromStock", args: ["lumber", "axe", 1] });
    expect(next.stock[g.equipmentResources.axe]).toBe(0);
    expect(next.money).toBe(state.money);
    expect(next.equipment.length).toBe(state.equipment.length + 1);
    expect(g.equipFromStock(next, "lumber", "axe")).toBe(next);
    expect(() => applyCommand(state, { type: "tradeResource", args: ["wood", -1, "buy"] })).toThrow();
  });
  it("trades with balance and warehouse limits and survives save/load", () => {
    let state = ready("mill");
    const wheat = resource("Buğday");
    state = g.tradeResource(state, wheat, 3, "buy");
    expect(state.stock[wheat]).toBe(3);
    expect(g.tradeResource(state, wheat, 101, "buy")).toBe(state);
    expect(g.tradeResource(state, wheat, 4, "sell")).toBe(state);
    state = g.setProduction(state, "mill", "feed", 2);
    state = tick(g.loadGame(JSON.stringify(state)), 10);
    expect(state.stock.feed).toBe(2);
    expect(state.stock[wheat]).toBe(1);
  });
});
