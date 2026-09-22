// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import * as g from "./game";
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const saved = () => g.loadGame(localStorage.getItem("last-city-workers-v2"));
const button = (text: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.includes(text),
  )!;
const click = async (text: string) => {
  const b = button(text);
  expect(b, text).toBeDefined();
  expect(b.disabled, text).toBe(false);
  await act(async () => b.click());
};
const clickLabel = async (label: string) => {
  const target = container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  )!;
  expect(target).not.toBeNull();
  expect(target.disabled).toBe(false);
  await act(async () => target.click());
};
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
  vi.useRealTimers();
});
const render = async (state?: g.GameState) => {
  if (state)
    localStorage.setItem("last-city-workers-v2", JSON.stringify(state));
  await act(async () => root.render(<App />));
};
it("lets managers produce missing ingredients while offering purchasing too", async () => {
  let state = g.purchaseSite({ ...g.emptyState(), money: 100000 }, "smith");
  state = g.purchaseSite(state, "furnace");
  const axe = g.equipmentResources.axe;
  const iron = g.resources.find(r => g.resourceNames[r] === "Hamdemir")!;
  state = g.setProduction(state, "smith", axe, 3);
  await render(state);
  const launcher = container.querySelector<HTMLButtonElement>('button[aria-label^="Atölyeler asistanı"]')!;
  await act(async () => launcher.click());
  expect(container.querySelector('[role="dialog"]')!.textContent).toContain("3 Hamdemir (Fırın)");
  await clickLabel("Hamdemir üretim emri ver");
  expect(g.productionRemaining(saved().sites.furnace, iron)).toBe(3);
  expect(container.querySelector<HTMLButtonElement>('button[aria-label="Hamdemir üretim emri ver"]')!.disabled).toBe(true);
  expect(container.querySelector<HTMLButtonElement>('button[aria-label="Kereste üretim emri ver"]')!.disabled).toBe(true);
  expect(container.querySelector('[role="dialog"]')!.textContent).toContain("satın al");
  expect(saved().stock[iron]).toBe(0);
  expect(saved().money).toBe(state.money);
});
it("lets managers request equipment from an open workshop", async () => {
  let state = g.purchaseSite({ ...g.emptyState(), money: 100000 }, "lumber");
  state = g.purchaseSite(state, "smith");
  await render(state);
  await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Orman asistanı"]')!.click());
  await clickLabel("Balta üretim emri ver");
  expect(g.productionRemaining(saved().sites.smith, g.equipmentResources.axe)).toBe(1);
  expect(container.querySelector('[role="dialog"]')!.textContent).toContain("Satın al ve kullan");
  expect(saved().money).toBe(state.money);
});
it("edits a production target while ticks continue and clamps to capacity", async () => {
  await render(g.purchaseSite({ ...g.emptyState(), money: 1000 }, "barn"));
  await click("Hayvancılık");
  await click("İnek Ahırı");
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Kaymak kalan üretim"]')!;
  const type = async (value: string) => {
    await act(async () => input.focus());
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  await type("25");
  await act(async () => vi.advanceTimersByTime(2000));
  expect(input.value).toBe("25");
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  const output = g.siteDefinitions.find((s) => s.id === "barn")!.recipes[1].output;
  expect(g.productionRemaining(saved().sites.barn, output)).toBe(25);
  await clickLabel("Kaymak üretimini artır");
  expect(input.value).toBe("26");
  await type("999");
  await act(async () => input.blur());
  expect(input.value).toBe("100");
  await type("");
  await act(async () => input.blur());
  expect(input.value).toBe("100");
  await type("0");
  await act(async () => input.blur());
  expect(g.productionRemaining(saved().sites.barn, output)).toBe(0);
});
it("browses categories, buys a site and equipment, assigns staff and persists production", async () => {
  await render();
  expect(container.querySelectorAll(".category-card")).toHaveLength(6);
  await click("Orman");
  expect(container.querySelectorAll(".production-card")).toHaveLength(2);
  await click("Oduncu");
  await click("Sahayı satın al");
  expect(saved().money).toBe(150);
  expect(button("+ İşçi ata").disabled).toBe(false);
  expect(container.querySelector(".manager-card")).toBeNull();
  await click("Deniz");
  expect(container.querySelector(".assistant-popup")?.textContent).toContain(
    "balta gerekli",
  );
  await click("1 adet al");
  await click("1 adet al");
  await clickLabel("Asistanı kapat");
  await click("+ İşçi ata");
  await act(async () => vi.advanceTimersByTime(5000));
  expect(saved().stock.wood).toBe(1);
  expect(container.querySelector(".resource-strip")?.textContent).toContain(
    "Odun1",
  );
  expect(container.querySelector(".site-storage")?.textContent).toContain(
    "1/100",
  );
  await click("Depoyu +100 yükselt");
  expect(saved().warehouseCapacity.wood).toBe(200);
  await click("− İşçi çıkart");
  expect(saved().workers[0].job).toBe("idle");
});
it("shows globally doubled prices and prevents unaffordable site purchases", async () => {
  await render(g.purchaseSite(g.emptyState(), "lumber"));
  await click("Tarım");
  await click("Tarla");
  expect(button("Sahayı satın al").textContent).toContain("200₺");
  expect(button("Sahayı satın al").disabled).toBe(true);
});
it("adjusts each product with steppers and displays exact live shortages", async () => {
  const state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "barn");
  await render(state);
  await click("Hayvancılık");
  await click("İnek Ahırı");
  expect(container.querySelector(".recipes-panel")?.textContent).toContain(
    "2 Süt + 1 Tereyağı",
  );
  expect(container.querySelector(".recipes-panel")?.textContent).not.toContain(
    "Üretim sırası",
  );
  expect(container.querySelectorAll(".product-progress")).toHaveLength(4);
  expect(
    container.querySelector('button[aria-label="Süt üretimini artır"]'),
  ).toBeNull();
  await clickLabel("Kaymak üretimini artır");
  await clickLabel("Kaymak üretimini artır");
  expect(saved().sites.barn.queue).toHaveLength(1);
  expect(
    container.querySelector('[aria-label="Kaymak üretimi"]')?.textContent,
  ).toContain("Süt yetersiz, 4 tane daha gerekiyor.");
  await clickLabel("Kaymak üretimini azalt");
  expect(
    container.querySelector('[aria-label="Kaymak üretimi"]')?.textContent,
  ).toContain("Süt yetersiz, 2 tane daha gerekiyor.");
  await clickLabel("Kaymak üretimini azalt");
  expect(saved().sites.barn.queue).toHaveLength(0);
  await click("Sahayı yükselt");
  expect(saved().sites.barn.level).toBe(2);
});
it("opens the owned site from the resource strip beside the clock", async () => {
  await render(g.purchaseSite(g.emptyState(), "coop"));
  const nav = container.querySelector("header .resource-strip")!;
  const overview = nav.closest("details")!;
  expect(overview.open).toBe(false);
  await act(async () => overview.querySelector("summary")!.click());
  expect(overview.open).toBe(true);
  await act(async () =>
    nav.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(container.querySelector("h1")?.textContent).toBe("Kümes");
  expect(
    container.querySelector(".site-overview .site-storage")?.textContent,
  ).toContain("Yumurta");
  expect(container.querySelector(".storage-chart")).toBeNull();
  expect(nav.textContent).toContain("0/100");
  await clickLabel("Yumurta deposunu yükselt");
  expect(nav.textContent).toContain("0/200");
  expect(saved().warehouseCapacity.egg).toBe(200);
});
it("hires, expands shelter and delivers an order without unlocking new sites", async () => {
  const state = g.purchaseSite({ ...g.emptyState(), money: 500 }, "lumber");
  await render({
    ...state,
    stock: { ...state.stock, wood: 10 },
    order: {
      merchantId: 0,
      id: 1,
      needs: { ...g.zeroStock(), wood: 10 },
      reward: 20,
      duration: 60,
      remaining: 60,
    },
  });
  await click("Barınak +3");
  expect(saved().shelterCapacity).toBe(6);
  await click("Siparişler");
  await click("Siparişi teslim et");
  expect(saved().money).toBe(394);
  expect(saved().stock.wood).toBe(0);
  expect(Object.keys(saved().sites)).toEqual(["lumber"]);
});
it("pauses timers and skips from evening to morning with wage settlement", async () => {
  await render({ ...g.emptyState(), minuteOfDay: 1200 });
  await click("Duraklat");
  await act(async () => vi.advanceTimersByTime(3000));
  expect(saved().minuteOfDay).toBe(1200);
  await click("Sonraki güne geç");
  expect(saved().minuteOfDay).toBe(480);
  expect(saved().money).toBe(242.5);
  expect(saved().day).toBe(2);
});
it.each([480, 900, 1199, 1200, 1439, 0, 479])(
  "keeps the morning shortcut available at minute %i",
  async (minuteOfDay) => {
    await render({ ...g.emptyState(), minuteOfDay, paused: true });
    await click("Sonraki güne geç");
    expect(saved().minuteOfDay).toBe(480);
    expect(saved().day).toBe(minuteOfDay >= 480 ? 2 : 1);
    expect(saved().money).toBe(minuteOfDay >= 480 ? 242.5 : 250);
  },
);
it("removes saved broken equipment and requests a replacement", async () => {
  let state = g.buyEquipment(
    g.purchaseSite(g.emptyState(), "lumber"),
    "lumber",
    "axe",
  );
  state = {
    ...state,
    equipment: state.equipment.map((e) => ({ ...e, durability: 0 })),
  };
  await render(state);
  await click("Orman");
  await click("Oduncu");
  expect(
    container.querySelector(".equipment-panel")?.textContent,
  ).not.toContain("Kırık");
  expect(container.querySelectorAll(".equipment-item")).toHaveLength(0);
  expect(saved().equipment).toEqual([]);
  await click("Deniz");
  expect(container.querySelector(".assistant-popup")?.textContent).toContain(
    "balta gerekli",
  );
});

it("summarizes category inventory and needs and opens assistants without taking over the page", async () => {
  let state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "barn");
  const milk = g.resources.find((r) => g.resourceNames[r] === "Süt")!;
  const cream = g.resources.find((r) => g.resourceNames[r] === "Kaymak")!;
  state = { ...state, stock: { ...state.stock, [milk]: 7 } };
  state = g.requestProduction(state, "barn", cream, 10);
  await render(state);
  const card = container.querySelector(".category-livestock")!;
  expect(card.textContent).toContain("Süt7");
  expect(card.textContent).toContain("Süt: 13 adet eksik");
  expect(card.textContent).toContain("Süt kovası eksik");
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await click("Elif");
  expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
    "Süt yetersiz, 13 tane daha gerekiyor.",
  );
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Asistanı kapat",
  );
  await act(async () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement?.getAttribute("aria-label")).toContain(
    "Hayvancılık asistanı",
  );
});
it("updates separate animated progress bars and shortages as automatic milk is produced", async () => {
  let state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "barn");
  const definition = g.siteDefinitions.find((s) => s.id === "barn")!;
  for (const type of definition.equipment)
    state = g.buyEquipment(state, "barn", type);
  state = g.assignJob(state, "w1", definition.job);
  await render(state);
  await click("Hayvancılık");
  await click("İnek Ahırı");
  await clickLabel("Kaymak üretimini artır");
  await clickLabel("Peynir üretimini artır");
  await act(async () => vi.advanceTimersByTime(2000));
  const milkBar = container.querySelector(
    '[aria-label="Süt üretim ilerlemesi"]',
  )!;
  expect(milkBar.getAttribute("aria-valuenow")).toBe("40");
  expect(milkBar.classList.contains("is-producing")).toBe(true);
  expect(
    container
      .querySelector('[aria-label="Peynir üretim ilerlemesi"]')
      ?.getAttribute("aria-valuenow"),
  ).toBe("0");
  await act(async () => vi.advanceTimersByTime(3000));
  expect(
    container.querySelector('[aria-label="Kaymak üretimi"]')?.textContent,
  ).toContain("Süt yetersiz, 1 tane daha gerekiyor.");
  await click("Duraklat");
  expect(
    container.querySelectorAll(".product-progress.is-producing"),
  ).toHaveLength(0);
});

