import { describe, expect, it } from "vitest";
import * as g from "./game";
const resource = (name: string) =>
  g.resources.find((r) => g.resourceNames[r] === name)!;
function ready(id = "lumber", crew = 1): g.GameState {
  let state = g.purchaseSite(
    { ...g.emptyState(), money: 10000, orderIn: 99999, laborEventIn: 99999 },
    id,
  );
  const def = g.siteDefinitions.find((s) => s.id === id)!;
  for (let i = 0; i < crew; i++) {
    for (const type of def.equipment) state = g.buyEquipment(state, id, type);
    state = g.assignJob(state, state.workers[i].id, def.job);
  }
  return state;
}
const ticks = (state: g.GameState, count = 5) => {
  for (let i = 0; i < count; i++) state = g.simulateTick(state);
  return state;
};
describe("categories and purchases", () => {
  it("starts with capital and no free sites or automatic unlocks", () => {
    const state = g.emptyState();
    expect(state.money).toBe(250);
    expect(state.sites).toEqual({});
    expect(g.simulateTick({ ...state, money: 1000000 }).sites).toEqual({});
    expect(ticks(state, 20).order).toBeNull();
    expect(g.assignJob(state, "w1", "wood")).toBe(state);
  });
  it("has the requested sites and categories", () => {
    expect(g.categories.map((c) => c.name)).toEqual([
      "Hastane",
      "Orman",
      "Tarım",
      "Hayvancılık",
      "Maden",
    ]);
    expect(g.siteDefinitions.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "Oduncu",
        "Avcı",
        "Tarla",
        "Bahçe",
        "İnek Ahırı",
        "Kümes",
        "Koyun Ağılı",
        "Kömür Madeni",
        "Bakır Madeni",
        "Kil Madeni",
        "Kum Madeni",
        "Altın Madeni",
        "Gümüş Madeni",
      ]),
    );
  });
  it("deducts money and doubles price globally, rejecting repeat or unaffordable purchases", () => {
    let state = { ...g.emptyState(), money: 700 };
    for (const [id, cost] of [
      ["coop", 100],
      ["lumber", 200],
      ["field", 400],
    ] as const) {
      expect(g.sitePurchaseCost(state)).toBe(cost);
      const before = state.money;
      state = g.purchaseSite(state, id);
      expect(state.money).toBe(before - cost);
      expect(g.purchaseSite(state, id)).toBe(state);
    }
    expect(g.sitePurchaseCost(state)).toBe(800);
    expect(g.purchaseSite(state, "barn")).toBe(state);
    expect(g.purchaseSite(state, "invalid")).toBe(state);
  });
});
describe("equipment and workers", () => {
  it("groups matching levels and displayed durability without mixing sites or types", () => {
    const item = ready().equipment[0];
    const items = [
      item,
      { ...item, id: 10, durability: 99.5 },
      { ...item, id: 11, durability: 99 },
      { ...item, id: 12, level: 2 },
      { ...item, id: 13, siteId: "hunter" },
      { ...item, id: 14, type: "gloves" as const },
    ];
    const groups = g.groupEquipment(items);
    expect(groups).toHaveLength(5);
    expect(groups.find((group) => group.includes(item))).toHaveLength(2);
  });
  it("upgrades only affordable group members once and restores their durability", () => {
    let state = ready();
    for (let i = 0; i < 4; i++) state = g.buyEquipment(state, "lumber", "axe");
    state = {
      ...state,
      equipment: state.equipment.map((e) => ({ ...e, durability: 50 })),
    };
    const ids = state.equipment
      .filter((e) => e.type === "axe")
      .map((e) => e.id);
    const cost = g.equipmentTypes.axe.price;
    state = { ...state, money: cost * 4 + cost / 2 };
    const next = g.upgradeEquipmentGroup(state, [...ids, ids[0]]);
    expect(next.money).toBe(cost / 2);
    expect(next.equipment.filter((e) => e.level === 2)).toHaveLength(4);
    expect(
      next.equipment
        .filter((e) => e.level === 2)
        .every((e) => e.durability === 100),
    ).toBe(true);
    expect(next.equipment.find((e) => e.id === ids[4])).toMatchObject({
      level: 1,
      durability: 50,
    });
    expect(next.equipment.find((e) => e.type === "gloves")).toMatchObject({
      level: 1,
      durability: 50,
    });
    expect(g.upgradeEquipmentGroup(next, [ids[4]])).toBe(next);
    const all = g.upgradeEquipmentGroup({ ...state, money: cost * 5 }, ids);
    expect(all.money).toBe(0);
    expect(all.equipment.filter((e) => e.level === 2)).toHaveLength(5);
    expect(state.equipment.every((e) => e.level === 1)).toBe(true);
  });
  it("assigns workers before equipment arrives and waits for a complete kit to produce", () => {
    let state = g.purchaseSite(g.emptyState(), "lumber");
    state = g.changeWorkers(state, "wood", 1);
    expect(state.workers[0].job).toBe("wood");
    expect(ticks(state).stock.wood).toBe(0);
    state = g.buyEquipment(state, "lumber", "axe");
    expect(ticks(state).stock.wood).toBe(0);
    state = g.buyEquipment(state, "lumber", "gloves");
    expect(ticks(state).stock.wood).toBe(1);
    state = g.changeWorkers(state, "wood", 1);
    expect(state.workers.filter((w) => w.job === "wood")).toHaveLength(2);
    expect(g.managerRequests(state, "forest").map((r) => r.count)).toEqual([
      1, 1,
    ]);
    expect(ticks(state).stock.wood).toBe(1);
    const full = ready("lumber", 3);
    expect(g.canAssign(full, "wood")).toBe(false);
    expect(g.changeWorkers(full, "wood", 1)).toBe(full);
  });
  it("produces stock, never money, and wears only used equipment", () => {
    let state = ready();
    state = g.buyEquipment(state, "lumber", "axe");
    const next = ticks(state);
    expect(next.stock.wood).toBe(1);
    expect(next.money).toBe(state.money);
    expect(next.equipment.map((e) => e.durability)).toEqual([99, 99, 100]);
    expect(state.equipment.every((e) => e.durability === 100)).toBe(true);
  });
  it("stops after a tool breaks, asks for replacements and resumes with a new tool", () => {
    let state = ready();
    state = {
      ...state,
      equipment: state.equipment.map((e) => ({
        ...e,
        durability: e.type === "axe" ? 1 : 100,
      })),
    };
    const brokenId = state.equipment.find((e) => e.type === "axe")!.id;
    state = ticks(state, 10);
    expect(state.stock.wood).toBe(1);
    expect(g.managerRequests(state, "forest")[0].type).toBe("axe");
    expect(state.equipment.some((e) => e.id === brokenId)).toBe(false);
    expect(state.equipment).toHaveLength(1);
    expect(state.equipment[0]).toMatchObject({
      type: "gloves",
      durability: 99,
    });
    expect(g.upgradeEquipment(state, brokenId)).toBe(state);
    expect(ticks(g.buyEquipment(state, "lumber", "axe")).stock.wood).toBe(2);
  });
  it("charges for upgrades and restores durability only before breakage", () => {
    const state = ticks(ready());
    const item = state.equipment[0];
    const next = g.upgradeEquipment(state, item.id);
    expect(next.equipment[0]).toMatchObject({ level: 2, durability: 100 });
    expect(next.money).toBe(state.money - g.equipmentUpgradeCost(item));
    expect(
      g.upgradeEquipment({ ...state, money: 0 }, item.id).equipment,
    ).toEqual(state.equipment);
    expect(g.buyEquipment(state, "lumber", "helmet")).toBe(state);
  });
  it("improves speed and wear with an upgraded complete set", () => {
    let state = ready();
    for (const item of state.equipment)
      state = g.upgradeEquipment(state, item.id);
    const next = ticks(state, 4);
    expect(next.stock.wood).toBe(1);
    expect(next.equipment[0].durability).toBe(99.5);
  });
  it("does not share one kit among multiple workers in the same tick", () => {
    let state = ready("lumber", 2);
    state = { ...state, equipment: state.equipment.slice(0, 2) };
    expect(ticks(state).stock.wood).toBe(1);
  });
  it("hires directly to an unequipped site and charges the hiring cost", () => {
    let state = g.buildShelter(
      g.purchaseSite({ ...g.emptyState(), money: 1000 }, "lumber"),
    );
    state = g.upgradeSite(state, "lumber");
    for (const worker of state.workers)
      state = g.assignJob(state, worker.id, "wood");
    const next = g.hireForJob(state, "wood");
    expect(next.workers).toHaveLength(state.workers.length + 1);
    expect(next.workers[next.workers.length - 1].job).toBe("wood");
    expect(next.money).toBe(state.money - g.hiringCost(state));
    expect(ticks(next).stock.wood).toBe(0);
  });
});
describe("site and warehouse limits", () => {
  it("stops exactly at the finite reserve with simultaneous workers; upgrade replenishes", () => {
    let state = ready("lumber", 3);
    state = {
      ...state,
      sites: { lumber: { ...state.sites.lumber, extracted: 99 } },
    };
    state = ticks(state);
    expect(state.stock.wood).toBe(1);
    expect(state.sites.lumber.extracted).toBe(100);
    expect(ticks(state).stock.wood).toBe(1);
    const next = g.upgradeSite(state, "lumber");
    expect(next.money).toBe(state.money - 50);
    expect(g.workerCapacity(next.sites.lumber)).toBe(6);
    expect(g.productionCapacity(next.sites.lumber)).toBe(200);
    expect(next.sites.lumber.extracted).toBe(0);
    expect(ticks(next).stock.wood).toBeGreaterThan(1);
  });
  it("caps warehouse with concurrent production and resumes after a paid upgrade", () => {
    let state = ready("coop", 3);
    state = { ...state, stock: { ...state.stock, egg: 99 } };
    state = ticks(state, 10);
    expect(state.stock.egg).toBe(100);
    expect(
      g.productionStatus(
        state,
        g.siteDefinitions.find((s) => s.id === "coop")!,
      ),
    ).toBe("Depo dolu");
    const upgraded = g.upgradeWarehouse(state, "egg");
    expect(upgraded.money).toBe(state.money - 100);
    expect(upgraded.warehouseCapacity.egg).toBe(200);
    expect(ticks(upgraded).stock.egg).toBeGreaterThan(100);
    expect(upgraded.sites.coop.extracted).toBe(0);
  });
  it("rejects warehouse and site upgrades for unowned or unaffordable sites", () => {
    const state = { ...ready(), money: 0 };
    expect(g.upgradeSite(state, "lumber")).toBe(state);
    expect(g.upgradeWarehouse(state, "wood")).toBe(state);
    expect(
      g.upgradeWarehouse(g.emptyState(), "egg").warehouseCapacity.egg,
    ).toBe(100);
  });
});
describe("requested production", () => {
  it("produces milk continuously without instructions", () => {
    const state = ready("barn");
    const next = ticks(state, 20);
    expect(next.stock[resource("Süt")]).toBe(4);
    expect(next.stock[resource("Kaymak")]).toBe(0);
    expect(next.sites.barn.queue).toEqual([]);
  });
  it("processes every requested product concurrently with exact ingredients", () => {
    let state = ready("barn");
    const milk = resource("Süt"),
      cream = resource("Kaymak"),
      butter = resource("Tereyağı"),
      cheese = resource("Peynir");
    state = { ...state, stock: { ...state.stock, [milk]: 20, [butter]: 1 } };
    for (const [r, qty] of [
      [cream, 1],
      [butter, 1],
      [cheese, 1],
    ] as const)
      state = g.requestProduction(state, "barn", r, qty);
    const partial = ticks(state, 2);
    for (const r of [milk, cream, butter, cheese])
      expect(partial.sites.barn.productProgress?.[r]).toBe(40);
    const next = ticks(partial, 3);
    expect(next.stock[milk]).toBe(14);
    expect(next.stock[cream]).toBe(1);
    expect(next.stock[butter]).toBe(1);
    expect(next.stock[cheese]).toBe(1);
    expect(next.sites.barn.queue).toEqual([]);
    expect(next.money).toBe(state.money);
  });
  it("only blocks the product missing ingredients, while automatic production continues", () => {
    let state = g.requestProduction(
      ready("barn"),
      "barn",
      resource("Peynir"),
      1,
    );
    const next = ticks(state, 10);
    expect(next.stock[resource("Süt")]).toBe(2);
    expect(next.stock[resource("Peynir")]).toBe(0);
    expect(next.equipment[0].durability).toBe(98);
    expect(
      g.productProductionStatus(
        next,
        g.siteDefinitions.find((s) => s.id === "barn")!,
        g.siteDefinitions
          .find((s) => s.id === "barn")!
          .recipes.find((r) => r.output === resource("Peynir"))!,
      ),
    ).toBe("Hammadde bekliyor");
    state = g.cancelProduction(next, "barn", 0);
    expect(state.sites.barn.queue).toEqual([]);
  });
  it("produces wool, sheep milk and sheep cheese", () => {
    let state = ready("sheep");
    for (const [name, qty] of [
      ["Yün", 1],
      ["Koyun sütü", 2],
      ["Koyun peyniri", 1],
    ] as const)
      state = g.requestProduction(state, "sheep", resource(name), qty);
    const next = ticks(state, 20);
    expect(next.stock[resource("Yün")]).toBe(4);
    expect(next.stock[resource("Koyun sütü")]).toBe(2);
    expect(next.stock[resource("Koyun peyniri")]).toBe(1);
  });
  it("rejects invalid recipes, quantities, excessive queues and prevents ingredient overdraft", () => {
    let state = ready("barn", 3);
    for (const n of [0, -1, 0.5, NaN, 101])
      expect(g.requestProduction(state, "barn", resource("Kaymak"), n)).toBe(
        state,
      );
    expect(g.requestProduction(state, "barn", "wood")).toBe(state);
    state = { ...state, stock: { ...state.stock, [resource("Süt")]: 2 } };
    state = g.requestProduction(state, "barn", resource("Kaymak"), 3);
    const next = ticks(state, 2);
    expect(next.stock[resource("Kaymak")]).toBe(1);
    expect(next.stock[resource("Süt")]).toBe(1);
    expect(next.sites.barn.queue[0].remaining).toBe(2);
  });
  it("does not consume ingredients when the output depot is full", () => {
    const base = g.requestProduction(
      ready("barn"),
      "barn",
      resource("Kaymak"),
      1,
    );
    const state = {
      ...base,
      stock: { ...base.stock, [resource("Kaymak")]: 100, [resource("Süt")]: 2 },
    };
    const next = ticks(state);
    expect(next.stock[resource("Kaymak")]).toBe(100);
    expect(next.stock[resource("Süt")]).toBe(3);
    expect(g.productionRemaining(next.sites.barn, resource("Kaymak"))).toBe(1);
  });
});
describe("economy, clock and labor regression", () => {
  it("creates reproducible orders only for purchased sites and never unlocks on delivery", () => {
    const state = { ...ready("coop"), orderIn: 1, seed: 123 };
    const next = g.simulateTick(state);
    expect(next.order).toEqual(g.simulateTick(state).order);
    expect(g.resources.filter((r) => next.order!.needs[r] > 0)).toEqual([
      "egg",
    ]);
    const filled = { ...next, stock: { ...next.stock, egg: 100 } };
    const delivered = g.fulfillOrder(filled);
    expect(delivered.money).toBe(filled.money + filled.order!.reward);
    expect(delivered.sites).toEqual(filled.sites);
    expect(g.fulfillOrder(delivered)).toBe(delivered);
  });
  it.each([true, false])(
    "settles orders exactly once at deadline (enough stock %s)",
    (enough) => {
      const state = {
        ...ready(),
        stock: { ...g.zeroStock(), wood: enough ? 10 : 0 },
        order: {
          id: 1,
          needs: { ...g.zeroStock(), wood: 10 },
          reward: 20,
          remaining: 1,
          duration: 60,
        },
      };
      const next = g.simulateTick(state);
      expect(next.money).toBe(state.money + (enough ? 20 : -10));
      expect(next.order).toBeNull();
      expect(g.fulfillOrder(next)).toBe(next);
    },
  );
  it("preserves pause and working hour boundaries", () => {
    const state = ready();
    const paused = { ...state, paused: true };
    expect(g.simulateTick(paused)).toBe(paused);
    expect(
      g.simulateTick({ ...state, minuteOfDay: 479 }).workers[0].progress,
    ).toBe(0);
    expect(
      g.simulateTick({ ...state, minuteOfDay: 480 }).workers[0].progress,
    ).toBe(20);
    expect(
      g.simulateTick({ ...state, minuteOfDay: 1199 }).workers[0].progress,
    ).toBe(20);
    expect(
      g.simulateTick({ ...state, minuteOfDay: 1200 }).workers[0].progress,
    ).toBe(0);
  });
  it("charges daily wages once at midnight and when skipping from evening", () => {
    const state = ready();
    expect(g.dailyWagePerWorker(state)).toBe(2.5);
    expect(g.dailyPayroll(state)).toBe(7.5);
    const next = g.simulateTick({ ...state, minuteOfDay: 1439 });
    expect(next.money).toBe(state.money - g.dailyPayroll(state));
    expect(next.day).toBe(2);
    const morning = g.skipToMorning({ ...state, minuteOfDay: 1200 });
    expect(morning.money).toBe(next.money);
    expect(morning.minuteOfDay).toBe(480);
    expect(g.skipToMorning(morning)).toBe(morning);
    expect(g.skipToMorning({ ...next, minuteOfDay: 1 }).money).toBe(next.money);
  });
  it("charges for hires, respects housing and allows shelter expansion", () => {
    let state = ready();
    const before = state.money;
    state = g.hireWorker(state);
    expect(state.money).toBe(before - 25);
    expect(g.isHoused(state, state.workers[3].id)).toBe(false);
    expect(g.assignJob(state, state.workers[3].id, "wood")).toBe(state);
    const sheltered = g.buildShelter(state);
    expect(sheltered.money).toBe(state.money - 30);
    expect(g.isHoused(sheltered, sheltered.workers[3].id)).toBe(true);
    const poor = { ...state, money: 0 };
    expect(g.hireWorker(poor)).toBe(poor);
  });
  it("stops sick workers and resumes when they recover", () => {
    const state = ready();
    const sick = {
      ...state,
      workers: state.workers.map((w) => ({ ...w, illnessRemaining: 5 })),
    };
    expect(ticks(sick).stock.wood).toBe(0);
    const resumed = ticks(sick, 10);
    expect(resumed.stock.wood).toBe(1);
    expect(resumed.laborNotices.length).toBeGreaterThan(0);
  });
});
describe("save migration", () => {
  it("round-trips all site, equipment, queue, clock and storage state", () => {
    let state = g.requestProduction(ready("barn"), "barn", resource("Süt"), 10);
    state = ticks(g.upgradeSite(state, "barn"));
    state = g.upgradeWarehouse(state, resource("Süt"));
    const saved = g.loadGame(JSON.stringify(state));
    expect(saved.sites).toEqual(state.sites);
    expect(saved.equipment).toEqual(state.equipment);
    expect(saved.workers).toEqual(state.workers);
    expect(saved.stock).toEqual(state.stock);
    expect(saved.money).toBe(state.money);
    expect(saved.warehouseCapacity).toEqual(state.warehouseCapacity);
  });
  it("migrates old sites with equipment while preserving money, inventory and workers", () => {
    const base = g.emptyState();
    const saved = g.loadGame(
      JSON.stringify({
        ...base,
        version: 11,
        level: 5,
        money: 42,
        stock: { wood: 25 },
        workers: base.workers.map((w) => ({ ...w, job: "wood" })),
      }),
    );
    expect(saved.money).toBe(42);
    expect(saved.stock.wood).toBe(25);
    expect(saved.sites.lumber).toBeDefined();
    expect(saved.sites.coop).toBeDefined();
    expect(g.equippedCapacity(saved, g.siteDefinitions[0])).toBe(3);
    expect(
      ticks({ ...saved, orderIn: 9999, laborEventIn: 9999 }).stock.wood,
    ).toBe(28);
  });
  it("filters malformed site and equipment data, falls back for corrupt JSON", () => {
    const base = ready();
    const saved = g.loadGame(
      JSON.stringify({
        ...base,
        sites: { lumber: { level: -1, queue: [] } },
        equipment: [
          { id: 1, siteId: "unknown", type: "axe", level: 1, durability: 100 },
        ],
      }),
    );
    expect(saved.sites).toEqual({});
    expect(saved.equipment).toEqual([]);
    expect(saved.workers.every((w) => w.job === "idle")).toBe(true);
    expect(g.loadGame("broken").money).toBe(250);
  });
});

