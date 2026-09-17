// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { App } from "./App";
import { emptyState, loadGame } from "./game";

it("hires and delivers through the UI, and persists both actions", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({
    ...emptyState(), money: 25, level: 2, stock: { wood: 20, egg: 10, fruit: 0 },
    order: { id: 1, needs: { wood: 20, egg: 10, fruit: 0 }, reward: 65, remaining: 60, duration: 90 },
  }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const saved = () => loadGame(localStorage.getItem("last-city-workers-v2"));
  try {
    await act(async () => root.render(<App />));
    const hire = container.querySelector<HTMLButtonElement>(".hire-row button")!;
    expect(hire.disabled).toBe(false);
    await act(async () => hire.click());
    expect(saved().workers).toHaveLength(4);
    expect(container.querySelector(".team-bar")?.textContent).toContain("4 işçi");
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Odun işçi ata"]')!.click());
    expect(saved().workers.filter(w => w.job === "wood")).toHaveLength(1);
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Odun işçi çıkart"]')!.click());
    expect(saved().workers.filter(w => w.job === "wood")).toHaveLength(0);
    expect(saved().money).toBe(0);
    expect(hire.disabled).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>(".fulfill-button")!.click());
    expect(saved().money).toBe(65);
    expect(saved().stock.wood).toBe(0);
    expect(container.querySelector(".order-card")?.textContent).toContain("Başarılı");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(saved().consumptionIn).toBe(29);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.useRealTimers();
  }
});


it("browses all 100 inventory items and production levels", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    expect(container.querySelectorAll(".production-card")).toHaveLength(15);
    const next = () => Array.from(container.querySelectorAll("button")).find(b => b.textContent === "Sonraki →")!;
    for (let i = 0; i < 6; i++) await act(async () => next().click());
    expect(container.querySelectorAll(".production-card")).toHaveLength(10);
    expect(container.querySelector(".production-grid")?.textContent).toContain("Şehir Çekirdeği");
    expect(next().disabled).toBe(true);
    const filter = container.querySelector<HTMLSelectElement>('select[aria-label="Envanter filtresi"]')!;
    await act(async () => { filter.value = "all"; filter.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container.querySelectorAll(".stock-item")).toHaveLength(8);
    const inventoryNext = container.querySelector<HTMLButtonElement>('button[aria-label="Sonraki envanter sayfası"]')!;
    for (let i = 0; i < 12; i++) await act(async () => inventoryNext.click());
    expect(container.querySelector(".inventory")?.textContent).toContain("Şehir Çekirdeği");
    expect(inventoryNext.disabled).toBe(true);
  } finally { await act(async () => root.unmount()); localStorage.clear(); }
});


it("shows strike notices and countdown, hires a paid replacement and dismisses notices", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base, money: 100, shelterCapacity: 6,
    laborNotices: [{ id: 1, text: "Test site: 1 worker greve started." }], laborSequence: 1,
    workers: base.workers.map((w, i) => i === 0 ? { ...w, job: "wood", strikeRemaining: 600 } : w) }));
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    expect(container.querySelector(".labor-notice")?.textContent).toContain("greve");
    expect(container.querySelector(".team-bar")?.textContent).toContain("1 grevde");
    expect(container.querySelector(".strike-info")?.textContent).toContain("10:00");
    expect(container.querySelector(".card-status")?.textContent).toContain("GREV");
    const replacement = container.querySelector<HTMLButtonElement>(".replacement-button")!;
    await act(async () => replacement.click());
    const saved = loadGame(localStorage.getItem("last-city-workers-v2"));
    expect(saved.money).toBe(75);
    expect(saved.workers).toHaveLength(4);
    expect(saved.workers.filter(w => w.job === "wood" && !w.strikeRemaining)).toHaveLength(1);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(container.querySelector(".strike-info")?.textContent).toContain("9:59");
    await act(async () => container.querySelector<HTMLButtonElement>('.labor-notice button')!.click());
    expect(container.querySelector(".labor-notice")).toBeNull();
    expect(loadGame(localStorage.getItem("last-city-workers-v2")).laborNotices).toEqual([]);
  } finally { await act(async () => root.unmount()); localStorage.clear(); vi.useRealTimers(); }
});


