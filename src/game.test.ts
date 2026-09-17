import { describe, expect, it } from "vitest";
import { buildShelter, isHoused, shelterCost, warehouseResources, warehouseUpgradeCost, upgradeWarehouse, foodResources, foodStock, hireForJob, changeWorkers, assignJob, emptyState, levelInfo, simulateTick, hireWorker, hiringCost, fulfillOrder, loadGame, zeroStock } from "./game";

describe("işçi üretim döngüsü", () => {
  it("üretim stok oluşturur ama para kazandırmaz", () => {
    let state = assignJob(emptyState(), "w1", "wood");
    for (let i = 0; i < 5; i += 1) state = simulateTick(state);
    expect(state.stock.wood).toBe(1);
    expect(state.money).toBe(0);
  });
  it("ürün fiyatları seviye ile artar", () => {
    expect(levelInfo[1].price).toBe(1);
    expect(levelInfo[2].price).toBe(1.25);
    expect(levelInfo[3].price).toBe(1.5);
  });
});

const ordered = () => ({ ...emptyState(), order: { id: 1, needs: { ...zeroStock(), wood: 20, egg: 10, fruit: 3 }, reward: 74, remaining: 2, duration: 90 }, stock: { ...zeroStock(), wood: 20, egg: 10, fruit: 3 } });
describe("economy", () => {
  it("charges for each hire and rejects insufficient funds", () => {
    const initial = emptyState();
    expect(hireWorker(initial)).toBe(initial);
    const hired = hireWorker({ ...initial, money: 25 });
    expect(hired.workers).toHaveLength(4);
    expect(hired.money).toBe(0);
    expect(hired.selectedWorker).toBe(hired.workers[3].id);
    expect(hiringCost(hired)).toBe(40);
    expect(new Set(hired.workers.map(w => w.id)).size).toBe(4);
  });
  it("consumes supplies for idle workers too, and recovers from shortage", () => {
    const state = { ...emptyState(), level: 3 as const, consumptionIn: 1, stock: { ...zeroStock(), wood: 1, egg: 1, fruit: 2 } };
    const fed = simulateTick(state);
    expect(fed.stock).toEqual({ ...zeroStock(), wood: 1, egg: 0, fruit: 0 });
    expect(fed.shortage).toBe(false);
    const hungry = simulateTick({ ...fed, consumptionIn: 1 });
    expect(hungry.shortage).toBe(true);
    const working = simulateTick(assignJob(hungry, "w1", "wood"));
    expect(working.workers[0].progress).toBe(10);
    expect(simulateTick({ ...hungry, consumptionIn: 1, stock: state.stock }).shortage).toBe(false);
  });
  it("delivers early exactly once and pays the reward", () => {
    const state = ordered();
    const next = fulfillOrder(state);
    expect(next.stock).toEqual({ ...zeroStock(), wood: 0, egg: 0, fruit: 0 });
    expect(next.money).toBe(74);
    expect(next.order).toBeNull();
    expect(fulfillOrder(next)).toBe(next);
    expect(state.stock.wood).toBe(20);
  });
  it("waits until the deadline and automatically succeeds", () => {
    const first = simulateTick(ordered());
    expect(first.order?.remaining).toBe(1);
    expect(first.money).toBe(0);
    const next = simulateTick(first);
    expect(next.lastOrder?.success).toBe(true);
    expect(next.money).toBe(74);
  });
  it("rejects incomplete early delivery and fails without taking partial stock", () => {
    const state = { ...ordered(), stock: { ...zeroStock(), wood: 19, egg: 10, fruit: 3 } };
    expect(fulfillOrder(state)).toBe(state);
    const next = simulateTick(simulateTick(state));
    expect(next.lastOrder?.success).toBe(false);
    expect(next.stock).toEqual(state.stock);
    expect(next.money).toBe(-37);
  });
  it("consumption takes priority over an order expiring on the same tick", () => {
    const state = ordered();
    const next = simulateTick({ ...state, level: 3, consumptionIn: 1, order: { ...state.order, remaining: 1 } });
    expect(next.lastOrder?.success).toBe(false);
    expect(next.stock.wood).toBe(20);
    expect(next.stock.egg).toBe(7);
  });
  it("creates reproducible orders for unlocked resources and schedules the next", () => {
    const state = { ...emptyState(), seed: 123, orderIn: 1 };
    const next = simulateTick(state);
    expect(next.order).toEqual(simulateTick(state).order);
    expect(next.order?.needs.egg).toBe(0);
    expect(next.order?.needs.fruit).toBe(0);
    expect(next.order?.remaining).toBeGreaterThanOrEqual(60);
    let completed = fulfillOrder({ ...next, stock: { ...zeroStock(), wood: 100, egg: 0, fruit: 0 } });
    const delay = completed.orderIn;
    for (let i = 0; i < delay; i++) completed = simulateTick(completed);
    expect(completed.order?.id).toBe(2);
  });
  it("migrates old saves and preserves new timers across reload", () => {
    const old = { money: 41, level: 2, workers: emptyState().workers, stock: { ...zeroStock(), wood: 12, egg: 2, fruit: 0 }, ledger: [] };
    const next = loadGame(JSON.stringify(old));
    expect(next.money).toBe(41);
    expect(next.workers).toEqual(old.workers);
    expect(next.consumptionIn).toBe(30);
    const saved = simulateTick({ ...next, orderIn: 1 });
    expect(loadGame(JSON.stringify(saved)).order).toEqual(saved.order);
    expect(loadGame("broken").workers).toHaveLength(3);
  });
  it("does not allow assigning locked resources or relock a region after hiring", () => {
    const state = emptyState();
    expect(assignJob(state, "w1", "fruit")).toBe(state);
    expect(hireWorker({ ...state, level: 3, money: 60 }).level).toBe(3);
  });
});

