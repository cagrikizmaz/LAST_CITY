import * as g from "./game";

// The same commands run locally or on the room's authoritative server.
const handlers = {
  tradeResource: g.tradeResource,
  equipFromStock: g.equipFromStock,
  togglePause: g.togglePause,
  skipToMorning: g.skipToMorning,
  newGame: (_state: g.GameState) => g.emptyState(),
  purchaseSite: g.purchaseSite,
  upgradeSite: g.upgradeSite,
  changeWorkers: g.changeWorkers,
  hireForJob: g.hireForJob,
  upgradeWarehouse: g.upgradeWarehouse,
  upgradeEquipmentGroup: g.upgradeEquipmentGroup,
  buildShelter: g.buildShelter,
  upgradeHospital: g.upgradeHospital,
  hireDoctor: g.hireDoctor,
  buyMedicalSupply: g.buyMedicalSupply,
  adjustProduction: g.adjustProduction,
  setProduction: g.setProduction,
  fulfillOrder: g.fulfillOrder,
  abandonOrder: g.abandonOrder,
  buyEquipment: (state: g.GameState, site: string, type: g.EquipmentType, quantity = 1) => {
    if (state.money < g.equipmentTypes[type].price * quantity) return state;
    for (let i = 0; i < quantity; i++) state = g.buyEquipment(state, site, type);
    return state;
  },
  acceptOrder: (state: g.GameState, id: number) => {
    if (state.order) return state;
    const accepted = g.acceptOrder(state, id);
    return accepted.order && g.canFulfillOrder(accepted) ? g.fulfillOrder(accepted) : accepted;
  },
  dismissNotice: (state: g.GameState, id: number) => ({
    ...state, laborNotices: state.laborNotices.filter((notice) => notice.id !== id),
  }),
};
type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest] ? Rest : never;
export type GameCommand = {
  [K in keyof typeof handlers]: { type: K; args: Tail<Parameters<(typeof handlers)[K]>> }
}[keyof typeof handlers];
export type Dispatch = (command: GameCommand) => void;

export function applyCommand(state: g.GameState, value: unknown): g.GameState {
  if (!value || typeof value !== "object") throw new Error("Geçersiz komut.");
  const { type, args } = value as { type: string; args: unknown[] };
  if (!Object.prototype.hasOwnProperty.call(handlers, type) || !Array.isArray(args)) throw new Error("Geçersiz komut.");
  const int = (v: unknown, min = 0, max = 1_000_000): v is number =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
  const site = (v: unknown) => g.siteDefinitions.some((s) => s.id === v);
  const resource = (v: unknown) => g.resources.includes(v as g.Resource);
  let valid = false;
  switch (type) {
    case "purchaseSite": case "upgradeSite": valid = args.length === 1 && site(args[0]); break;
    case "changeWorkers": valid = args.length === 2 && resource(args[0]) && (args[1] === -1 || args[1] === 1); break;
    case "hireForJob": case "upgradeWarehouse": valid = args.length === 1 && resource(args[0]); break;
    case "upgradeEquipmentGroup": valid = args.length === 1 && Array.isArray(args[0]) && args[0].length <= 1000 && args[0].every((n) => int(n)); break;
    case "buyMedicalSupply": valid = args.length === 1 && g.supplyTypes.includes(args[0] as g.MedicalSupply); break;
    case "adjustProduction": valid = args.length === 3 && site(args[0]) && resource(args[1]) && (args[2] === -1 || args[2] === 1); break;
    case "setProduction": valid = args.length === 3 && site(args[0]) && resource(args[1]) && int(args[2]); break;
    case "tradeResource": valid = args.length === 3 && resource(args[0]) && int(args[1], 1) && (args[2] === "buy" || args[2] === "sell"); break;
    case "equipFromStock":
    case "buyEquipment": valid = (args.length === 3 || args.length === 2) && site(args[0]) && typeof args[1] === "string" && Object.prototype.hasOwnProperty.call(g.equipmentTypes, args[1]) && (args.length === 2 || int(args[2], 1, 1000)); break;
    case "acceptOrder": case "dismissNotice": valid = args.length === 1 && int(args[0]); break;
    default: valid = args.length === 0;
  }
  if (!valid) throw new Error("Komut değerleri geçersiz.");
  const handler = handlers[type as keyof typeof handlers] as (state: g.GameState, ...args: unknown[]) => g.GameState;
  return handler(state, ...args);
}
