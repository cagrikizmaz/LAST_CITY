import { createSocket } from "node:dgram";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { DISCOVERY_PORT, LAN_PROTOCOL, roomUrl, type DiscoveredRoom } from "../src/lanProtocol";

export function broadcastAddresses() {
  const result = new Set(["255.255.255.255", "127.0.0.1"]);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) {
    if (entry.family !== "IPv4" || entry.internal) continue;
    const mask = entry.netmask.split(".").map(Number);
    result.add(entry.address.split(".").map((n, i) => Number(n) | (255 ^ mask[i])).join("."));
  }
  return [...result];
}

type Advertisement = Omit<DiscoveredRoom, "address">;
export async function startDiscoveryResponder(getRoom: () => Advertisement, port = DISCOVERY_PORT) {
  const socket = createSocket("udp4");
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(port, "0.0.0.0", () => { socket.removeListener("error", reject); resolve(); });
  }).catch((error) => { socket.close(); throw error; });
  socket.on("error", () => {});
  let replies = 0;
  let windowStart = Date.now();
  socket.on("message", (raw, sender) => {
    if (raw.length > 512) return;
    try {
      const query = JSON.parse(raw.toString());
      if (query.service !== "farming-lan" || query.type !== "discover" || !/^[a-f0-9]{32}$/.test(query.nonce)) return;
      // Only answer local senders; never disclose the room's participation code.
      roomUrl(sender.address);
      if (Date.now() - windowStart > 1000) { replies = 0; windowStart = Date.now(); }
      if (++replies > 100) return;
      const response = Buffer.from(JSON.stringify({ service: "farming-lan", type: "room", nonce: query.nonce, room: getRoom() }));
      socket.send(response, sender.port, sender.address, () => {});
    } catch { /* Ignore unrelated or malformed datagrams. */ }
  });
  return { port: socket.address().port, close: () => new Promise<void>((resolve) => socket.close(() => resolve())) };
}

export async function discoverRooms(options: { port?: number; timeoutMs?: number; targets?: string[] } = {}): Promise<DiscoveredRoom[]> {
  const socket = createSocket("udp4");
  const nonce = randomBytes(16).toString("hex");
  const query = Buffer.from(JSON.stringify({ service: "farming-lan", type: "discover", nonce }));
  const rooms = new Map<string, DiscoveredRoom>();
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.bind(0, "0.0.0.0", () => { socket.removeListener("error", reject); resolve(); });
  }).catch((error) => { socket.close(); throw error; });
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (error?: Error) => {
      if (done) return;
      done = true; clearTimeout(timeout); clearInterval(retry); socket.close();
      if (error) reject(error); else resolve([...rooms.values()].sort((a, b) => a.name.localeCompare(b.name, "tr")));
    };
    const timeout = setTimeout(() => finish(), options.timeoutMs ?? 2200);
    const send = () => {
      for (const target of options.targets ?? broadcastAddresses()) socket.send(query, options.port ?? DISCOVERY_PORT, target, () => {});
    };
    const retry = setInterval(send, 650);
    socket.on("error", (error) => finish(error));
    socket.on("message", (raw, sender) => {
      if (done || raw.length > 2048) return;
      try {
        const response = JSON.parse(raw.toString());
        const room = response.room;
        if (response.service !== "farming-lan" || response.type !== "room" || response.nonce !== nonce || !room ||
            !/^[a-f0-9-]{36}$/.test(room.id) || typeof room.name !== "string" || !room.name.trim() || room.name.length > 40 ||
            !Number.isInteger(room.port) || room.port < 1 || room.port > 65535 || room.protocol !== LAN_PROTOCOL ||
            !Number.isInteger(room.players) || room.players < 0 || !Number.isInteger(room.capacity) || room.capacity < 1 || room.capacity > 16 || room.players > room.capacity) return;
        const address = `${sender.address}:${room.port}`;
        roomUrl(address);
        const previous = rooms.get(room.id);
        if (!previous || previous.address.startsWith("127.")) rooms.set(room.id, {
          id: room.id, name: room.name, port: room.port, protocol: room.protocol, players: room.players, capacity: room.capacity, address,
        });
      } catch { /* Discovery traffic is untrusted. */ }
    });
    try { socket.setBroadcast(true); send(); } catch (error) { finish(error as Error); }
  });
}