describe("expanded regions and order progression", () => {
  it("charges exactly half once, keeps debt on reload and preserves unlocked regions", () => {
    const base = ordered();
    const state = { ...base, level: 6 as const, money: 2, stock: zeroStock(), order: { ...base.order, reward: 75, remaining: 1 } };
    const failed = simulateTick(state);
    expect(failed.money).toBe(-35.5);
    expect(failed.lastOrder?.penalty).toBe(37.5);
    expect(simulateTick(failed).money).toBe(-35.5);
    const loaded = loadGame(JSON.stringify(failed));
    expect(loaded.money).toBe(-35.5);
    expect(loaded.level).toBe(6);
    expect(loaded.lastOrder).toEqual(failed.lastOrder);
  });
  it("bounds quantity growth after success and failure and saves progression", () => {
    const first = simulateTick({ ...emptyState(), seed: 123, level: 6 as const, orderIn: 1, orderQuantities: { ...zeroStock(), wood: 10, egg: 10, fruit: 10, stone: 10, coal: 10, iron: 10 } });
    for (const success of [true, false]) {
      const resolved = success
        ? fulfillOrder({ ...first, stock: { ...first.order!.needs } })
        : simulateTick({ ...first, order: { ...first.order!, remaining: 1 } });
      const next = simulateTick({ ...loadGame(JSON.stringify(resolved)), orderIn: 1 });
      for (const resource of Object.keys(first.order!.needs) as (keyof typeof first.stock)[]) {
        if (next.order!.needs[resource] === 0) {
          expect(next.orderQuantities[resource]).toBe(first.orderQuantities[resource]);
          continue;
        }
        const growth = next.order!.needs[resource] - first.orderQuantities[resource];
        expect(growth).toBeGreaterThanOrEqual(0);
        expect(growth).toBeLessThanOrEqual(3);
      }
      expect(next.order!.reward).toBeGreaterThan(0);
    }
  });
  it("produces all new resources and prevents locked assignments", () => {
    for (const [job, level] of [["stone", 4, 2], ["coal", 5, 2.5], ["iron", 6, 3]] as const) {
      const base = emptyState();
      expect(assignJob(base, "w1", job)).toBe(base);
      let state = assignJob({ ...base, level }, "w1", job);
      for (let i = 0; i < 5; i++) state = simulateTick(state);
      expect(state.stock[job]).toBe(1);
      expect(state.money).toBe(0);
    }
    expect(simulateTick({ ...emptyState(), money: 550 }).level).toBe(6);
  });
  it("migrates a three-resource save including its active order", () => {
    const old = { ...emptyState(), version: 3, orderQuantities: undefined, stock: { wood: 20, egg: 10, fruit: 3 }, order: { id: 7, needs: { wood: 20, egg: 10, fruit: 3 }, reward: 74, remaining: 10, duration: 90 } };
    const loaded = loadGame(JSON.stringify(old));
    expect(loaded.stock.iron).toBe(0);
    expect(loaded.orderQuantities.wood).toBe(20);
    expect(fulfillOrder(loaded).money).toBe(74);
  });
});


