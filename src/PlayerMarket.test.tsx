// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlayerMarket } from "./PlayerMarket";
import { OrderBoard } from "./OrderBoard";
import * as g from "./game";
import type { useGameSession } from "./useGameSession";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let session: ReturnType<typeof useGameSession>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  const state = g.emptyState();
  session = { state, status: "connected", error: "", send: vi.fn(), setError: vi.fn(), act: vi.fn(),
    connect: vi.fn(), disconnect: vi.fn(), reconnect: vi.fn(), marketNotices: [], dismissMarketNotice: vi.fn(),
    snapshot: { type: "snapshot", playerId: "buyer", state, players: [], offers: [], orders: [] } };
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const renderMarket = () => act(async () => root.render(<PlayerMarket session={session} openMultiplayer={vi.fn()} />));
it("lists only owned stock for sale and switches selection when stock runs out", async () => {
  session.state.stock.stone = 3;
  await renderMarket();
  const select = () => container.querySelector<HTMLSelectElement>('select[aria-label="Satılacak ürün"]')!;
  expect([...select().options].map((o) => o.value)).toEqual(["stone"]);
  expect(select().value).toBe("stone");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(session.send).toHaveBeenCalledWith({ type: "offer", resource: "stone", quantity: 1, total: 10 });
  session.state.stock.stone = 0;
  await renderMarket();
  expect(select().options).toHaveLength(0);
  expect(select().disabled).toBe(true);
  expect(container.textContent).toContain("Satılabilecek ürününüz yok");
});
it("requests an unowned product and displays its order on the board", async () => {
  await renderMarket();
  expect(container.querySelectorAll('select[aria-label="Sipariş edilecek ürün"] option')).toHaveLength(g.resources.length);
  await act(async () => container.querySelectorAll("form")[1].dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(session.send).toHaveBeenCalledWith({ type: "placeOrder", resource: "wood", quantity: 1, total: 10 });
  session.snapshot!.orders = [{ id: "order", buyerId: "buyer", buyerName: "Alıcı", resource: "wood", quantity: 1, total: 10 }];
  const board = () => act(async () => root.render(<OrderBoard state={session.state} act={session.act} session={session} />));
  await board();
  expect(container.textContent).toContain("Alıcı · Senin siparişin");
  await act(async () => container.querySelector<HTMLButtonElement>(".player-offer button")!.click());
  expect(session.send).toHaveBeenCalledWith({ type: "cancelPlayerOrder", id: "order" });
  session.snapshot!.playerId = "seller";
  await board();
  expect(container.querySelector<HTMLButtonElement>(".player-offer button")!.disabled).toBe(true);
  session.state.stock.wood = 1;
  await board();
  await act(async () => container.querySelector<HTMLButtonElement>(".player-offer button")!.click());
  expect(session.send).toHaveBeenCalledWith({ type: "fulfillPlayerOrder", id: "order" });
});
