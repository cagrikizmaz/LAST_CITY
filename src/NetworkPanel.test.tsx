// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import * as g from "./game";
import { LAN_PROTOCOL, type DiscoveredRoom } from "./lanProtocol";
import { discoverRooms } from "./roomDiscovery";
vi.mock("./roomDiscovery", () => ({ discoverRooms: vi.fn() }));
const room: DiscoveredRoom = { id: "12345678-1234-1234-1234-123456789abc", name: "Komşu çiftlik", address: "192.168.1.20:4765", port: 4765, players: 1, capacity: 16, protocol: LAN_PROTOCOL };

class FakeSocket {
  static OPEN = 1;
  static latest: FakeSocket;
  readyState = 0;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  sent: any[] = [];
  constructor(public url: string) { FakeSocket.latest = this; }
  send(message: string) { this.sent.push(JSON.parse(message)); }
  close() { this.readyState = 3; this.onclose?.(); }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }); }
}
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const click = async (text: string) => {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text));
  expect(button).toBeDefined();
  await act(async () => button!.click());
};
const fill = async (label: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers(); vi.stubGlobal("WebSocket", FakeSocket);
  vi.mocked(discoverRooms).mockReset().mockResolvedValue([room]);
  localStorage.clear();
  localStorage.setItem("last-city-workers-v2", JSON.stringify({ ...g.emptyState(), money: 777, paused: true }));
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it("joins from the phone UI, sends commands without overwriting offline saves, and recovers from disconnect", async () => {
  await act(async () => root.render(<App />));
  await click("Multiplayer");
  expect([...container.querySelectorAll("button")].some((button) => button.textContent === "Oda kur")).toBe(false);
  expect(container.textContent).not.toContain("192.168");
  expect(container.querySelector('input[aria-label="Ev sahibinin IP adresi"]')).toBeNull();
  await fill("Oyuncu adı", "Test"); await click("Komşu çiftlik"); await fill("Katılım kodu", "123456");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  const socket = FakeSocket.latest;
  expect(socket.url).toBe("ws://192.168.1.20:4765/room");
  await act(async () => socket.open());
  expect(socket.sent[0]).toMatchObject({ type: "join", name: "Test", code: "123456", protocol: LAN_PROTOCOL, roomId: room.id });
  await act(async () => {
    socket.receive({ type: "joined", token: "secret", roomId: room.id });
    socket.receive({ type: "snapshot", playerId: "one", state: { ...g.emptyState(), timeMode: "continuous" }, players: [{ id: "one", name: "Test", online: true }], offers: [] });
  });
  expect(container.textContent).not.toContain("Sonraki güne geç");
  expect(container.querySelector(".clock-controls")!.textContent).toContain("24 SAAT");
  expect(container.querySelector(".clock-controls")!.textContent).not.toContain("GÜN");
  await click("Duraklat");
  expect(socket.sent[socket.sent.length - 1]).toEqual({ type: "command", command: { type: "togglePause", args: [] } });
  await act(async () => vi.advanceTimersByTime(3000));
  expect(JSON.parse(localStorage.getItem("last-city-workers-v2")!).money).toBe(777);
  expect(socket.sent).toHaveLength(2);
  await act(async () => socket.close());
  expect(container.textContent).toContain("Bağlantı kesildi");
  expect(container.querySelector<HTMLFieldSetElement>("fieldset")!.disabled).toBe(true);
  vi.mocked(discoverRooms).mockResolvedValue([{ ...room, address: "192.168.1.99:4765" }]);
  await click("Yeniden bağlan");
  await act(async () => FakeSocket.latest.open());
  expect(FakeSocket.latest.sent[0].token).toBe("secret");
  expect(FakeSocket.latest.url).toBe("ws://192.168.1.99:4765/room");
  await click("Vazgeç");
  expect(container.querySelector(".wallet")!.textContent).toContain("777");
  expect(container.textContent).toContain("Sonraki güne geç");
});
it("announces new sales once across screens and clears stale notices", async () => {
  await act(async () => root.render(<App />));
  await click("Multiplayer");
  await fill("Oyuncu adı", "Test"); await click("Komşu çiftlik"); await fill("Katılım kodu", "123456");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  const socket = FakeSocket.latest;
  await act(async () => socket.open());
  const old = { id: "old", sellerId: "seller", sellerName: "Ali", resource: "wood", quantity: 3, total: 25 };
  const fresh = { ...old, id: "fresh", quantity: 5, total: 40 };
  const own = { ...old, id: "own", sellerId: "one" };
  const snapshot = (offers: typeof old[]) => ({ type: "snapshot", playerId: "one", state: { ...g.emptyState(), timeMode: "continuous" }, players: [], offers });
  const receive = (offers: typeof old[]) => act(async () => socket.receive(snapshot(offers)));
  const notices = () => container.querySelectorAll(".market-notice");
  await receive([old]);
  expect(notices()).toHaveLength(0);
  await click("Üretim");
  await receive([old, fresh, own]);
  expect(notices()).toHaveLength(1);
  expect(notices()[0].textContent).toContain("Ali, 5 adet Odun");
  expect(notices()[0].textContent).toContain("40₺");
  await receive([old, fresh, own]);
  expect(notices()).toHaveLength(1);
  await click("Pazara git");
  expect([...container.querySelectorAll("h1")].some((heading) => heading.textContent === "Oyuncu pazarı")).toBe(true);
  expect(notices()).toHaveLength(0);
  await receive([old, fresh, own]);
  expect(notices()).toHaveLength(0);
  const second = { ...fresh, id: "second" };
  await receive([old, fresh, second]);
  expect(notices()).toHaveLength(1);
  await receive([old, fresh]);
  expect(notices()).toHaveLength(0);
  await receive([old, fresh, { ...fresh, id: "third" }]);
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Pazar bildirimini kapat"]')!.click());
  expect(notices()).toHaveLength(0);
  await receive([old, fresh, { ...fresh, id: "fourth" }]);
  expect(notices()).toHaveLength(1);
  await act(async () => socket.close());
  expect(notices()).toHaveLength(0);
  await click("Multiplayer");
  await click("Yeniden bağlan");
  await act(async () => { FakeSocket.latest.open(); FakeSocket.latest.receive(snapshot([old, fresh])); });
  expect(notices()).toHaveLength(0);
});
it("refreshes the room list and removes closed rooms", async () => {
  await act(async () => root.render(<App />));
  await click("Multiplayer");
  expect(container.textContent).toContain("Komşu çiftlik");
  await click("Komşu çiftlik");
  expect(container.querySelector('input[aria-label="Katılım kodu"]')).not.toBeNull();
  vi.mocked(discoverRooms).mockResolvedValue([]);
  await click("Listeyi yenile");
  expect(container.textContent).toContain("Henüz açık oda bulunamadı");
  expect(container.querySelector('input[aria-label="Katılım kodu"]')).toBeNull();
});

it("opens Multiplayer beside new game and preserves room setup while navigating", async () => {
  await act(async () => root.render(<App />));
  const multiplayer = [...container.querySelectorAll("button")].find((button) => button.textContent === "Multiplayer")!;
  expect(multiplayer.previousElementSibling?.textContent).toContain("Yeni oyun");
  expect(container.querySelector<HTMLElement>(".network-panel")!.hidden).toBe(true);
  expect(discoverRooms).not.toHaveBeenCalled();
  expect(container.querySelector(".network-toggle")).toBeNull();
  await click("Multiplayer");
  expect(container.querySelector<HTMLElement>(".network-panel")!.hidden).toBe(false);
  expect(container.querySelector<HTMLFieldSetElement>(".game-content")!.hidden).toBe(true);
  expect(container.textContent).toContain("Localhost / tarayıcı sürümünde oda kurma ve oda keşfi desteklenmez");
  await fill("Oyuncu adı", "Test");
  await click("Komşu çiftlik");
  await fill("Katılım kodu", "123456");
  await click("Üretim");
  expect(container.querySelector<HTMLElement>(".network-panel")!.hidden).toBe(true);
  expect(container.querySelector<HTMLFieldSetElement>(".game-content")!.hidden).toBe(false);
  await click("Multiplayer");
  expect(container.querySelector<HTMLInputElement>('input[aria-label="Oyuncu adı"]')!.value).toBe("Test");
  expect(container.querySelector<HTMLInputElement>('input[aria-label="Katılım kodu"]')!.value).toBe("123456");
});