it("supports 100 unique products, last-level production and bounded orders", () => {
  const initial = emptyState();
  expect(Object.keys(initial.stock)).toHaveLength(100);
  expect(levelInfo[100].job).toBe("product100");
  let state = assignJob({ ...initial, level: 100 }, "w1", "product100");
  for (let i = 0; i < 5; i++) state = simulateTick(state);
  expect(state.stock.product100).toBe(1);
  expect(loadGame(JSON.stringify(state)).stock.product100).toBe(1);
  const ordered = simulateTick({ ...state, orderIn: 1 });
  expect(Object.values(ordered.order!.needs).filter(n => n > 0).length).toBeGreaterThanOrEqual(1);
  expect(Object.values(ordered.order!.needs).filter(n => n > 0).length).toBeLessThanOrEqual(6);
});


it("randomly selects a nonempty subset of unlocked products", () => {
  const selections = new Set<string>();
  const counts = new Set<number>();
  for (const level of [1, 2, 6, 100]) {
    for (let seed = 1; seed <= 80; seed++) {
      const state = { ...emptyState(), level, seed: seed * 7919, orderIn: 1 };
      const next = simulateTick(state);
      const selected = Object.entries(next.order!.needs).filter(([, n]) => n > 0).map(([r]) => r);
      expect(selected.length).toBeGreaterThanOrEqual(1);
      expect(selected.length).toBeLessThanOrEqual(Math.min(6, Math.max(1, level - 1)));
      expect(selected.every(r => Array.from({ length: level }, (_, i) => levelInfo[i + 1].job).some(job => job === r))).toBe(true);
      expect(simulateTick(state).order).toEqual(next.order);
      if (level === 6) { selections.add(selected.join(",")); counts.add(selected.length); }
    }
  }
  expect(selections.size).toBeGreaterThan(10);
  expect(counts.size).toBe(3);
});


it("targets surplus and scarce stock while keeping pressure out of permanent progression", () => {
  const hits = { wood: 0, egg: 0, fruit: 0 };
  for (let seed = 1; seed <= 600; seed++) {
    const state = { ...emptyState(), level: 3, seed: seed * 7919, orderIn: 1,
      stock: { ...zeroStock(), wood: 100, egg: 40, fruit: 0 } };
    const next = simulateTick(state);
    for (const resource of ["wood", "egg", "fruit"] as const) {
      const quantity = next.order!.needs[resource];
      if (!quantity) continue;
      hits[resource]++;
      if (resource === "wood") {
        expect(quantity).toBe(60);
        expect(next.orderQuantities.wood).toBeLessThanOrEqual(24);
      } else if (resource === "fruit") {
        expect(quantity - next.orderQuantities.fruit).toBeGreaterThanOrEqual(2);
        expect(quantity - next.orderQuantities.fruit).toBeLessThanOrEqual(4);
      } else expect(quantity).toBe(next.orderQuantities.egg);
    }
    expect(loadGame(JSON.stringify(next)).order).toEqual(next.order);
    expect(simulateTick(state).order).toEqual(next.order);
  }
  expect(hits.wood).toBeGreaterThan(hits.fruit);
  expect(hits.fruit).toBeGreaterThan(hits.egg);
});


