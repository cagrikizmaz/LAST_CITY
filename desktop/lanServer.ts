import { createServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { startDiscoveryResponder } from "./discovery";
import { WebSocket, WebSocketServer } from "ws";
import * as g from "../src/game";
import { applyCommand } from "../src/commands";
import { LAN_PORT, LAN_PROTOCOL, type HostInfo, type LanSnapshot, type TradeOffer, type PlayerOrder } from "../src/lanProtocol";

type Player = { id: string; token: string; name: string; state: g.GameState };
type RoomData = { version: 1; id: string; name: string; code: string; players: Player[]; offers: TradeOffer[]; orders: PlayerOrder[] };
export async function startLanServer(options: { saveFile: string; port?: number; tickMs?: number; name?: string; discoveryPort?: number }) {
  let data: RoomData = { version: 1, id: randomUUID(), name: "Farming odası", code: String(randomInt(100000, 1000000)), players: [], offers: [], orders: [] };
  if (existsSync(options.saveFile)) {
    const saved = JSON.parse(readFileSync(options.saveFile, "utf8")) as RoomData;
    if (saved.version !== 1 || !Array.isArray(saved.players) || !Array.isArray(saved.offers) || !/^\d{6}$/.test(saved.code))
      throw new Error("Oda kaydı okunamadı. Kayıt dosyasını yedekleyip kontrol edin.");
    data = { ...saved, orders: saved.orders ?? [] };
    if (!data.id || !/^[a-f0-9-]{36}$/.test(data.id)) data.id = randomUUID();
    if (!data.name) data.name = "Farming odası";
    data.players = data.players.map((p) => ({ ...p, state: { ...g.loadGame(JSON.stringify(p.state)), timeMode: "continuous" } }));
  }
  if (options.name !== undefined) {
    if (typeof options.name !== "string" || !options.name.trim() || options.name.trim().length > 40) throw new Error("Oda adı 1–40 karakter olmalı.");
    data.name = options.name.trim();
  }
  const sockets = new Map<WebSocket, string>();
  const online = (id: string) => [...sockets.values()].includes(id);
  const save = () => {
    mkdirSync(dirname(options.saveFile), { recursive: true });
    writeFileSync(`${options.saveFile}.tmp`, JSON.stringify(data), "utf8");
    renameSync(`${options.saveFile}.tmp`, options.saveFile);
  };
  save();
  const send = (socket: WebSocket, message: unknown) => {
    if (socket.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 2_000_000) { socket.close(1013, "Connection too slow"); return; }
      socket.send(JSON.stringify(message));
    }
  };
  const broadcast = () => {
    const players = data.players.map(({ id, name }) => ({ id, name, online: online(id) }));
    for (const [socket, id] of sockets) {
      const player = data.players.find((p) => p.id === id);
      if (player) send(socket, { type: "snapshot", playerId: id, state: player.state, players, offers: data.offers, orders: data.orders } satisfies LanSnapshot);
    }
  };
  // Save before acknowledging a transaction; restore both farms if saving fails.
  const transaction = (operation: () => void) => {
    const before = structuredClone(data);
    try { operation(); save(); } catch (error) { data = before; throw error; }
  };
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Farming yerel ag odasi. Oyundaki Ayni ag menusu ile katilin.");
  });
  const wss = new WebSocketServer({ server, path: "/room", maxPayload: 16_384 });
  wss.on("connection", (socket, request) => {
    const origin = request.headers.origin;
    if (origin && origin !== "null" && origin !== "file://" && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      socket.close(1008, "Unsupported origin"); return;
    }
    if (wss.clients.size > 32) { socket.close(1013, "Room full"); return; }
    let alive = true;
    socket.on("pong", () => { alive = true; });
    const heartbeat = setInterval(() => {
      if (!alive) { socket.terminate(); return; }
      alive = false; socket.ping();
    }, 15_000);
    const joinTimeout = setTimeout(() => { if (!sockets.has(socket)) socket.close(1008, "Join timeout"); }, 10_000);
    let windowStart = Date.now();
    let messageCount = 0;
    socket.on("message", (raw) => {
      try {
        if (Date.now() - windowStart > 1000) { messageCount = 0; windowStart = Date.now(); }
        if (++messageCount > 30) throw new Error("Çok hızlı işlem yapılıyor; bir saniye bekleyin.");
        const message = JSON.parse(raw.toString());
        if (!message || typeof message !== "object") throw new Error("Geçersiz mesaj.");
        if (message.type === "join") {
          if (sockets.has(socket)) throw new Error("Zaten odaya bağlısınız.");
          if (message.protocol !== LAN_PROTOCOL) throw new Error("Oyun sürümleri farklı. EXE ve APK'yı birlikte güncelleyin.");
          if (message.roomId !== data.id) throw new Error("Oda değişmiş. Listeyi yenileyip odayı yeniden seçin.");
          if (message.code !== data.code) { send(socket, { type: "error", message: "Oda kodu yanlış." }); socket.close(1008); return; }
          if (typeof message.name !== "string" || !message.name.trim() || message.name.length > 24) throw new Error("Oyuncu adı 1–24 karakter olmalı.");
          if (message.token != null && (typeof message.token !== "string" || message.token.length > 80)) throw new Error("Geçersiz oyuncu anahtarı.");
          let player = data.players.find((p) => p.token === message.token);
          if (!player && message.token) throw new Error("Bu odada oyuncu kaydı bulunamadı. Oyuncu adını kontrol edin veya yeni bir adla katılın.");
          if (!player && data.players.length >= 16) throw new Error("Oda en fazla 16 oyuncu kaydı tutabilir.");
          if (player && online(player.id)) throw new Error("Bu oyuncu başka bir bağlantıda açık.");
          transaction(() => {
            if (!player) {
              player = { id: randomUUID(), token: randomUUID(), name: message.name.trim(), state: { ...g.emptyState(), timeMode: "continuous" } };
              data.players.push(player);
            } else player.name = message.name.trim();
            data.orders = data.orders.map((order) => order.buyerId === player!.id ? { ...order, buyerName: player!.name } : order);
            data.offers = data.offers.map((offer) => offer.sellerId === player!.id ? { ...offer, sellerName: player!.name } : offer);
          });
          sockets.set(socket, player!.id);
          clearTimeout(joinTimeout);
          send(socket, { type: "joined", token: player!.token, roomId: data.id });
          broadcast();
          return;
        }
        const player = data.players.find((p) => p.id === sockets.get(socket));
        if (!player) throw new Error("Önce odaya katılın.");
        transaction(() => {
          if (message.type === "command") {
            if (message.command?.type === "skipToMorning") throw new Error("Multiplayer’da zaman atlanamaz; üretim 24 saat devam eder.");
            if (message.command?.type === "newGame") throw new Error("Çevrim içi çiftlik sıfırlanamaz; tek oyunculu modda yeni oyun açabilirsiniz.");
            player.state = applyCommand(player.state, message.command);
          } else if (message.type === "offer" || message.type === "placeOrder") {
            const { resource, quantity, total } = message;
            if (!g.resources.includes(resource) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000 ||
                typeof total !== "number" || !Number.isFinite(total) || total < 0.01 || total > 1_000_000_000 || Math.abs(total * 100 - Math.round(total * 100)) > 0.00001)
              throw new Error("Ürün, adet veya toplam fiyat geçersiz.");
            if (message.type === "placeOrder") {
              if (player.state.money < total) throw new Error("Bakiyeniz yeterli değil.");
              if (player.state.stock[resource as g.Resource] + quantity > player.state.warehouseCapacity[resource as g.Resource]) throw new Error("Deponuzda yeterli yer yok.");
              if (data.orders.filter((order) => order.buyerId === player.id).length >= 20) throw new Error("En fazla 20 sipariş açabilirsiniz.");
              data.orders.push({ id: randomUUID(), buyerId: player.id, buyerName: player.name, resource, quantity, total });
              return;
            }
            if (player.state.stock[resource as g.Resource] < quantity) throw new Error("Satış için yeterli ürününüz yok.");
            if (data.offers.filter((offer) => offer.sellerId === player.id).length >= 20) throw new Error("En fazla 20 ilan açabilirsiniz.");
            data.offers.push({ id: randomUUID(), sellerId: player.id, sellerName: player.name, resource, quantity, total });
          } else if (message.type === "cancelPlayerOrder") {
            const order = data.orders.find((o) => o.id === message.id);
            if (!order || order.buyerId !== player.id) throw new Error("Bu sipariş size ait değil veya kaldırılmış.");
            data.orders = data.orders.filter((o) => o.id !== order.id);
          } else if (message.type === "fulfillPlayerOrder") {
            const order = data.orders.find((o) => o.id === message.id);
            if (!order) throw new Error("Sipariş zaten teslim edilmiş veya kaldırılmış.");
            if (order.buyerId === player.id) throw new Error("Kendi siparişinizi teslim edemezsiniz.");
            const buyer = data.players.find((p) => p.id === order.buyerId);
            if (!buyer) throw new Error("Sipariş sahibi bulunamadı.");
            if (player.state.stock[order.resource] < order.quantity) throw new Error("Teslimat için yeterli ürününüz yok.");
            if (buyer.state.money < order.total) throw new Error("Sipariş sahibinin bakiyesi yeterli değil.");
            if (buyer.state.stock[order.resource] + order.quantity > buyer.state.warehouseCapacity[order.resource]) throw new Error("Sipariş sahibinin deposunda yeterli yer yok.");
            player.state = g.addLedger({ ...player.state, money: player.state.money + order.total,
              stock: { ...player.state.stock, [order.resource]: player.state.stock[order.resource] - order.quantity } },
              `${buyer.name}: ${order.quantity} ${g.resourceNames[order.resource]} siparişi teslim edildi: +${order.total}₺.`, "system");
            buyer.state = g.addLedger({ ...buyer.state, money: buyer.state.money - order.total,
              stock: { ...buyer.state.stock, [order.resource]: buyer.state.stock[order.resource] + order.quantity } },
              `${player.name}: ${order.quantity} ${g.resourceNames[order.resource]} siparişi alındı: −${order.total}₺.`, "system");
            data.orders = data.orders.filter((o) => o.id !== order.id);
          } else if (message.type === "cancelOffer") {
            const offer = data.offers.find((o) => o.id === message.id);
            if (!offer || offer.sellerId !== player.id) throw new Error("Bu ilan size ait değil veya kaldırılmış.");
            data.offers = data.offers.filter((o) => o.id !== offer.id);
          } else if (message.type === "buy") {
            const offer = data.offers.find((o) => o.id === message.id);
            if (!offer) throw new Error("İlan zaten alınmış veya kaldırılmış.");
            if (offer.sellerId === player.id) throw new Error("Kendi ilanınızı satın alamazsınız.");
            const seller = data.players.find((p) => p.id === offer.sellerId)!;
            if (seller.state.stock[offer.resource] < offer.quantity) throw new Error("Satıcının stoğu artık yeterli değil.");
            if (player.state.money < offer.total) throw new Error("Bakiyeniz yeterli değil.");
            if (player.state.stock[offer.resource] + offer.quantity > player.state.warehouseCapacity[offer.resource]) throw new Error("Deponuzda yeterli yer yok.");
            seller.state = g.addLedger({ ...seller.state, money: seller.state.money + offer.total,
              stock: { ...seller.state.stock, [offer.resource]: seller.state.stock[offer.resource] - offer.quantity } },
              `${player.name}, ${offer.quantity} ${g.resourceNames[offer.resource]} satın aldı: +${offer.total}₺.`, "system");
            player.state = g.addLedger({ ...player.state, money: player.state.money - offer.total,
              stock: { ...player.state.stock, [offer.resource]: player.state.stock[offer.resource] + offer.quantity } },
              `${seller.name}: ${offer.quantity} ${g.resourceNames[offer.resource]} alındı: −${offer.total}₺.`, "system");
            data.offers = data.offers.filter((o) => o.id !== offer.id);
          } else throw new Error("Bilinmeyen işlem.");
        });
        broadcast();
      } catch (error) {
        send(socket, { type: "error", message: error instanceof Error ? error.message : "İşlem tamamlanamadı." });
      }
    });
    socket.on("error", () => {});
    socket.on("close", () => { clearTimeout(joinTimeout); clearInterval(heartbeat); sockets.delete(socket); broadcast(); });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? LAN_PORT, "0.0.0.0", () => { server.removeListener("error", reject); resolve(); });
  }).catch((error) => { wss.close(); throw error; });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : LAN_PORT;
  const advertisement = () => ({ id: data.id, name: data.name, port, players: new Set(sockets.values()).size, capacity: 16, protocol: LAN_PROTOCOL });
  const discovery = await startDiscoveryResponder(advertisement, options.discoveryPort).catch(async (error) => {
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw error;
  });
  let ticks = 0;
  const timer = setInterval(() => {
    for (const player of data.players) if (online(player.id) && !player.state.paused) player.state = g.simulateTick(player.state);
    if (++ticks % 5 === 0) {
      try { save(); } catch {
        for (const player of data.players) player.state = { ...player.state, paused: true };
        for (const socket of sockets.keys()) send(socket, { type: "error", message: "Oda kaydedilemiyor. Oyun duraklatıldı; sunucu bilgisayarın diskini kontrol edin." });
      }
    }
    broadcast();
  }, options.tickMs ?? 1000);
  let closed = false;
  return {
    info: { room: { ...advertisement(), address: `127.0.0.1:${port}` }, code: data.code } satisfies HostInfo,
    discoveryPort: discovery.port,
    close: async () => {
      if (closed) return;
      closed = true; clearInterval(timer);
      await discovery.close();
      for (const socket of wss.clients) { send(socket, { type: "error", message: "Oda sahibi sunucuyu kapattı. Çiftliğiniz kaydedildi." }); socket.close(1001); socket.terminate(); }
      save();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