it("upgrades affordable equipment in a group and regroups the results", async () => {
  let state = g.purchaseSite({ ...g.emptyState(), money: 1000 }, "lumber");
  for (let i = 0; i < 5; i++) state = g.buyEquipment(state, "lumber", "axe");
  await render({ ...state, money: g.equipmentTypes.axe.price * 4 });
  await click("Orman");
  await click("Oduncu");
  expect(container.querySelectorAll(".equipment-item")).toHaveLength(1);
  expect(container.querySelector(".equipment-item")?.textContent).toContain(
    "5 adet · Sv. 1",
  );
  await click("Yükselt · 4/5 adet");
  expect(saved().money).toBe(0);
  expect(container.querySelectorAll(".equipment-item")).toHaveLength(2);
  expect(container.querySelector(".equipment-list")?.textContent).toContain(
    "4 adet · Sv. 2",
  );
  expect(container.querySelector(".equipment-list")?.textContent).toContain(
    "1 adet · Sv. 1",
  );
});
it("selects equipment purchase quantity and keeps management in the shared sidebar", async () => {
  await render(g.purchaseSite({ ...g.emptyState(), money: 1000 }, "barn"));
  expect(container.textContent).not.toContain("Şehir günlüğü");
  expect(
    container.querySelector(".city-sidebar .site-warehouse"),
  ).not.toBeNull();
  await click("Hayvancılık");
  expect(
    container.querySelector(".city-sidebar .site-warehouse"),
  ).not.toBeNull();
  await click("İnek Ahırı");
  const definition = g.siteDefinitions.find((s) => s.id === "barn")!;
  const type = definition.equipment[0];
  const name = g.equipmentTypes[type].name;
  await clickLabel(`${name} alımını artır`);
  await clickLabel(`${name} alımını artır`);
  await clickLabel(`${name} alımını azalt`);
  const before = saved().money;
  await click("Satın al · 2 adet");
  expect(saved().equipment.filter((e) => e.type === type)).toHaveLength(2);
  expect(saved().money).toBe(before - 2 * g.equipmentTypes[type].price);
  expect(container.querySelector(".site-detail .site-warehouse")).toBeNull();
  expect(
    container
      .querySelector(".site-overview")
      ?.nextElementSibling?.classList.contains("recipes-panel"),
  ).toBe(true);
});

