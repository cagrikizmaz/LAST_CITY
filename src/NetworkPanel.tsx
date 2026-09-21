import { useCallback, useEffect, useRef, useState } from "react";
import type { HostInfo, DiscoveredRoom } from "./lanProtocol";
import { discoverRooms } from "./roomDiscovery";
import type { useGameSession } from "./useGameSession";

type Session = ReturnType<typeof useGameSession>;
function lastConnection() {
  try { return JSON.parse(localStorage.getItem("farming-lan-last") ?? "{}"); } catch { return {}; }
}
export function NetworkPanel({ session, active }: { session: Session; active: boolean }) {
  const [name, setName] = useState<string>(() => lastConnection().name ?? "");
  const [roomName, setRoomName] = useState("");
  const [rooms, setRooms] = useState<DiscoveredRoom[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanned, setScanned] = useState(false);
  const scanGeneration = useRef(0);
  const scanningRef = useRef(false);
  const [code, setCode] = useState("");
  const [host, setHost] = useState<HostInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = session.status === "connected";
  const selected = rooms.find((room) => room.id === selectedId);
  const refresh = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    const generation = scanGeneration.current;
    setScanning(true); setScanError("");
    try {
      const found = await discoverRooms();
      if (generation === scanGeneration.current) setRooms(found);
    } catch (error) {
      if (generation === scanGeneration.current) { setRooms([]); setScanError(error instanceof Error ? error.message : "Odalar aranamadı."); }
    } finally {
      scanningRef.current = false;
      if (generation === scanGeneration.current) { setScanning(false); setScanned(true); }
    }
  }, []);
  useEffect(() => {
    if (!active || connected || session.status === "connecting") return;
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => { clearInterval(timer); scanGeneration.current++; scanningRef.current = false; };
  }, [active, connected, session.status, refresh]);
  const hostRoom = async () => {
    setBusy(true); session.setError("");
    try {
      if (!name.trim()) throw new Error("Önce oyuncu adınızı yazın.");
      const info = await window.farmingDesktop!.startHost(roomName.trim() || `${name.trim()} çiftliği`);
      setHost(info); setCode(info.code);
      session.connect(info.room, info.code, name);
    } catch (error) { session.setError(error instanceof Error ? error.message : "Oda açılamadı."); }
    finally { setBusy(false); }
  };
  return <section className="network-panel" hidden={!active} aria-label="Multiplayer">
    <div className="network-heading">
      {active && <h1>Multiplayer</h1>}
      <span>{connected ? `${session.snapshot!.players.filter((p) => p.online).length} oyuncu · Oyuncular ve ticaret` : "Oda kur veya açık bir odaya katıl"}</span>
    </div>
    {session.error && <p className="network-error" role="alert">{session.error} <button onClick={() => session.setError("")} aria-label="Bağlantı mesajını kapat">×</button></p>}
    {session.status === "disconnected" && <div className="network-status" role="status">
      Bağlantı kesildi. Çevrim içi işlemler durduruldu; çiftliğiniz ev sahibi bilgisayarda saklanır.
      <button onClick={session.reconnect}>Yeniden bağlan</button><button onClick={session.disconnect}>Tek oyunculuya dön</button>
    </div>}
    {session.status === "connecting" && <div className="network-status" role="status">Odaya bağlanılıyor… <button onClick={session.disconnect}>Vazgeç</button></div>}
    <div className="network-content">
      <p>Herkes kendi çiftliğini yönetir, oyuncu pazarında ürün alıp satar. Aynı Wi-Fi veya yerel ağa bağlanın. Odayı açan bilgisayar açık kalmalı.</p>
      {host && <div className="host-details">
        <strong>{host.room.name} · Katılım kodu: <b>{host.code}</b></strong>
        <span>Odanız aynı ağdaki oyuncuların listesinde görünür. Arkadaşlarınız odanızı seçip bu kodla katılabilir.</span>
        <small>Windows sorarsa Farming için özel ağ erişimine izin verin. Misafir Wi-Fi cihazları birbirinden ayırabilir.</small>
        <button disabled={busy} onClick={async () => {
          if (!window.confirm("Oda kapanacak ve tüm oyuncuların bağlantısı kesilecek. Çiftlikler kayıtlı kalır. Devam edilsin mi?")) return;
          setBusy(true);
          try { await window.farmingDesktop!.stopHost(); setHost(null); session.disconnect(); }
          catch (error) { session.setError(String(error)); } finally { setBusy(false); }
        }}>Odayı kapat</button>
      </div>}
      {!connected && session.status !== "connecting" && <>
        {!window.farmingDesktop && <p className="hosting-note">Oda kurmak için Windows masaüstü uygulamasını (Farming.exe) açın. Localhost / tarayıcı sürümünde oda kurma ve oda keşfi desteklenmez. Android uygulaması açık odalara katılabilir.</p>}
        <div className="network-form">
        <label>Oyuncu adı<input aria-label="Oyuncu adı" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} required /></label>
        {window.farmingDesktop && !host && <>
          <label>Oda adı<input aria-label="Oda adı" placeholder="Çiftliğine bir isim ver" maxLength={40} value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label>
          <button type="button" disabled={busy} onClick={hostRoom}>{busy ? "Oda açılıyor…" : "Oda kur"}</button>
        </>}
        </div>
        <div className="room-list-heading"><h2>Açık odalar</h2><button disabled={scanning} onClick={() => void refresh()}>{scanning ? "Odalar aranıyor…" : "Listeyi yenile"}</button></div>
        {scanError && <p role="alert">{scanError}</p>}
        {!rooms.length && <p role="status">{!scanned || scanning ? "Aynı ağdaki odalar aranıyor…" : "Henüz açık oda bulunamadı. Bir arkadaşın bilgisayardan oda kursun; aynı Wi-Fi ağında olduğunuzdan emin olun."}</p>}
        <div className="room-list" aria-label="Açık odalar">
          {rooms.map((room) => <button type="button" className="room-card" key={room.id} aria-pressed={selectedId === room.id}
            onClick={() => { setSelectedId(room.id); setCode(""); session.setError(""); }}>
            <strong>{room.name}</strong><span>{room.players} / {room.capacity} oyuncu · Katılım kodu gerekli</span>
            <small>{selectedId === room.id ? "Seçildi" : "Odayı seç"}</small>
          </button>)}
        </div>
        {selected && <form className="network-form" onSubmit={(event) => { event.preventDefault(); session.connect(selected, code, name); }}>
          <label>{selected.name} · Katılım kodu<input aria-label="Katılım kodu" placeholder="6 haneli kod" inputMode="numeric" pattern="[0-9]{6}" value={code} maxLength={6} onChange={(event) => setCode(event.target.value)} required /></label>
          <button type="submit" disabled={busy}>Odaya katıl</button>
        </form>}
        <p>İlk katılımda ayrı bir çiftlik açılır. Aynı cihaz ve oyuncu adıyla aynı odaya dönünce kayıt devam eder. Bağlı olmadığınızda çiftliğiniz ilerlemez.</p>
      </>}
      {connected && session.snapshot && <>
        <div className="network-players">{session.snapshot.players.map((player) => <span key={player.id} className={player.online ? "online" : ""}>
          {player.online ? "●" : "○"} {player.name}{player.id === session.snapshot!.playerId ? " (sen)" : ""}
        </span>)}<button onClick={session.disconnect}>Odadan ayrıl</button></div>

      </>}
    </div>
  </section>;
}