describe("labor events", () => {
  const event = (strike: boolean) => {
    for (let seed = 1; seed < 1000; seed++) {
      const base = emptyState();
      const state = simulateTick({ ...base, seed, laborEventIn: 1, orderIn: 9999,
        workers: base.workers.map(w => ({ ...w, job: "wood" as const })) });
      if (strike ? state.workers.some(w => w.strikeRemaining) : state.workers.length < 3) return state;
    }
    throw new Error("Expected event not found");
  };
  it("removes resigning employees, reports the site and charges for replacements", () => {
    const state = event(false);
    expect(state.workers.length).toBeGreaterThanOrEqual(1);
    expect(state.workers.length).toBeLessThan(3);
    expect(state.laborNotices[0].text).toContain("Kayıp Orman");
    expect(state.laborNotices[0].text).toContain("istifa etti");
    expect(state.laborEventIn).toBeGreaterThanOrEqual(240);
    expect(state.laborEventIn).toBeLessThanOrEqual(480);
    expect(hireForJob(state, "wood")).toBe(state);
    const funded = { ...state, money: 100 };
    const hired = hireForJob(funded, "wood");
    expect(hired.money).toBe(100 - hiringCost(funded));
    expect(hired.workers).toHaveLength(state.workers.length + 1);
    expect(hired.workers[hired.workers.length - 1]?.job).toBe("wood");
    expect(new Set(hired.workers.map(w => w.id)).size).toBe(hired.workers.length);
    expect(loadGame(JSON.stringify(state)).workers).toEqual(state.workers);
  });
  it("pauses strikers for 600 ticks, prevents reassignment and lets paid replacements work", () => {
    const state = event(true);
    expect(state.workers.every(w => w.strikeRemaining === 600)).toBe(true);
    expect(state.laborNotices[0].text).toContain("10 dakikalık greve");
    expect(assignJob(state, state.workers[0].id, "idle")).toBe(state);
    expect(changeWorkers(state, "wood", -1)).toBe(state);
    const hired = hireForJob({ ...state, shelterCapacity: 6, money: 100 }, "wood");
    let next = { ...hired, warehouseCapacity: { ...hired.warehouseCapacity, wood: 1000 }, laborEventIn: 9999, consumptionIn: 9999, orderIn: 9999 };
    for (let i = 0; i < 5; i++) next = simulateTick(next);
    expect(next.stock.wood).toBe(1);
    expect(next.workers[0].strikeRemaining).toBe(595);
    const loaded = loadGame(JSON.stringify(next));
    expect(loaded.laborNotices).toEqual(next.laborNotices);
    expect(loaded.workers[0].strikeRemaining).toBe(595);
    expect(loaded.laborEventIn).toBe(next.laborEventIn);
    for (let i = 0; i < 595; i++) next = simulateTick(next);
    expect(next.workers.every(w => !w.strikeRemaining)).toBe(true);
    expect(next.laborNotices[0].text).toContain("grev bitti");
    expect(next.workers[0].progress).toBe(state.workers[0].progress);
    expect(simulateTick(next).workers[0].progress).toBe(state.workers[0].progress + 20);
  });
  it("migrates saves without labor data and avoids events at empty sites", () => {
    const base = emptyState();
    const loaded = loadGame(JSON.stringify({ ...base, laborEventIn: undefined, laborSequence: undefined, laborNotices: undefined }));
    expect(loaded.laborNotices).toEqual([]);
    expect(loaded.laborEventIn).toBeGreaterThanOrEqual(240);
    const next = simulateTick({ ...loaded, laborEventIn: 1 });
    expect(next.workers).toEqual(base.workers);
    expect(next.laborNotices).toEqual([]);
  });
});


it("consumes every food category product without consuming wood or industrial stock", () => {
  expect(foodResources).toContain("product14");
  expect(foodResources).not.toContain("wood");
  expect(foodResources).not.toContain("iron");
  for (const resource of foodResources) {
    const state = { ...emptyState(), level: 100, consumptionIn: 1,
      stock: { ...zeroStock(), wood: 50, iron: 50, [resource]: 3 } };
    const next = simulateTick(state);
    expect(next.stock[resource]).toBe(0);
    expect(next.stock.wood).toBe(50);
    expect(next.stock.iron).toBe(50);
    expect(next.shortage).toBe(false);
    expect(foodStock(next)).toBe(0);
  }
  const hungry = simulateTick({ ...emptyState(), level: 2, consumptionIn: 1, stock: { ...zeroStock(), wood: 100 } });
  expect(hungry.stock.wood).toBe(100);
  expect(hungry.shortage).toBe(true);
  expect(simulateTick({ ...emptyState(), consumptionIn: 1 }).shortage).toBe(false);
});

it("combines food stocks and consumes the most plentiful food first", () => {
  const state = { ...emptyState(), level: 14, consumptionIn: 1,
    stock: { ...zeroStock(), egg: 1, fruit: 1, product14: 5 } };
  const next = simulateTick(state);
  expect(next.stock.egg).toBe(1);
  expect(next.stock.fruit).toBe(1);
  expect(next.stock.product14).toBe(2);
  expect(foodStock(next)).toBe(4);
  const mixed = simulateTick({ ...state, stock: { ...zeroStock(), egg: 1, fruit: 1, product14: 1 } });
  expect(foodStock(mixed)).toBe(0);
  expect(mixed.shortage).toBe(false);
});