it("centralizes management and only hires from assignment after idle workers run out", async () => {
  await render(g.purchaseSite({ ...g.emptyState(), money: 1000 }, "lumber"));
  expect(button("Yeni işçi al")).toBeUndefined();
  const management = container.querySelector(".management-summary")!;
  expect(management.textContent).toContain("Barınak sayısı1");
  expect(management.textContent).toContain("Kalan işçi / yatak3 / 3");
  expect(management.textContent).toContain("Boşta3");
  await click("Orman");
  await click("Oduncu");
  const before = saved().money;
  for (let i = 0; i < 3; i++) await click("+ İşçi ata");
  expect(saved().money).toBe(before);
  expect(saved().workers).toHaveLength(3);
  expect(button("İşçi al + ata").disabled).toBe(true);
  await click("Sahayı yükselt");
  expect(button("İşçi al + ata").disabled).toBe(true);
  await click("Barınak +3");
  const beforeHire = saved().money;
  await click("İşçi al + ata");
  expect(saved().workers).toHaveLength(4);
  expect(saved().workers[3].job).toBe("wood");
  expect(saved().money).toBe(beforeHire - 25);
  await click("− İşçi çıkart");
  expect(button("+ İşçi ata").disabled).toBe(false);
  expect(button("İşçi al + ata")).toBeUndefined();
});

