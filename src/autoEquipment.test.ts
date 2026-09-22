import { describe, expect, it } from "vitest";
import * as g from "./game";

function staffed(id: string) {
  let state = g.purchaseSite({ ...g.emptyState(), money: 10000, laborEventIn: 99999 }, id);
  const site = g.siteDefinitions.find(s => s.id === id)!;
  state = g.assignJob(state, state.workers[0].id, site.job);
  for (const type of site.equipment) state.stock[g.equipmentResources[type]] = 5;
  return state;
}

describe("automatic equipment from stock", () => {
  it.each(g.siteDefinitions)("equips working staff at $name once without spending money or mutating input", site => {
    const state = staffed(site.id);
    const next = g.simulateTick(state);
    expect(next.money).toBe(state.money);
    for (const type of site.equipment.filter(t => t !== "feed")) {
      expect(next.stock[g.equipmentResources[type]]).toBe(4);
      expect(next.equipment.filter(e => e.siteId === site.id && e.type === type)).toHaveLength(1);
      expect(state.stock[g.equipmentResources[type]]).toBe(5);
    }
    expect(state.equipment).toHaveLength(0);
    const again = g.simulateTick(next);
    expect(again.equipmentSequence).toBe(next.equipmentSequence);
    expect(again.workers[0].unequippedTicks ?? 0).toBe(0);
  });

  it("replaces a broken tool from stock and keeps the remaining tools", () => {
    const initial = g.simulateTick(staffed("lumber"));
    const axe = initial.equipment.find(e => e.type === "axe")!;
    const gloves = initial.equipment.find(e => e.type === "gloves")!;
    const state = { ...initial, equipment: initial.equipment.map(e => e.id === axe.id ? { ...e, durability: 0 } : e) };
    const next = g.simulateTick(state);
    expect(next.stock[g.equipmentResources.axe]).toBe(3);
    expect(next.stock[g.equipmentResources.gloves]).toBe(4);
    expect(next.equipment.some(e => e.id === axe.id)).toBe(false);
    expect(next.equipment.some(e => e.id === gloves.id)).toBe(true);
    expect(next.equipment.find(e => e.type === "axe")?.durability).toBe(100);
  });

  it("limits allocation to crew size and available shared stock across sites", () => {
    let state = staffed("lumber");
    state = g.assignJob(state, state.workers[1].id, "wood");
    state = g.purchaseSite(state, "mine-7");
    state = g.assignJob(state, state.workers[2].id, "iron");
    state.stock[g.equipmentResources.gloves] = 2;
    const next = g.simulateTick(state);
    expect(next.equipment.filter(e => e.type === "axe")).toHaveLength(2);
    expect(next.equipment.filter(e => e.type === "gloves")).toHaveLength(2);
    expect(next.stock[g.equipmentResources.gloves]).toBe(0);
    expect(new Set(next.equipment.map(e => e.id)).size).toBe(next.equipment.length);
    expect(Object.values(next.stock).every(n => n >= 0)).toBe(true);
  });

  it("does not allocate tools to idle or sick workers, or while paused or outside work hours", () => {
    const state = staffed("lumber");
    const variants: g.GameState[] = [
      { ...state, workers: state.workers.map(w => ({ ...w, job: "idle" as const })) },
      { ...state, workers: state.workers.map(w => ({ ...w, illnessRemaining: 100 })) },
      { ...state, paused: true },
      { ...state, timeMode: undefined, minuteOfDay: g.WORK_END },
    ];
    for (const variant of variants) {
      const next = g.simulateTick(variant);
      expect(next.equipment).toHaveLength(0);
      expect(next.stock[g.equipmentResources.axe]).toBe(5);
    }
  });
});