describe("warehouse capacity", () => {
  it("caps simultaneous production and resumes after an upgrade", () => {
    const base = emptyState();
    const state = { ...base, money: 100, stock: { ...base.stock, wood: 99 },
      workers: base.workers.map(w => ({ ...w, job: "wood" as const, progress: 80 })) };
    const full = simulateTick(state);
    expect(full.stock.wood).toBe(100);
    expect(full.money).toBe(100);
    const paused = simulateTick(full);
    expect(paused.stock.wood).toBe(100);
    expect(paused.money).toBe(100);
    const upgraded = upgradeWarehouse(paused, "wood");
    expect(upgraded.money).toBe(0);
    expect(upgraded.warehouseCapacity.wood).toBe(200);
    expect(upgraded.warehouseCapacity.egg).toBe(100);
    expect(warehouseUpgradeCost(upgraded, "wood")).toBe(200);
    expect(simulateTick(upgraded).stock.wood).toBe(102);
    expect(upgradeWarehouse(upgraded, "wood")).toBe(upgraded);
    expect(upgradeWarehouse({ ...base, money: 1000 }, "egg")).toEqual({ ...base, money: 1000 });
  });
  it("sorts by fill ratio and preserves upgrades and legacy stock", () => {
    const base = emptyState();
    expect(Object.values(base.warehouseCapacity)).toEqual(Array(100).fill(100));
    const state = { ...base, level: 3, stock: { ...base.stock, wood: 150, egg: 90, fruit: 100 },
      warehouseCapacity: { ...base.warehouseCapacity, wood: 200 } };
    expect(warehouseResources(state)).toEqual(["fruit", "egg", "wood"]);
    expect(loadGame(JSON.stringify(state)).warehouseCapacity).toEqual(state.warehouseCapacity);
    const legacy = loadGame(JSON.stringify({ ...state, warehouseCapacity: undefined }));
    expect(legacy.stock.wood).toBe(150);
    expect(legacy.warehouseCapacity.wood).toBe(100);
    expect(loadGame(JSON.stringify({ ...state, warehouseCapacity: { wood: -10, egg: null } })).warehouseCapacity.wood).toBe(100);
  });
});


describe("worker housing", () => {
  it("blocks unhoused assignments and production until shelter is built", () => {
    const base = { ...emptyState(), money: 100 };
    const hired = hireWorker(base);
    const id = hired.workers[3].id;
    expect(isHoused(hired, id)).toBe(false);
    expect(assignJob(hired, id, "wood")).toBe(hired);
    expect(hireForJob(base, "wood")).toBe(base);
    const assigned = { ...hired, workers: hired.workers.map(w => w.id === id ? { ...w, job: "wood" as const, progress: 80 } : w) };
    const paused = simulateTick(assigned);
    expect(paused.stock.wood).toBe(0);
    expect(paused.money).toBe(hired.money);
    expect(paused.workers[3].progress).toBe(80);
    const housed = buildShelter(paused);
    expect(housed.shelterCapacity).toBe(6);
    expect(housed.money).toBe(paused.money - 30);
    expect(shelterCost(housed)).toBe(60);
    expect(simulateTick(housed).stock.wood).toBe(1);
    expect(assignJob(buildShelter(hired), id, "wood").workers[3].job).toBe("wood");
    expect(buildShelter(emptyState()).shelterCapacity).toBe(3);
  });
  it("keeps beds occupied during strikes, reuses vacated beds and migrates saves", () => {
    const hired = hireWorker({ ...emptyState(), money: 25 });
    const strike = { ...hired, workers: hired.workers.map(w => ({ ...w, strikeRemaining: 600 })) };
    expect(isHoused(strike, strike.workers[3].id)).toBe(false);
    expect(isHoused({ ...hired, workers: hired.workers.slice(1) }, hired.workers[3].id)).toBe(true);
    expect(loadGame(JSON.stringify(hired)).shelterCapacity).toBe(3);
    const legacy = loadGame(JSON.stringify({ ...hired, shelterCapacity: undefined }));
    expect(legacy.shelterCapacity).toBe(6);
    expect(legacy.workers).toEqual(hired.workers);
    expect(loadGame(JSON.stringify({ ...hired, shelterCapacity: -1 })).shelterCapacity).toBe(3);
  });
});