describe("independent production lines", () => {
  it("a missing ingredient on the first request never blocks later products", () => {
    let state = ready("barn");
    state = { ...state, stock: { ...state.stock, [resource("Süt")]: 20 } };
    state = g.requestProduction(state, "barn", resource("Peynir"), 5);
    state = g.requestProduction(state, "barn", resource("Kaymak"), 1);
    const next = ticks(state);
    expect(next.stock[resource("Peynir")]).toBe(0);
    expect(next.stock[resource("Kaymak")]).toBe(1);
    expect(g.productionRemaining(next.sites.barn, resource("Peynir"))).toBe(5);
  });
  it("reduces targets, calculates shortage from inventory and rejects invalid changes", () => {
    let state = ready("barn");
    const cheese = resource("Peynir");
    const recipe = g.siteDefinitions
      .find((s) => s.id === "barn")!
      .recipes.find((r) => r.output === cheese)!;
    state = { ...state, stock: { ...state.stock, [resource("Süt")]: 10 } };
    state = g.adjustProduction(state, "barn", cheese, 10);
    expect(g.productionShortages(state, recipe, 10)).toEqual([
      { resource: resource("Süt"), missing: 10 },
      { resource: resource("Tereyağı"), missing: 10 },
    ]);
    state = g.adjustProduction(state, "barn", cheese, -10);
    expect(g.productionRemaining(state.sites.barn, cheese)).toBe(0);
    expect(g.adjustProduction(state, "barn", cheese, -1)).toBe(state);
    expect(g.adjustProduction(state, "barn", cheese, 101)).toBe(state);
    expect(g.adjustProduction(state, "barn", cheese, NaN)).toBe(state);
    expect(g.requestProduction(state, "barn", resource("Süt"))).toBe(state);
  });
  it("preserves partial progress through pause and save, and resets it when cancelled", () => {
    let state = ready("barn");
    const cream = resource("Kaymak");
    state = { ...state, stock: { ...state.stock, [resource("Süt")]: 20 } };
    state = ticks(g.requestProduction(state, "barn", cream, 2), 2);
    expect(state.sites.barn.productProgress?.[cream]).toBe(40);
    const loaded = g.loadGame(JSON.stringify(state));
    expect(loaded.sites.barn.productProgress).toEqual(
      state.sites.barn.productProgress,
    );
    expect(
      ticks({ ...loaded, paused: true }).sites.barn.productProgress?.[cream],
    ).toBe(40);
    expect(
      g.adjustProduction(loaded, "barn", cream, -2).sites.barn
        .productProgress?.[cream],
    ).toBe(0);
    expect(ticks(loaded, 3).stock[cream]).toBe(1);
  });
  it("full raw storage does not block processing and shared ingredients never go negative", () => {
    let state = ready("barn", 3);
    const milk = resource("Süt"),
      cream = resource("Kaymak"),
      butter = resource("Tereyağı");
    state = { ...state, stock: { ...state.stock, [milk]: 100 } };
    state = g.requestProduction(state, "barn", cream, 100);
    const next = ticks(state, 20);
    expect(next.stock[cream]).toBeGreaterThan(0);
    expect(next.stock[milk]).toBeGreaterThanOrEqual(0);
    let scarce = {
      ...ready("barn", 3),
      stock: { ...g.zeroStock(), [milk]: 3 },
    };
    scarce = g.requestProduction(scarce, "barn", butter, 10);
    scarce = g.requestProduction(scarce, "barn", cream, 10);
    const produced = ticks(scarce, 20);
    expect(Object.values(produced.stock).every((n) => n >= 0)).toBe(true);
    expect(
      produced.stock[milk] +
        produced.stock[cream] * 2 +
        produced.stock[butter] * 3,
    ).toBe(15);
  });
  it("migrates automatic requests away while keeping processed targets", () => {
    const state = ready("barn");
    const loaded = g.loadGame(
      JSON.stringify({
        ...state,
        sites: {
          barn: {
            ...state.sites.barn,
            queue: [
              { output: resource("Süt"), remaining: 5 },
              { output: resource("Kaymak"), remaining: 3 },
            ],
          },
        },
      }),
    );
    expect(loaded.sites.barn.queue).toEqual([
      { output: resource("Kaymak"), remaining: 3 },
    ]);
  });
});