it("builds a hospital, hires doctors and buys requested supplies", async () => {
  await render({ ...g.emptyState(), money: 1000 });
  await click("Hastane");
  await click("Hastaneyi kur");
  await click("Doktor al");
  expect(saved().hospital.doctors).toBe(1);
  expect(g.doctorCapacity(saved())).toBe(2);
  await click("İğne al");
  await click("Ağrı kesici al");
  await click("Antibiyotik al");
  expect(saved().hospital.supplies).toEqual({
    syringe: 1,
    painkiller: 1,
    antibiotic: 1,
  });
  await click("Hastaneyi yükselt");
  expect(g.doctorCapacity(saved())).toBe(4);
});

it("uses stocked hospital supplies for a waiting patient and shows the actual waiting reason", async () => {
  const state = g.emptyState();
  await render({
    ...state,
    laborEventIn: 99999,
    hospital: {
      level: 3,
      doctors: 0,
      supplies: { syringe: 7, painkiller: 7, antibiotic: 7 },
    },
    workers: state.workers.map((w, i) => ({
      ...w,
      illnessRemaining: i === 0 ? 600 : 0,
    })),
  });
  await click("Hastane");
  expect(container.textContent).toContain("Doktor bekliyor");
  expect(container.textContent).toContain("Bekleyen malzeme talebi yok.");
  await click("Doktor al");
  await act(async () => vi.advanceTimersByTime(1000));
  expect(container.textContent).toContain("Tedavi oluyor");
  expect(saved().hospital.supplies).toEqual({
    syringe: 6,
    painkiller: 6,
    antibiotic: 6,
  });
});