describe("order-only income and balance", () => {
  it("starts from zero cash and earns the first unlock solely through an order", () => {
    for (let seed = 1; seed <= 40; seed++) {
      let state = emptyState();
      state = { ...state, seed, workers: state.workers.map(w => ({ ...w, job: "wood" as const })) };
      for (let i = 0; i < 14; i++) state = simulateTick(state);
      expect(state.order).toBeNull();
      expect(state.money).toBe(0);
      state = simulateTick(state);
      expect(state.order).not.toBeNull();
      while (state.stock.wood < state.order!.needs.wood) state = simulateTick(state);
      expect(state.money).toBe(0);
      const delivered = fulfillOrder(state);
      expect(delivered.money).toBe(state.order!.reward);
      expect(delivered.level).toBeGreaterThanOrEqual(2);
      expect(delivered.orderIn).toBeGreaterThanOrEqual(15);
      expect(delivered.orderIn).toBeLessThanOrEqual(25);
    }
  });
  it("stops only full products, resumes after delivery and never pays for production", () => {
    const base = emptyState();
    let state: ReturnType<typeof emptyState> = { ...base, level: 2, consumptionIn: 9999, laborEventIn: 9999, orderIn: 9999,
      stock: { ...base.stock, wood: 100 }, workers: base.workers.map((w, i) => ({ ...w, job: i === 0 ? "wood" as const : "egg" as const, progress: 80 })) };
    state = simulateTick(state);
    expect(state.money).toBe(0);
    expect(state.stock.wood).toBe(100);
    expect(state.stock.egg).toBe(2);
    expect(state.workers[0].progress).toBe(80);
    const delivered = fulfillOrder({ ...state, order: { id: 1, needs: { ...zeroStock(), wood: 10 }, reward: 20, duration: 60, remaining: 60 } });
    expect(delivered.stock.wood).toBe(90);
    const resumed = simulateTick(delivered);
    expect(resumed.stock.wood).toBe(91);
    expect(resumed.money).toBe(20);
  });
  it("bounds late-game orders by crew and storage even with legacy oversized quantities", () => {
    for (const level of [1, 6, 100]) {
      for (let seed = 1; seed <= 40; seed++) {
        const base = emptyState();
        const state = simulateTick({ ...base, level, seed: seed * 7919, orderIn: 1, orderSequence: 10000,
          orderQuantities: { ...zeroStock(), ...Object.fromEntries(Object.keys(base.stock).map(r => [r, 10000])) },
          stock: { ...zeroStock(), ...Object.fromEntries(Object.keys(base.stock).map(r => [r, 1000])) } });
        const requested = Object.values(state.order!.needs).filter(n => n > 0);
        expect(requested.length).toBeLessThanOrEqual(3);
        expect(Math.max(...requested)).toBeLessThanOrEqual(100);
        expect(state.order!.duration).toBeLessThanOrEqual(240);
        expect(Math.max(...Object.values(state.orderQuantities).filter(n => n < 10000))).toBeLessThanOrEqual(24);
      }
    }
  });
  it("preserves legacy cash and active contracts while shortening the next wait", () => {
    const base = ordered();
    const loaded = loadGame(JSON.stringify({ ...base, version: 8, money: 123, orderIn: 75 }));
    expect(loaded.money).toBe(123);
    expect(loaded.stock).toEqual(base.stock);
    expect(loaded.order).toEqual(base.order);
    expect(loaded.orderIn).toBe(25);
    expect(loadGame(JSON.stringify({ ...loaded, orderIn: 17 })).orderIn).toBe(17);
  });
});


it("sustains repeated order income with the starter crew and food consumption", () => {
  for (let seed = 1; seed <= 10; seed++) {
    let state = { ...emptyState(), seed: seed * 7919, laborEventIn: 9999 };
    let delivered = 0;
    let earned = 0;
    // Ten minutes, no hiring or free money. Reassign the crew to food and current demand.
    for (let tick = 0; tick < 600; tick++) {
      const wanted = state.order
        ? Object.entries(state.order.needs).filter(([r, n]) => state.stock[r as keyof typeof state.stock] < n).map(([r]) => r as keyof typeof state.stock)
        : ["wood" as const];
      const feed = state.level >= 2 && foodStock(state) < 12;
      state.workers.forEach((w, i) => {
        const job = feed && i === 0 ? "egg" : wanted[(feed ? Math.max(0, i - 1) : i) % wanted.length] ?? "wood";
        if (w.job !== job) state = assignJob(state, w.id, job);
      });
      state = simulateTick(state);
      const next = fulfillOrder(state);
      if (next !== state) { delivered++; earned += state.order!.reward; }
      state = next;
    }
    expect(delivered).toBeGreaterThanOrEqual(5);
    expect(state.money).toBeGreaterThan(0);
    expect(state.money).toBeLessThanOrEqual(earned);
  }
});