it("sorts stock globally and focuses an inventory product across production pages and filters", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base, level: 14,
    stock: { ...Object.fromEntries(Object.keys(base.stock).map(r => [r, 20])), egg: 3, product14: 0 } }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    const quantities = () => Array.from(container.querySelectorAll(".stock-item strong")).map(n => Number(n.textContent));
    expect(quantities()).toEqual([0, 3, 20, 20, 20, 20, 20, 20]);
    await act(async () => container.querySelectorAll<HTMLButtonElement>(".tabs button")[2].click());
    expect(container.querySelectorAll(".production-card")).toHaveLength(0);
    const item = container.querySelector<HTMLButtonElement>(".stock-item")!;
    await act(async () => item.click());
    const target = container.querySelector("#production-14");
    expect(target).not.toBeNull();
    expect(target?.classList.contains("is-focused")).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(container.querySelectorAll(".production-card")).toHaveLength(15);
    item.focus();
    await act(async () => item.click());
    expect(document.activeElement).toBe(target);
  } finally { await act(async () => root.unmount()); container.remove(); localStorage.clear(); }
});

it("keeps inventory ascending as production changes quantities", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base, level: 2,
    stock: { ...base.stock, egg: 1 }, workers: base.workers.map((w, i) => i === 0 ? { ...w, job: "wood", progress: 80 } : w) }));
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    const first = () => container.querySelector(".stock-item small")?.textContent;
    expect(first()).toBe("Odun");
    await act(async () => vi.advanceTimersByTime(6000));
    expect(first()).toBe("Yumurta");
    expect(Array.from(container.querySelectorAll(".stock-item strong")).map(n => Number(n.textContent))).toEqual([1, 2]);
  } finally { await act(async () => root.unmount()); localStorage.clear(); vi.useRealTimers(); }
});

it("upgrades the warehouse, reorders by fill ratio and saves the purchase", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base, money: 100, level: 2,
    stock: { ...base.stock, wood: 100, egg: 80 } }));
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    const first = () => container.querySelector(".warehouse-item")?.getAttribute("data-resource");
    expect(first()).toBe("wood");
    expect(container.querySelector(".left-panel")?.children[1].getAttribute("aria-label")).toBe("Depo");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Odun deposunu y?kselt"]')!.click());
    const saved = loadGame(localStorage.getItem("last-city-workers-v2"));
    expect(saved.money).toBe(0);
    expect(saved.warehouseCapacity.wood).toBe(200);
    expect(first()).toBe("egg");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Odun deposunu y?kselt"]')!.disabled).toBe(true);
  } finally { await act(async () => root.unmount()); localStorage.clear(); vi.useRealTimers(); }
});


it("shows unhoused workers and persists shelter construction before assignment", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base, money: 100,
    workers: [...base.workers.map(w => ({ ...w, job: "wood" })), { id: "w4", name: "", role: "Toplayıcı", job: "idle", progress: 0 }] }));
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    const assign = () => container.querySelector<HTMLButtonElement>('button[aria-label="Odun işçi ata"]')!;
    expect(assign().disabled).toBe(true);
    expect(container.querySelector(".team-bar")?.textContent).toContain("1 barınaksız");
    expect(container.querySelector<HTMLButtonElement>(".replacement-button")!.disabled).toBe(true);
    await act(async () => container.querySelector<HTMLButtonElement>(".shelter-card button")!.click());
    expect(loadGame(localStorage.getItem("last-city-workers-v2")).shelterCapacity).toBe(6);
    expect(loadGame(localStorage.getItem("last-city-workers-v2")).money).toBe(70);
    expect(assign().disabled).toBe(false);
    await act(async () => assign().click());
    expect(loadGame(localStorage.getItem("last-city-workers-v2")).workers[3].job).toBe("wood");
    expect(container.querySelector(".team-bar")?.textContent).toContain("4 görevde");
  } finally { await act(async () => root.unmount()); localStorage.clear(); vi.useRealTimers(); }
});


it("marks full warehouses as stopped and resumes production after a paid delivery", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const base = emptyState();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...base,
    stock: { ...base.stock, wood: 100 }, workers: base.workers.map(w => ({ ...w, job: "wood", progress: 80 })),
    order: { id: 1, needs: { ...base.stock, wood: 10 }, reward: 20, remaining: 60, duration: 60 } }));
  const container = document.createElement("div");
  const root = createRoot(container);
  const saved = () => loadGame(localStorage.getItem("last-city-workers-v2"));
  try {
    await act(async () => root.render(<App />));
    expect(container.querySelector(".card-status")?.textContent).toBe("DEPO DOLU");
    expect(container.querySelector(".live-status")?.textContent).toContain("0 işçi üretimde");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(saved().stock.wood).toBe(100);
    expect(saved().money).toBe(0);
    await act(async () => container.querySelector<HTMLButtonElement>(".fulfill-button")!.click());
    expect(saved().money).toBe(20);
    expect(container.querySelector(".card-status")?.textContent).toContain("ÜRETİMDE");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(saved().stock.wood).toBe(93);
    expect(saved().money).toBe(20);
  } finally { await act(async () => root.unmount()); localStorage.clear(); vi.useRealTimers(); }
});