it("uses idle workers before hiring and does not hire around housing or illness restrictions", () => {
  const state = g.purchaseSite(g.emptyState(), "lumber");
  const next = g.hireForJob(state, "wood");
  expect(next.workers).toHaveLength(3);
  expect(next.workers[0].job).toBe("wood");
  expect(next.money).toBe(state.money);
  const sick = {
    ...state,
    workers: state.workers.map((w) => ({ ...w, illnessRemaining: 10 })),
  };
  expect(g.hireForJob(sick, "wood")).toBe(sick);
  const full = {
    ...state,
    workers: state.workers.map((w) => ({ ...w, job: "wood" as const })),
  };
  expect(g.hireForJob(full, "wood")).toBe(full);
});

describe("hospital and labor events", () => {
  const sick = () => {
    const state = ready();
    return {
      ...state,
      workers: state.workers.map((w) => ({ ...w, illnessRemaining: 600 })),
    };
  };
  it("recovers naturally in 600 ticks and treats only two patients per doctor in 300 ticks", () => {
    const state = sick();
    expect(ticks(state, 599).workers[0].illnessRemaining).toBe(1);
    expect(ticks(state, 600).workers[0].illnessRemaining).toBe(0);
    const treated = {
      ...state,
      hospital: {
        level: 1,
        doctors: 1,
        supplies: { syringe: 3, painkiller: 3, antibiotic: 3 },
      },
    };
    const first = ticks(treated, 1);
    expect(first.workers.map((w) => w.illnessRemaining)).toEqual([
      598, 598, 599,
    ]);
    expect(first.hospital.supplies.syringe).toBe(1);
    const recovered = ticks(treated, 300);
    expect(recovered.workers.map((w) => w.illnessRemaining)).toEqual([
      0, 0, 300,
    ]);
    expect(ticks(recovered, 150).workers[2].illnessRemaining).toBe(0);
  });
  it("requires all supplies and pauses health timers", () => {
    const state = {
      ...sick(),
      hospital: {
        level: 1,
        doctors: 1,
        supplies: { syringe: 2, painkiller: 2, antibiotic: 0 },
      },
    };
    expect(ticks(state, 1).workers[0].illnessRemaining).toBe(599);
    expect(ticks(state, 1).hospital.supplies.syringe).toBe(2);
    const paused = { ...state, paused: true };
    expect(g.simulateTick(paused)).toBe(paused);
  });
  it("resigns only after prolonged equipment shortage and resets after equipment returns", () => {
    const state = ready();
    const waiting = {
      ...state,
      equipment: [],
      workers: state.workers.map((w) => ({ ...w, unequippedTicks: 598 })),
    };
    expect(ticks(waiting, 1).workers).toHaveLength(3);
    const departed = ticks(waiting, 2);
    expect(departed.workers).toHaveLength(2);
    expect(departed.laborNotices[0].text).toContain("istifa");
    expect(
      ticks({ ...waiting, equipment: state.equipment }, 1).workers[0]
        .unequippedTicks,
    ).toBe(0);
    expect(
      ticks({ ...waiting, minuteOfDay: g.WORK_END }, 5).workers[0]
        .unequippedTicks,
    ).toBe(598);
  });
  it("removes deceased workers and preserves an empty workforce on load", () => {
    const state = sick();
    state.workers = [
      { ...state.workers[0], illnessRemaining: 1, illnessFatal: true },
    ];
    state.selectedWorker = state.workers[0].id;
    const next = ticks(state, 1);
    expect(next.workers).toHaveLength(0);
    expect(next.selectedWorker).toBeNull();
    expect(g.loadGame(JSON.stringify(next)).workers).toHaveLength(0);
  });
  it("round-trips treatment and removes legacy strike state", () => {
    const state = {
      ...sick(),
      hospital: {
        level: 2,
        doctors: 3,
        supplies: { syringe: 4, painkiller: 5, antibiotic: 6 },
      },
    };
    const next = ticks(state, 1);
    expect(g.loadGame(JSON.stringify(next)).hospital).toEqual(next.hospital);
    expect(g.loadGame(JSON.stringify(next)).workers).toEqual(next.workers);
    const legacy = g.loadGame(
      JSON.stringify({
        ...ready(),
        version: 12,
        hospital: undefined,
        workers: [{ ...ready().workers[0], strikeRemaining: 400 }],
      }),
    );
    expect(legacy.workers[0]).not.toHaveProperty("strikeRemaining");
    expect(legacy.hospital.level).toBe(0);
  });
});