it("lets the player inspect and accept merchant offers", async () => {
  await render(g.purchaseSite({ ...g.emptyState(), money: 500 }, "lumber"));
  expect(container.querySelector(".order-card")).toBeNull();
  await click("Siparişler");
  expect(container.querySelector(".orders-screen")).not.toBeNull();
  expect(button("Teklifleri yenile")).toBeUndefined();
  expect(saved().order).toBeNull();
  const count = saved().orderPool.length;
  expect(count).toBeGreaterThanOrEqual(2);
  expect(container.querySelector(".offer-badge")?.textContent).toBe(
    String(count),
  );
  expect(container.textContent).toContain("Yatırım siparişi");
  expect(container.textContent).toContain("Yeni saha gerekli");
  const offer = saved().orderPool[0];
  await click(`Siparişi kabul et #${offer.id}`);
  expect(saved().order?.id).toBe(offer.id);
  expect(saved().orderPool).toHaveLength(count - 1);
  expect(container.querySelector(".offer-badge")?.textContent).toBe(
    String(count - 1),
  );
  await click("Üretim");
  expect(container.querySelector(".orders-screen")).toBeNull();
});

it("expires recovery notices after eight seconds even while paused", async () => {
  const state = g.emptyState();
  state.paused = true;
  state.laborNotices = [
    { id: 1, text: "1 i\u015f\u00e7i iyile\u015fti, yeniden \u00e7al\u0131\u015fabilir." },
    { id: 2, text: "Ekipman gerekli" },
  ];
  await render(state);
  await act(async () => vi.advanceTimersByTime(7999));
  expect(saved().laborNotices).toHaveLength(2);
  await act(async () => vi.advanceTimersByTime(1));
  expect(saved().laborNotices.map(n => n.id)).toEqual([2]);
});
it("lets a manager purchase and equip missing equipment", async () => {
  const state = g.purchaseSite({ ...g.emptyState(), money: 100000 }, "lumber");
  await render(state);
  await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label^="Orman asistan\u0131"]')!.click());
  await click("Sat\u0131n al ve kullan");
  expect(saved().equipment.some(e => e.siteId === "lumber" && e.type === "axe")).toBe(true);
  expect(saved().money).toBe(state.money - g.equipmentTypes.axe.price);
});
