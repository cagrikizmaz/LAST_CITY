import { expect, it } from "vitest";
import * as g from "./game";
import { applyCommand } from "./commands";
import { roomUrl } from "./lanProtocol";
it("uses the same farm rules for local and network commands", () => {
  const state = { ...g.emptyState(), money: 1000 };
  const bought = applyCommand(state, { type: "purchaseSite", args: ["lumber"] });
  expect(bought).toEqual(g.purchaseSite(state, "lumber"));
  expect(applyCommand(bought, { type: "buyEquipment", args: ["lumber", "axe", 2] }))
    .toEqual(g.buyEquipment(g.buyEquipment(bought, "lumber", "axe"), "lumber", "axe"));
});
it.each([
  null, { type: "__proto__", args: [] }, { type: "simulateTick", args: [] },
  { type: "purchaseSite", args: ["missing"] }, { type: "buyEquipment", args: ["lumber", "axe", -2] },
  { type: "setProduction", args: ["lumber", "wood", Infinity] },
  { type: "upgradeEquipmentGroup", args: [["1"]] }, { type: "togglePause", args: [123] },
])("rejects malformed or unauthorized farm input %j", (command) => {
  const state = g.emptyState();
  expect(() => applyCommand(state, command)).toThrow();
  expect(state.money).toBe(250);
});
it("limits room connections to private IPv4 addresses", () => {
  expect(roomUrl("192.168.1.10")).toBe("ws://192.168.1.10:4765/room");
  expect(roomUrl("10.0.0.2:5555")).toBe("ws://10.0.0.2:5555/room");
  for (const host of ["example.com", "8.8.8.8", "192.168.1.1/evil", "user@192.168.1.1", "172.32.0.1"]) expect(() => roomUrl(host)).toThrow();
});