it("clears equipment warnings immediately only when the full kit is restored", () => {
  let state = ticks({ ...ready(), equipment: [] }, 1);
  expect(state.laborNotices.some(n => n.equipmentWorkerId === "w1")).toBe(true);
  state = g.buyEquipment(state, "lumber", "axe");
  expect(state.laborNotices.some(n => n.equipmentWorkerId === "w1")).toBe(true);
  state = g.buyEquipment({ ...state, paused: true }, "lumber", "gloves");
  expect(state.laborNotices.some(n => n.equipmentWorkerId === "w1")).toBe(false);
  expect(state.workers[0].unequippedTicks).toBe(0);
  expect(state.ledger.some(n => n.text.includes("ekipmansız kaldı"))).toBe(true);
});
it("clears resolved legacy equipment warnings on load and when unassigning", () => {
  const state = ready();
  const loaded = g.loadGame(JSON.stringify({ ...state, laborNotices: [{ id: 1, text: "Oduncu sahasında çalışan 1 işçi ekipmansız kaldı. 10 dakika mesai boyunca ekipman sağlanmazsa istifa edecek." }] }));
  expect(loaded.laborNotices).toEqual([]);
  const waiting = ticks({ ...state, equipment: [] }, 1);
  expect(g.assignJob(waiting, "w1", "idle").laborNotices).toEqual([]);
});
