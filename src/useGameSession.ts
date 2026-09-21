import { useCallback, useEffect, useRef, useState } from "react";
import * as g from "./game";
import { applyCommand, type Dispatch } from "./commands";
import { LAN_PROTOCOL, roomUrl, type LanSnapshot, type DiscoveredRoom, type TradeOffer } from "./lanProtocol";
import { discoverRooms } from "./roomDiscovery";

const saveKey = "last-city-workers-v2";
export function useGameSession() {
  const [local, setLocal] = useState(() => {
    try { return g.refreshOrderPool(g.loadGame(localStorage.getItem(saveKey))); }
    catch { return g.emptyState(); }
  });
  const [snapshot, setSnapshot] = useState<LanSnapshot | null>(null);
  const [status, setStatus] = useState<"offline" | "connecting" | "connected" | "disconnected">("offline");
  const [error, setError] = useState("");
  const [marketNotices, setMarketNotices] = useState<TradeOffer[]>([]);
  const dismissMarketNotice = useCallback((id: string) => {
    setMarketNotices((notices) => notices.filter((offer) => offer.id !== id));
  }, []);
  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRef = useRef<{ room: DiscoveredRoom; code: string; name: string } | null>(null);
  const modeRef = useRef(false);
  useEffect(() => {
    if (local.paused || status !== "offline") return;
    const timer = window.setInterval(() => setLocal(g.simulateTick), 1000);
    return () => window.clearInterval(timer);
  }, [local.paused, status]);
  useEffect(() => {
    try { localStorage.setItem(saveKey, JSON.stringify(local)); } catch { /* Optional local save. */ }
  }, [local]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); socketRef.current?.close(); }, []);
  const send = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) { setError("Bağlantı yok. Önce odaya yeniden bağlanın."); return; }
    socket.send(JSON.stringify(message));
  }, []);
  const act: Dispatch = useCallback((command) => {
    if (modeRef.current) send({ type: "command", command });
    else setLocal((state) => applyCommand(state, command));
  }, [send]);
  const disconnect = useCallback(() => {
    modeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const socket = socketRef.current; socketRef.current = null; socket?.close();
    setSnapshot(null); setStatus("offline"); setError("");
    setMarketNotices([]);
  }, []);
  const connect = useCallback((room: DiscoveredRoom, code: string, name: string) => {
    try {
      const url = roomUrl(room.address);
      if (room.protocol !== LAN_PROTOCOL || !/^[a-f0-9-]{36}$/.test(room.id)) throw new Error("Oyun sürümleri farklı. Farming'i güncelleyin.");
      if (!/^\d{6}$/.test(code.trim())) throw new Error("Ev sahibi bilgisayardaki 6 haneli oda kodunu girin.");
      if (!name.trim() || name.trim().length > 24) throw new Error("Oyuncu adı 1–24 karakter olmalı.");
      const playerName = name.trim().toLocaleLowerCase("tr");
      const key = `farming-player:${room.id}:${playerName}`;
      const token = localStorage.getItem(key) ?? localStorage.getItem(`farming-player:${url}:${playerName}`);
      localStorage.setItem("farming-lan-last", JSON.stringify({ roomId: room.id, name: name.trim() }));
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.close();
      const socket = new WebSocket(url); socketRef.current = socket;
      modeRef.current = true;
      connectionRef.current = { room, code, name };
      setSnapshot(null); setStatus("connecting"); setError("");
      setMarketNotices([]);
      // The initial snapshot is the existing market, not a batch of new listings.
      let knownOffers: Set<string> | null = null;
      const current = () => socketRef.current === socket;
      timerRef.current = setTimeout(() => {
        if (current()) { setError("Odaya ulaşılamadı. Odanın açık olduğundan ve aynı ağa bağlı olduğunuzdan emin olun; listeyi yenileyin."); socket.close(); }
      }, 8000);
      socket.onopen = () => {
        if (current()) socket.send(JSON.stringify({ type: "join", roomId: room.id, protocol: LAN_PROTOCOL, name: name.trim(), code: code.trim(), token }));
      };
      socket.onmessage = (event) => {
        if (!current()) return;
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === "joined") {
            if (message.roomId !== room.id) throw new Error("Oda kimliği uyuşmuyor.");
            localStorage.setItem(key, message.token);
          } else if (message.type === "snapshot") {
            if (timerRef.current) clearTimeout(timerRef.current);
            const offers = (message as LanSnapshot).offers;
            const activeIds = new Set(offers.map((offer) => offer.id));
            const added = knownOffers === null ? [] : offers.filter((offer) =>
              !knownOffers!.has(offer.id) && offer.sellerId !== message.playerId);
            knownOffers = activeIds;
            setMarketNotices((notices) => [...notices.filter((offer) => activeIds.has(offer.id)), ...added].slice(-5));
            setSnapshot(message); setStatus("connected");
          } else if (message.type === "error") setError(message.message);
        } catch { setError("Sunucudan gelen veri okunamadı."); socket.close(); }
      };
      socket.onerror = () => { if (current()) setError("Bağlantı kurulamadı. Aynı ağa bağlanın; oda sahibinin Windows özel ağ iznini kontrol edip tekrar deneyin."); };
      socket.onclose = () => {
        if (!current()) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        setStatus("disconnected");
        setMarketNotices([]);
      };
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bağlantı açılamadı."); }
  }, []);
  return { state: snapshot?.state ?? local, act, snapshot, status, error, setError, connect, disconnect, send,
    marketNotices, dismissMarketNotice,
    reconnect: async () => {
      const previous = connectionRef.current;
      if (!previous) return;
      setError("");
      try {
        const rooms = await discoverRooms();
        if (connectionRef.current !== previous || !modeRef.current) return;
        const room = rooms.find((room) => room.id === previous.room.id);
        if (!room) throw new Error("Oda bulunamadı. Oda sahibinin oyunu açmasını bekleyip yeniden deneyin.");
        connect(room, previous.code, previous.name);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Oda bulunamadı."); }
    } };
}
