import { afterEach, beforeEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { startLanServer } from "./lanServer";
import * as g from "../src/game";
import { LAN_PROTOCOL } from "../src/lanProtocol";
let directory: string;
let saveFile: string;
let room: Awaited<ReturnType<typeof startLanServer>>;
const clients: WebSocket[] = [];
type Message = Record<string, any>;
async function client(token?: string, name = "Oyuncu", code = room.info.code) {
  const ws = new WebSocket(`ws://127.0.0.1:${room.info.room.port}/room`);
  clients.push(ws);
  const messages: Message[] = [];
  ws.on("message", (raw) => messages.push(JSON.parse(String(raw))));
  const next = async (predicate: (message: Message) => boolean) => {
    for (let i = 0; i < 200; i++) {
      const index = messages.findIndex(predicate);
      if (index >= 0) return messages.splice(index, 1)[0];
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(`Message timeout: ${JSON.stringify(messages)}`);
  };
  await new Promise<void>((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const send = (message: unknown) => ws.send(JSON.stringify(message));
  send({ type: "join", protocol: LAN_PROTOCOL, code, token, name, roomId: room.info.room.id });
  return { ws, send, next, messages, snapshot: () => next((m) => m.type === "snapshot") };
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "farming-lan-test-"));
  saveFile = join(directory, "room.json");
  const state = { ...g.emptyState(), paused: true };
  writeFileSync(saveFile, JSON.stringify({ version: 1, code: "123456", offers: [], players: [
    { id: "seller", token: "seller-token", name: "Seller", state: { ...state, stock: { ...state.stock, wood: 20 } } },
    { id: "buyer", token: "buyer-token", name: "Buyer", state },
    { id: "buyer2", token: "buyer2-token", name: "Buyer 2", state },
  ] }));
  room = await startLanServer({ saveFile, port: 0, discoveryPort: 0, tickMs: 20 });
});
afterEach(async () => {
  for (const socket of clients.splice(0)) socket.terminate();
  await room.close();
  rmSync(directory, { recursive: true, force: true });
});
it("keeps farms private and rejects incorrect room codes", async () => {
  const wrong = await client(undefined, "Wrong", "000000");
  expect((await wrong.next((m) => m.type === "error")).message).toContain("kod");
  const a = await client("seller-token"); const b = await client("buyer-token");
  const first = await a.snapshot(); await b.snapshot();
  expect(first.state.timeMode).toBe("continuous");
  a.send({ type: "command", command: { type: "skipToMorning", args: [] } });
  expect((await a.next((m) => m.type === "error")).message).toContain("zaman atlanamaz");
  expect(first.state.stock.wood).toBe(20);
  expect(JSON.stringify(first)).not.toContain("seller-token");
  a.send({ type: "command", command: { type: "purchaseSite", args: ["lumber"] } });
  expect((await a.next((m) => m.type === "snapshot" && m.state.money === 150)).state.sites.lumber).toBeDefined();
  expect((await b.snapshot()).state.money).toBe(250);
  const duplicate = await client("seller-token");
  expect((await duplicate.next((m) => m.type === "error")).message).toContain("başka");
});
it("persists player orders and settles delivery only once", async () => {
  const buyer = await client("buyer-token", "Buyer");
  await buyer.snapshot();
  buyer.send({ type: "placeOrder", resource: "wood", quantity: 10, total: 40 });
  const placed = await buyer.next((m) => m.type === "snapshot" && m.orders.length === 1);
  expect(placed.state.stock.wood).toBe(0);
  expect(placed.state.money).toBe(250);
  const id = placed.orders[0].id;
  await room.close();
  room = await startLanServer({ saveFile, port: 0, discoveryPort: 0, tickMs: 20 });
  const seller = await client("seller-token", "Seller");
  expect((await seller.snapshot()).orders[0].id).toBe(id);
  seller.send({ type: "fulfillPlayerOrder", id });
  seller.send({ type: "fulfillPlayerOrder", id });
  const delivered = await seller.next((m) => m.type === "snapshot" && m.state.money === 290);
  expect(delivered.state.stock.wood).toBe(10);
  expect(delivered.orders).toHaveLength(0);
  expect((await seller.next((m) => m.type === "error")).message).toContain("zaten teslim");
  const saved = JSON.parse(readFileSync(saveFile, "utf8"));
  const recipient = saved.players.find((p: any) => p.id === "buyer");
  expect(recipient.state.stock.wood).toBe(10);
  expect(recipient.state.money).toBe(210);
});
it("validates order requests, ownership and delivery stock", async () => {
  const buyer = await client("buyer-token"); const seller = await client("seller-token");
  await buyer.snapshot(); await seller.snapshot();
  for (const fields of [
    { resource: "missing", quantity: 1, total: 10 },
    { resource: "wood", quantity: 0, total: 10 },
    { resource: "wood", quantity: 1, total: 0 },
    { resource: "wood", quantity: 1, total: 300 },
    { resource: "wood", quantity: 101, total: 10 },
  ]) {
    buyer.send({ type: "placeOrder", ...fields });
    await buyer.next((m) => m.type === "error");
  }
  buyer.send({ type: "placeOrder", resource: "wood", quantity: 21, total: 40 });
  const placed = await buyer.next((m) => m.type === "snapshot" && m.orders.length === 1);
  const id = placed.orders[0].id;
  buyer.send({ type: "fulfillPlayerOrder", id });
  expect((await buyer.next((m) => m.type === "error")).message).toContain("Kendi");
  seller.send({ type: "cancelPlayerOrder", id });
  expect((await seller.next((m) => m.type === "error")).message).toContain("size ait");
  seller.send({ type: "fulfillPlayerOrder", id });
  expect((await seller.next((m) => m.type === "error")).message).toContain("yeterli ürün");
  buyer.send({ type: "cancelPlayerOrder", id });
  expect((await buyer.next((m) => m.type === "snapshot" && m.orders.length === 0)).state.money).toBe(250);
  const saved = JSON.parse(readFileSync(saveFile, "utf8"));
  expect(saved.players.find((p: any) => p.id === "seller").state.stock.wood).toBe(20);
});
it.each(["money", "warehouse"])("rechecks the buyer's %s before order delivery", async (constraint) => {
  const buyer = await client("buyer-token"); await buyer.snapshot();
  buyer.send({ type: "placeOrder", resource: "wood", quantity: 10, total: 40 });
  const placed = await buyer.next((m) => m.type === "snapshot" && m.orders.length === 1);
  await room.close();
  const saved = JSON.parse(readFileSync(saveFile, "utf8"));
  const recipient = saved.players.find((p: any) => p.id === "buyer");
  if (constraint === "money") recipient.state.money = 0;
  else recipient.state.stock.wood = recipient.state.warehouseCapacity.wood;
  writeFileSync(saveFile, JSON.stringify(saved));
  room = await startLanServer({ saveFile, port: 0, discoveryPort: 0, tickMs: 20 });
  const seller = await client("seller-token"); await seller.snapshot();
  seller.send({ type: "fulfillPlayerOrder", id: placed.orders[0].id });
  expect((await seller.next((m) => m.type === "error")).message).toContain(constraint === "money" ? "bakiyesi" : "deposunda");
  const unchanged = JSON.parse(readFileSync(saveFile, "utf8"));
  expect(unchanged.orders).toHaveLength(1);
  expect(unchanged.players.find((p: any) => p.id === "seller").state.stock.wood).toBe(20);
  expect(unchanged.players.find((p: any) => p.id === "seller").state.money).toBe(250);
});
it("settles a sale once when two buyers race, and persists both sides", async () => {
  const a = await client("seller-token", "Seller"); const b = await client("buyer-token"); const c = await client("buyer2-token");
  await a.snapshot(); await b.snapshot(); await c.snapshot();
  a.send({ type: "offer", resource: "wood", quantity: 10, total: 40 });
  const offered = await a.next((m) => m.type === "snapshot" && m.offers.length === 1);
  const id = offered.offers[0].id;
  b.send({ type: "buy", id }); c.send({ type: "buy", id });
  const sold = await a.next((m) => m.type === "snapshot" && m.state.money === 290);
  expect(sold.state.stock.wood).toBe(10); expect(sold.offers).toHaveLength(0);
  const saved = JSON.parse(readFileSync(saveFile, "utf8"));
  expect(saved.players.reduce((sum: number, p: any) => sum + p.state.money, 0)).toBe(750);
  expect(saved.players.reduce((sum: number, p: any) => sum + p.state.stock.wood, 0)).toBe(20);
  expect(saved.players.filter((p: any) => p.state.money === 210)).toHaveLength(1);
  expect(saved.offers).toHaveLength(0);
});
it("rejects invalid trades and unauthorized changes", async () => {
  const a = await client("seller-token"); const b = await client("buyer-token");
  await a.snapshot(); await b.snapshot();
  a.send({ type: "offer", resource: "wood", quantity: -10, total: 1 });
  expect((await a.next((m) => m.type === "error")).message).toContain("geçersiz");
  a.send({ type: "offer", resource: "wood", quantity: 21, total: 1 });
  expect((await a.next((m) => m.type === "error")).message).toContain("yeterli");
  b.send({ type: "command", command: { type: "newGame", args: [] } });
  expect((await b.next((m) => m.type === "error")).message).toContain("sıfırlanamaz");
  b.send({ type: "command", command: { type: "__proto__", args: [] } });
  expect((await b.next((m) => m.type === "error")).message).toContain("Geçersiz");
  a.send({ type: "offer", resource: "wood", quantity: 10, total: 300 });
  const offered = await a.next((m) => m.type === "snapshot" && m.offers.length === 1);
  b.send({ type: "buy", id: offered.offers[0].id });
  expect((await b.next((m) => m.type === "error")).message).toContain("Bakiyeniz");
  b.send({ type: "cancelOffer", id: offered.offers[0].id });
  expect((await b.next((m) => m.type === "error")).message).toContain("size ait");
  a.send({ type: "cancelOffer", id: offered.offers[0].id });
  expect((await a.next((m) => m.type === "snapshot" && m.offers.length === 0)).state.money).toBe(250);
});
it("resumes a saved farm after restarting the host", async () => {
  const originalRoomId = room.info.room.id;
  const a = await client("seller-token"); await a.snapshot();
  a.send({ type: "command", command: { type: "purchaseSite", args: ["lumber"] } });
  await a.next((m) => m.type === "snapshot" && m.state.money === 150);
  await room.close();
  room = await startLanServer({ saveFile, port: 0, discoveryPort: 0, tickMs: 20 });
  expect(room.info.room.id).toBe(originalRoomId);
  const again = await client("seller-token");
  const state = (await again.snapshot()).state;
  expect(state.money).toBe(150); expect(state.sites.lumber).toBeDefined();
});
it("does not transfer money or stock when the buyer's warehouse is full", async () => {
  await room.close();
  const saved = JSON.parse(readFileSync(saveFile, "utf8"));
  saved.players[1].state.stock.wood = 95;
  writeFileSync(saveFile, JSON.stringify(saved));
  room = await startLanServer({ saveFile, port: 0, discoveryPort: 0, tickMs: 20 });
  const a = await client("seller-token"); const b = await client("buyer-token");
  await a.snapshot(); await b.snapshot();
  a.send({ type: "offer", resource: "wood", quantity: 10, total: 40 });
  const offered = await a.next((m) => m.type === "snapshot" && m.offers.length === 1);
  b.send({ type: "buy", id: offered.offers[0].id });
  expect((await b.next((m) => m.type === "error")).message).toContain("Deponuzda");
  const unchanged = JSON.parse(readFileSync(saveFile, "utf8"));
  expect(unchanged.players[0].state.money).toBe(250);
  expect(unchanged.players[0].state.stock.wood).toBe(20);
  expect(unchanged.players[1].state.money).toBe(250);
  expect(unchanged.players[1].state.stock.wood).toBe(95);
  expect(unchanged.offers).toHaveLength(1);
});
it("creates a fresh farm and runs only connected farms on the server clock", async () => {
  const a = await client(undefined, "New farmer");
  const joined = await a.next((m) => m.type === "joined");
  expect(joined.token).toHaveLength(36);
  const first = await a.snapshot();
  expect(first.state.money).toBe(250);
  const later = await a.next((m) => m.type === "snapshot" && m.state.minuteOfDay > first.state.minuteOfDay);
  expect(later.playerId).toBe(first.playerId);
  const closed = new Promise<void>((resolve) => a.ws.once("close", () => resolve()));
  a.ws.close(); await closed;
  await new Promise((resolve) => setTimeout(resolve, 120));
  const saved1 = JSON.parse(readFileSync(saveFile, "utf8"));
  await new Promise((resolve) => setTimeout(resolve, 120));
  const saved2 = JSON.parse(readFileSync(saveFile, "utf8"));
  expect(saved2.players.find((p: any) => p.id === first.playerId).state.minuteOfDay)
    .toBe(saved1.players.find((p: any) => p.id === first.playerId).state.minuteOfDay);
});
