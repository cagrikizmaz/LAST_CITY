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
  it.each(g.siteDefinitions.filter(s => s.category === "mine"))("$name ignores exhausted reserves in saved games", (definition) => {
    let state = ready(definition.id);
    state.sites[definition.id].extracted = 99999;
    state = g.loadGame(JSON.stringify(state));
    expect(definition.finite).toBe(false);
    expect(tick(state, 10).stock[definition.job]).toBeGreaterThan(0);
  });
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

describe("manager production planning", () => {
  const open = (...ids: string[]) => ids.reduce((s, id) => g.purchaseSite(s, id), { ...g.emptyState(), money: 100000 });
  it("queues intermediate products and reuses stock and pending work without duplication", () => {
    let state = open("smith", "furnace", "carpenter", "lumber");
    const axe = g.equipmentResources.axe;
    const pigIron = resource("Hamdemir"), timber = resource("Kereste");
    state.stock[pigIron] = 1;
    state = g.setProduction(state, "furnace", pigIron, 1);
    const next = applyCommand(state, { type: "queueProductionChain", args: [axe, 2] });
    expect(g.productionRemaining(next.sites.smith, axe)).toBe(2);
    expect(g.productionRemaining(next.sites.furnace, pigIron)).toBe(1);
    expect(g.productionRemaining(next.sites.carpenter, timber)).toBe(2);
    expect(next.sites.lumber.queue).toEqual([]);
    expect(next.money).toBe(state.money);
    expect(next.stock).toEqual(state.stock);
    expect(g.queueProductionChain(next, axe, 2)).toBe(next);
  });
  it("reserves shared ingredients for other queued products", () => {
    let state = open("smith", "furnace", "carpenter");
    const pigIron = resource("Hamdemir");
    state.stock[pigIron] = 1;
    state = g.setProduction(state, "smith", resource("Kazma"), 2);
    state = g.queueProductionChain(state, g.equipmentResources.axe, 1);
    expect(g.productionRemaining(state.sites.furnace, pigIron)).toBe(4);
    expect(g.productionRemaining(state.sites.carpenter, resource("Kereste"))).toBe(3);
  });
  it("fills missing dependencies of existing orders even when the final output is already queued", () => {
    let state = open("smith", "furnace", "carpenter");
    state = g.setProduction(state, "smith", g.equipmentResources.axe, 1);
    state = g.queueProductionChain(state, g.equipmentResources.axe, 1);
    expect(g.productionRemaining(state.sites.smith, g.equipmentResources.axe)).toBe(1);
    expect(g.productionRemaining(state.sites.furnace, resource("Hamdemir"))).toBe(1);
  });
  it("reports unopened producers and capacity limits without opening or purchasing them", () => {
    const state = open("smith");
    const plan = g.planProductionChain(state, g.equipmentResources.axe, 1000000);
    expect(plan.state.sites.smith.queue.reduce((n, q) => n + q.remaining, 0)).toBe(g.productionCapacity(state.sites.smith));
    expect(plan.waiting.length).toBeGreaterThan(1);
    expect(Object.keys(plan.state.sites)).toEqual(Object.keys(state.sites));
    expect(plan.state.money).toBe(state.money);
    expect(() => applyCommand(state, { type: "queueProductionChain", args: [g.equipmentResources.axe, -1] })).toThrow();
  });
});

it("completes a multi-stage manager order using open workshops", () => {
  let state = { ...g.emptyState(), money: 100000, laborEventIn: 99999 };
  for (const [index, id] of ["carpenter", "smith", "furnace"].entries()) {
    state = g.purchaseSite(state, id);
    state = g.buyEquipment(state, id, "gloves");
    state = g.assignJob(state, state.workers[index].id, g.siteDefinitions.find(s => s.id === id)!.job);
  }
  state.stock.wood = 8;
  state.stock.iron = 4;
  state.stock.coal = 2;
  const furniture = resource("Mobilya");
  state = g.queueProductionChain(state, furniture, 1);
  expect(g.productionRemaining(state.sites.carpenter, resource("Kereste"))).toBe(4);
  expect(g.productionRemaining(state.sites.smith, resource("\u00c7ivi"))).toBe(2);
  expect(g.productionRemaining(state.sites.furnace, resource("Hamdemir"))).toBe(2);
  state = tick(g.loadGame(JSON.stringify(state)), 80);
  expect(state.stock[furniture]).toBe(1);
  expect(g.productionRemaining(state.sites.carpenter, furniture)).toBe(0);
});
