import { Capacitor, registerPlugin } from "@capacitor/core";
import type { DiscoveredRoom } from "./lanProtocol";
const nativeDiscovery = registerPlugin<{ discoverRooms(): Promise<{ rooms: DiscoveredRoom[] }> }>("LanDiscovery");
async function scan(): Promise<DiscoveredRoom[]> {
  if (window.farmingDesktop) return window.farmingDesktop.discoverRooms();
  if (Capacitor.getPlatform() === "android") return (await nativeDiscovery.discoverRooms()).rooms;
  throw new Error("Oda listesini görmek için Farming EXE veya Android uygulamasını açın.");
}
let pending: Promise<DiscoveredRoom[]> | null = null;
export function discoverRooms(): Promise<DiscoveredRoom[]> {
  pending ??= scan().finally(() => { pending = null; });
  return pending;
}
