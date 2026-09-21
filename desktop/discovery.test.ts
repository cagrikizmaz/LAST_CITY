import { expect, it } from "vitest";
import { createSocket } from "node:dgram";
import { randomUUID } from "node:crypto";
import { broadcastAddresses, discoverRooms, startDiscoveryResponder } from "./discovery";
import { LAN_PROTOCOL } from "../src/lanProtocol";
const advertisement = () => ({ id: randomUUID(), name: "Test çiftliği", port: 4765, players: 2, capacity: 16, protocol: LAN_PROTOCOL });
it("discovers rooms by UDP, deduplicates replies, and removes closed rooms", async () => {
  const room = advertisement();
  const responder = await startDiscoveryResponder(() => room, 0);
  try {
    const rooms = await discoverRooms({ port: responder.port, timeoutMs: 750, targets: ["127.0.0.1"] });
    expect(rooms).toEqual([{ ...room, address: "127.0.0.1:4765" }]);
    expect(JSON.stringify(rooms)).not.toContain("code");
  } finally { await responder.close(); }
  expect(await discoverRooms({ port: responder.port, timeoutMs: 100, targets: ["127.0.0.1"] })).toEqual([]);
});
it("ignores responses with the wrong nonce, incompatible versions, or invalid room fields", async () => {
  const fake = createSocket("udp4");
  await new Promise<void>((resolve) => fake.bind(0, "127.0.0.1", resolve));
  fake.on("message", (raw, peer) => {
    const query = JSON.parse(String(raw));
    for (const patch of [ { nonce: "wrong" }, { room: { ...advertisement(), protocol: -1 } }, { room: { ...advertisement(), port: 70000 } }, { room: { ...advertisement(), players: 99 } } ]) {
      fake.send(JSON.stringify({ service: "farming-lan", type: "room", nonce: query.nonce, room: advertisement(), ...patch }), peer.port, peer.address);
    }
  });
  try { expect(await discoverRooms({ port: fake.address().port, timeoutMs: 100, targets: ["127.0.0.1"] })).toEqual([]); }
  finally { fake.close(); }
});
it("includes adapter broadcast destinations without requiring user input", () => {
  expect(broadcastAddresses()).toContain("255.255.255.255");
  expect(broadcastAddresses()).toContain("127.0.0.1");
});
