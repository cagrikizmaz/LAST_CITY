import type { GameState, Resource } from "./game";
export const LAN_PROTOCOL = 2;
export const LAN_PORT = 4765;
export const DISCOVERY_PORT = 4766;
export type DiscoveredRoom = { id: string; name: string; address: string; port: number; players: number; capacity: number; protocol: number };
export type TradeOffer = { id: string; sellerId: string; sellerName: string; resource: Resource; quantity: number; total: number };
export type PlayerOrder = { id: string; buyerId: string; buyerName: string; resource: Resource; quantity: number; total: number };
export type LanSnapshot = {
  type: "snapshot"; playerId: string; state: GameState;
  players: { id: string; name: string; online: boolean }[];
  offers: TradeOffer[];
  orders?: PlayerOrder[];
};
export type HostInfo = { room: DiscoveredRoom; code: string };
export type DesktopBridge = { startHost: (name: string) => Promise<HostInfo>; stopHost: () => Promise<void>; discoverRooms: () => Promise<DiscoveredRoom[]> };
declare global { interface Window { farmingDesktop?: DesktopBridge } }

export function roomUrl(address: string): string {
  const url = new URL(`ws://${address.trim()}`);
  const octets = url.hostname.split(".").map(Number);
  const privateAddress = octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    (octets[0] === 10 || octets[0] === 127 || (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 169 && octets[1] === 254));
  if (!privateAddress || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw new Error("Odanın bağlantı bilgisi geçersiz. Oda listesini yenileyip tekrar seçin.");
  if (!url.port) url.port = String(LAN_PORT);
  url.pathname = "/room";
  return url.toString();
}
