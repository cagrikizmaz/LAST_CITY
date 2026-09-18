import { useEffect, useReducer, useState } from "react";
import { skipToMorning, isWorkingHours, formatGameTime, togglePause, isHoused, buildShelter, shelterCost, SHELTER_BEDS, warehouseResources, warehouseUpgradeCost, upgradeWarehouse, foodStock, hireForJob, levels, MAX_LEVEL, canFulfillOrder, consumptionNeeds, fulfillOrder, hiringCost, hireWorker, loadGame, resources, resourceNames, changeWorkers, emptyState, GameState, Resource, levelInfo, simulateTick } from "./game";

const saveKey = "last-city-workers-v2";
const productionPageSize = 15;
const money = (value: number) => `${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}₺`;
const matches = (text: string, query: string) => text.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
function reducer(state: GameState, action: { type: string; job?: Resource; delta?: 1 | -1; id?: number }) {
  if (action.type === "next-day") return skipToMorning(state);
  if (action.type === "pause") return togglePause(state);
  if (action.type === "dismiss") return { ...state, laborNotices: state.laborNotices.filter(n => n.id !== action.id) };
  if (action.type === "hire-job" && action.job) return hireForJob(state, action.job);
  if (action.type === "warehouse" && action.job) return upgradeWarehouse(state, action.job);
  if (action.type === "shelter") return buildShelter(state);
  if (action.type === "hire") return hireWorker(state);
  if (action.type === "fulfill") return fulfillOrder(state);
  if (action.type === "tick") return simulateTick(state);
  if (action.type === "staff" && action.job && action.delta) return changeWorkers(state, action.job, action.delta);
  if (action.type === "new") return emptyState();
  return state;
}
export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => { try { return loadGame(localStorage.getItem(saveKey)); } catch { return emptyState(); } });
  const [warehousePage, setWarehousePage] = useState(0);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("open");
  const [inventoryPage, setInventoryPage] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [focusTarget, setFocusTarget] = useState<{ level: number } | null>(null);
  const focusProduction = (level: number) => {
    setQuery("");
    setFilter("all");
    setPage(Math.floor(levels.indexOf(level) / productionPageSize));
    setFocusTarget({ level });
  };
  useEffect(() => {
    if (!focusTarget) return;
    const card = document.getElementById(`production-${focusTarget.level}`);
    card?.focus({ preventScroll: true });
    card?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [focusTarget]);
  useEffect(() => {
    if (state.paused) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(timer);
  }, [state.paused]);
  useEffect(() => { try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch { /* Storage is optional. */ } }, [state]);
  const needs = consumptionNeeds(state);
  const idle = state.workers.filter(w => w.job === "idle" && !w.strikeRemaining && isHoused(state, w.id)).length;
  const unhoused = Math.max(0, state.workers.length - state.shelterCapacity);
  const striking = state.workers.filter(w => w.strikeRemaining).length;
  const producing = !state.paused && isWorkingHours(state);
  const active = producing ? state.workers.filter(w => w.job !== "idle" && !w.strikeRemaining && isHoused(state, w.id) && state.stock[w.job] < state.warehouseCapacity[w.job]).length : 0;
  const total = resources.reduce((sum, resource) => sum + state.stock[resource], 0);
  const inventory = levels.filter(l => matches(resourceNames[levelInfo[l].job], inventoryQuery) && (inventoryFilter === "all" || (inventoryFilter === "stock" ? state.stock[levelInfo[l].job] > 0 : l <= state.level))).sort((a, b) => state.stock[levelInfo[a].job] - state.stock[levelInfo[b].job] || a - b);
  const inventoryPages = Math.max(1, Math.ceil(inventory.length / 8));
  const ip = Math.min(inventoryPage, inventoryPages - 1);
  const visible = levels.filter(l => matches(`${l} ${levelInfo[l].title} ${resourceNames[levelInfo[l].job]}`, query) && (filter === "all" || (filter === "open" ? l <= state.level : state.workers.some(w => w.job === levelInfo[l].job && (filter === "strike" ? !!w.strikeRemaining : producing && !w.strikeRemaining && isHoused(state, w.id) && state.stock[levelInfo[l].job] < state.warehouseCapacity[levelInfo[l].job])))));
  const pages = Math.max(1, Math.ceil(visible.length / productionPageSize));
  const cp = Math.min(page, pages - 1);
  const warehouse = warehouseResources(state);
  const warehousePages = Math.max(1, Math.ceil(warehouse.length / 8));
  const wp = Math.min(warehousePage, warehousePages - 1);
  const next = levelInfo[state.level + 1];
  return <div className="game-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">K</div><div><b>KÜLDEN</b><small>Her emek, yeni bir şehir.</small></div></div><div className="clock-controls" aria-label="Oyun saati"><div><small>{state.day}. GÜN</small><strong>{formatGameTime(state.minuteOfDay)}</strong><span>{state.paused ? "Duraklatıldı" : isWorkingHours(state) ? "Mesai: 08:00 / 20:00" : "Dinlenme: Mesai 08:00'da"}</span></div><button type="button" aria-pressed={state.paused} onClick={() => dispatch({ type: "pause" })}>{state.paused ? "Devam et" : "Duraklat"}</button>{!isWorkingHours(state) && <button type="button" className="next-day-button" title="08:00’a geç. Açık sipariş stok yeterliyse teslim edilir; yetersizse başarısız olur ve ödülün yarısı ceza kesilir." onClick={() => dispatch({ type: "next-day" })}>Sonraki güne geç</button>}</div><div className="live-status"><i />{active} işçi üretimde · %{state.shortage ? 50 : 100} hız</div><div className="treasury"><div className="wallet"><small>KASA</small><strong>{money(state.money)}</strong></div><section className="target-card"><span className="eyebrow">SONRAKİ HEDEF</span><h2>{next ? next.title : "Şehir tamamlandı"}</h2><p>{next ? `${money(Math.max(0, next.unlock - state.money))} daha kazan, seviye ${state.level + 1} açılsın.` : "100 üretim sahasının tamamına ulaştın."}</p><div className="progress"><i style={{ width: `${next ? Math.max(0, Math.min(100, state.money / next.unlock * 100)) : 100}%` }} /></div></section></div><button className="quiet" onClick={() => { dispatch({ type: "new" }); setPage(0); setFilter("all"); setQuery(""); }}>Yeni oyun</button></header>
    <div className="dashboard">
      <aside className="left-panel"><section className="inventory panel" aria-label="Envanter"><div className="section-top"><div><span className="eyebrow">MERKEZ DEPO</span><h2>Envanter <span>{total.toLocaleString("tr-TR")} ürün</span></h2></div><small>{state.level} / {MAX_LEVEL} ürün açıldı</small></div><div className="toolbar"><input aria-label="Envanterde ara" placeholder="Ürün ara…" value={inventoryQuery} onChange={e => { setInventoryQuery(e.target.value); setInventoryPage(0); }} /><select aria-label="Envanter filtresi" value={inventoryFilter} onChange={e => { setInventoryFilter(e.target.value); setInventoryPage(0); }}><option value="open">Açılan ürünler</option><option value="stock">Stokta olanlar</option><option value="all">Tüm ürünler (100)</option></select><div className="pager"><button aria-label="Önceki envanter sayfası" disabled={ip === 0} onClick={() => setInventoryPage(ip - 1)}>←</button><span>{ip + 1} / {inventoryPages}</span><button aria-label="Sonraki envanter sayfası" disabled={ip + 1 >= inventoryPages} onClick={() => setInventoryPage(ip + 1)}>→</button></div></div><div className="inventory-grid">{inventory.slice(ip * 8, ip * 8 + 8).map(l => <button type="button" onClick={() => focusProduction(l)} aria-label={`${resourceNames[levelInfo[l].job]} üretim sahasına git`} className={`stock-item ${l > state.level ? "locked" : ""}`} key={l}><span className="resource-icon">{levelInfo[l].icon}</span><span className="stock-details"><small>{resourceNames[levelInfo[l].job]}</small><strong>{l > state.level ? `Seviye ${l}` : state.stock[levelInfo[l].job].toLocaleString("tr-TR")}</strong></span></button>)}</div>{!inventory.length && <p className="empty">Bu filtrede ürün bulunamadı.</p>}</section>
        <section className="warehouse panel" aria-label="Depo"><span className="eyebrow">KAPASİTE YÖNETİMİ</span><h2>Depo</h2><p>Her yükseltme +100 kapasite sağlar. Deposu dolan ürünün üretimi durur; teslimat veya tüketimle yer açılınca devam eder.</p>
          <div className="warehouse-list">{warehouse.slice(wp * 8, wp * 8 + 8).map(resource => {
            const capacity = state.warehouseCapacity[resource];
            const percent = state.stock[resource] / capacity * 100;
            const cost = warehouseUpgradeCost(state, resource);
            return <div className={`warehouse-item ${percent >= 90 ? "near-full" : ""}`} key={resource} data-resource={resource}>
              <div className="warehouse-label"><strong>{resourceNames[resource]}</strong><span>{percent >= 100 ? "Dolu" : `%${Math.floor(percent)}`}</span></div>
              <small>{state.stock[resource].toLocaleString("tr-TR")} / {capacity.toLocaleString("tr-TR")} adet</small>
              <div className="progress" role="progressbar" aria-label={`${resourceNames[resource]} depo dolulu?u`} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.min(capacity, state.stock[resource])}><i style={{ width: `${Math.min(100, percent)}%` }} /></div>
              <button aria-label={`${resourceNames[resource]} deposunu y?kselt`} disabled={state.money < cost} onClick={() => dispatch({ type: "warehouse", job: resource })}>+100 kapasite ? {money(cost)}</button>
            </div>;
          })}</div>
          <div className="pager"><button aria-label="?nceki depo sayfas?" disabled={wp === 0} onClick={() => setWarehousePage(wp - 1)}>?</button><span>{wp + 1} / {warehousePages}</span><button aria-label="Sonraki depo sayfas?" disabled={wp + 1 >= warehousePages} onClick={() => setWarehousePage(wp + 1)}>?</button></div>
        </section></aside>
      <main className="production"><div className="production-heading"><div><span className="eyebrow">ŞEHRİ BİRLİKTE İNŞA ET</span><h1>Üretim sahaları</h1><p>100 seviye. Her yeni kaynak, yeni bir başlangıç.</p></div><span className="level-badge">SV. {String(state.level).padStart(2, "0")} <small>/ 100</small></span></div>
        <div className="team-bar"><div><strong>{state.workers.length} işçi</strong><span>{active} görevde <i>·</i> {idle} boşta{unhoused > 0 && <> <i>·</i> {unhoused} barınaksız</>}{striking > 0 && <> <i>·</i> {striking} grevde</>}</span></div><div className="hire-row"><button className="primary" disabled={state.money < hiringCost(state)} onClick={() => dispatch({ type: "hire" })}>+ Yeni işçi al <b>{money(hiringCost(state))}</b></button></div></div>
        <div className="labor-notices" aria-live="polite">{state.laborNotices.map(notice => <div className="labor-notice" key={notice.id}><span>{notice.text}</span><button aria-label="Bildirimi kapat" onClick={() => dispatch({ type: "dismiss", id: notice.id })}>×</button></div>)}</div>
        <div className="toolbar production-tools"><div className="tabs">{[["all", "Tüm sahalar"], ["open", "Açık"], ["active", "Üretimde"], ["strike", "Grevde"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? "selected" : ""} onClick={() => { setFilter(value); setPage(0); }}>{label}</button>)}</div><input aria-label="Üretim sahası ara" placeholder="Saha veya seviye ara…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></div>
        <div className="production-grid">{visible.slice(cp * productionPageSize, cp * productionPageSize + productionPageSize).map(l => { const info = levelInfo[l]; const locked = l > state.level; const full = state.stock[info.job] >= state.warehouseCapacity[info.job]; const assigned = state.workers.filter(w => w.job === info.job); const strikers = assigned.filter(w => w.strikeRemaining); const strikeTime = Math.max(0, ...strikers.map(w => w.strikeRemaining!)); const homeless = assigned.filter(w => !isHoused(state, w.id)); const workers = assigned.filter(w => !w.strikeRemaining && isHoused(state, w.id)); const progress = workers.length ? workers.reduce((sum, w) => sum + w.progress, 0) / workers.length : 0; return <article key={l} id={`production-${l}`} tabIndex={-1} aria-label={info.title} className={`production-card ${locked ? "is-locked" : ""} ${focusTarget?.level === l ? "is-focused" : ""}`}><div className={`card-art art-${Math.min(l, 6)}`}><span className="card-level">SEVİYE {String(l).padStart(2, "0")}</span><span className={`card-status ${producing && workers.length && !full ? "working" : ""}`}>{locked ? "KİLİTLİ" : full ? "DEPO DOLU" : strikers.length ? "⚠ GREV" : workers.length ? "● ÜRETİMDE" : homeless.length ? "BARINAK YOK" : "HAZIR"}</span><span className="art-icon">{info.icon}</span></div><div className="card-body"><h3>{info.title}</h3><div className="product-value"><span>{resourceNames[info.job]}</span><b title="Sipariş ödülünün hesabında kullanılan birim değer">{money(info.price)} <small>/ adet değer</small></b></div><div className="cycle"><span>{locked ? `${money(info.unlock)} kasa gerekli` : `${workers.length} işçi · ${full || !producing ? 0 : workers.length * (state.shortage ? 6 : 12)} adet/dk`}</span><span>{locked ? "◇" : `${Math.round(progress)}%`}</span></div><div className="progress"><i style={{ width: `${locked ? Math.max(0, Math.min(100, state.money / info.unlock * 100)) : progress}%` }} /></div><div className="staff-controls"><button aria-label={`${resourceNames[info.job]} işçi çıkart`} disabled={!assigned.some(w => !w.strikeRemaining) || locked} onClick={() => dispatch({ type: "staff", job: info.job, delta: -1 })}>− İşçi çıkart</button><strong aria-label="Atanan işçi sayısı">{assigned.length}</strong><button aria-label={`${resourceNames[info.job]} işçi ata`} disabled={!idle || locked} onClick={() => dispatch({ type: "staff", job: info.job, delta: 1 })}>+ İşçi ata</button></div>{strikers.length > 0 && <p className="strike-info">{strikers.length} işçi grevde · {Math.floor(strikeTime / 60)}:{String(strikeTime % 60).padStart(2, "0")} kaldı</p>}{homeless.length > 0 && <p className="warning">{homeless.length} işçi barınaksız, çalışamıyor.</p>}{!locked && <button className="replacement-button" title={state.workers.length >= state.shelterCapacity ? "Önce yeni barınak yap" : undefined} disabled={state.money < hiringCost(state) || state.workers.length >= state.shelterCapacity} onClick={() => dispatch({ type: "hire-job", job: info.job })}>İşçi al ve ata · {money(hiringCost(state))}</button>}</div></article>; })}</div>{!visible.length && <p className="empty">Saha bulunamadı. Filtreyi değiştirebilir veya kartlardan işçi atayabilirsin.</p>}<div className="pagination"><small>{visible.length} saha · sayfa başına {productionPageSize}</small><div className="pager"><button disabled={cp === 0} onClick={() => setPage(cp - 1)}>← Önceki</button><span>{cp + 1} / {pages}</span><button disabled={cp + 1 >= pages} onClick={() => setPage(cp + 1)}>Sonraki →</button></div></div>
      </main>
      <aside className="right-panel"><section className="panel order-card"><div className="section-top"><span className="eyebrow">TİCARET MERKEZİ</span><span className="live-dot">● CANLI</span></div><h2>Siparişler <span>↗</span></h2><p className="fine-print">Tek gelir kaynağın sipariş teslimatı. Üretim yalnızca depoyu doldurur. Teslimattan sonra yeni sipariş 15–25 sn içinde gelir; erken teslim ederek daha fazla sipariş alabilirsin.</p>{state.order ? <><div className="order-ticket"><small>TÜCCAR SİPARİŞİ #{state.order.id}</small><strong>+{money(state.order.reward)}</strong><span>{state.order.remaining} sn kaldı</span></div><div className="progress"><i style={{ width: `${state.order.remaining / state.order.duration * 100}%` }} /></div><div className="order-needs">{resources.filter(r => state.order!.needs[r] > 0).map(r => <div key={r}><span>{resourceNames[r]}</span><b className={state.stock[r] >= state.order!.needs[r] ? "success" : "warning"}>{state.stock[r]} / {state.order!.needs[r]}</b></div>)}</div><button className="primary fulfill-button" disabled={!canFulfillOrder(state)} onClick={() => dispatch({ type: "fulfill" })}>Siparişi teslim et →</button><p className="fine-print">Süre dolunca stok yeterliyse otomatik teslim. Eksikse {money(state.order.reward / 2)} ceza; kasa borca düşebilir.</p></> : <div className="order-wait"><span>▤</span><h3>Yeni rota hazırlanıyor</h3><p>Sonraki sipariş {state.orderIn} sn içinde.<br />Depoyu doldur, ticarete hazır ol.</p></div>}{state.lastOrder && <p role="status" className={state.lastOrder.success ? "success" : "warning"}>#{state.lastOrder.id} {state.lastOrder.success ? `Başarılı · +${money(state.lastOrder.reward)}` : `Başarısız · −${money(state.lastOrder.penalty)}`}</p>}</section>

      <section className="panel shelter-card" aria-label="Barınak"><span className="eyebrow">İŞÇİ BARINMASI</span><h2>Barınak</h2><div className="supply"><span>Yerleşen / kapasite</span><b>{Math.min(state.workers.length, state.shelterCapacity)} / {state.shelterCapacity}</b></div><p>Her işçi için bir yatak gerekir. Barınamayan işçi çalışamaz. Yerler ekibe katılma sırasına göre verilir; boşta ve grevdeki işçiler de yer kullanır.</p>{unhoused > 0 && <p className="warning" role="status">{unhoused} işçi barınaksız. Barınak yap, boşta bekleyen işçileri göreve ata.</p>}<button className="primary" disabled={state.money < shelterCost(state)} onClick={() => dispatch({ type: "shelter" })}>Barınak yap · +{SHELTER_BEDS} yer · {money(shelterCost(state))}</button></section>
      <section className="panel camp-card"><span className="eyebrow">KAMP LOJİSTİĞİ</span><h2>Erzak planı <span>{state.consumptionIn} sn</span></h2><div className="supply"><span>Gıda</span><b className={foodStock(state) >= needs.food ? "success" : "warning"}>{foodStock(state)} / {needs.food}</b></div><p>Her 30 sn'de tüm ekibin ihtiyacı. Tüm gıda ürünleri kullanılır; stokta en bol olandan başlanır. Eksik erzak üretimi yarıya indirir.</p>{state.shortage && <p className="warning">Erzak eksik. Sonraki tüketim için depoyu tamamla.</p>}</section>

</aside>
    </div>
  </div>;
}
