import { useEffect, useState } from "react";
import * as g from "./game";
import {
  AssistantDock,
  CategorySummary,
  EquipmentPurchase,
  ProductControls,
} from "./ProductionPanels";
const saveKey = "last-city-workers-v2";
const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}₺`;
export function App() {
  const [state, setState] = useState(() => {
    try {
      return g.loadGame(localStorage.getItem(saveKey));
    } catch {
      return g.emptyState();
    }
  });
  const [category, setCategory] = useState<g.Category | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const act = (fn: (s: g.GameState) => g.GameState) => setState(fn);
  useEffect(() => {
    if (state.paused) return;
    const timer = window.setInterval(() => act(g.simulateTick), 1000);
    return () => window.clearInterval(timer);
  }, [state.paused]);
  useEffect(() => {
    try {
      localStorage.setItem(saveKey, JSON.stringify(state));
    } catch {
      /* Optional storage. */
    }
  }, [state]);
  const definition = g.siteDefinitions.find((s) => s.id === siteId);
  const site = siteId ? state.sites[siteId] : undefined;
  const manager = g.categories.find((c) => c.id === category);
  const inventory = g.resources.filter(
    (r) => state.stock[r] > 0 || g.ownedSite(state, r),
  );
  const assigned = definition
    ? state.workers.filter((w) => w.job === definition.job)
    : [];
  const idleWorkers = state.workers.filter((w) => w.job === "idle");
  const availableWorker = idleWorkers.some(
    (w) => !w.strikeRemaining && g.isHoused(state, w.id),
  );
  const housedWorkers = state.workers.filter((w) =>
    g.isHoused(state, w.id),
  ).length;
  const openSite = (s: g.SiteDefinition) => {
    setCategory(s.category);
    setSiteId(s.id);
  };
  return (
    <div className="game-shell">
      <header className="topbar">
        <button
          type="button"
          className="brand"
          aria-label="Anasayfaya git"
          onClick={() => {
            setCategory(null);
            setSiteId(null);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          <span className="brand-mark">K</span>
          <span>
            <b>KÜLDEN</b>
            <small>Her emek, yeni bir şehir.</small>
          </span>
        </button>
        <div className="clock-controls" aria-label="Oyun saati">
          <div>
            <small>{state.day}. GÜN</small>
            <strong>{g.formatGameTime(state.minuteOfDay)}</strong>
            <span>
              {g.isWorkingHours(state)
                ? "Mesai 08:00–20:00"
                : "Dinlenme zamanı"}
            </span>
          </div>
          <button
            aria-pressed={state.paused}
            onClick={() => act(g.togglePause)}
          >
            {state.paused ? "Devam et" : "Duraklat"}
          </button>
          {!g.isWorkingHours(state) && (
            <button onClick={() => act(g.skipToMorning)}>Sabaha geç</button>
          )}
        </div>
        <nav className="resource-strip" aria-label="Envanter">
          {inventory.length ? (
            inventory.map((r) => (
              <button
                key={r}
                title={`${g.resourceNames[r]}: ${state.stock[r]}/${state.warehouseCapacity[r]}`}
                aria-label={`${g.resourceNames[r]} üretim sahasına git`}
                onClick={() => {
                  const s = g.siteDefinitions.find((s) =>
                    g.siteProducts(s).includes(r),
                  );
                  if (s) openSite(s);
                }}
              >
                <span>
                  {g.siteDefinitions.find((s) => g.siteProducts(s).includes(r))
                    ?.icon ?? "📦"}
                </span>
                <small>{g.resourceNames[r]}</small>
                <b>
                  {state.stock[r]}/{state.warehouseCapacity[r]}
                </b>
              </button>
            ))
          ) : (
            <span className="muted">Kaynakların burada görünecek</span>
          )}
        </nav>
        <div className="wallet">
          <small>KASA</small>
          <strong>{money(state.money)}</strong>
        </div>
        <button
          className="quiet"
          onClick={() => {
            act(g.emptyState);
            setCategory(null);
            setSiteId(null);
          }}
        >
          Yeni oyun
        </button>
      </header>
      <div className="category-layout">
        <main>
          <div className="production-heading">
            <div>
              <span className="eyebrow">ÜRETİM AĞI</span>
              <h1>
                {definition?.name ?? manager?.name ?? "Üretim kategorileri"}
              </h1>
              <p>Sahalarını kur, ekibini donat, şehri büyüt.</p>
            </div>
            <span className="level-badge">
              {Object.keys(state.sites).length}{" "}
              <small>/ {g.siteDefinitions.length} saha</small>
            </span>
          </div>
          <nav className="breadcrumbs" aria-label="Saha gezintisi">
            <button
              onClick={() => {
                setCategory(null);
                setSiteId(null);
              }}
            >
              Kategoriler
            </button>
            {manager && (
              <>
                <span>/</span>
                <button onClick={() => setSiteId(null)}>{manager.name}</button>
              </>
            )}
            {definition && (
              <>
                <span>/</span>
                <span>{definition.name}</span>
              </>
            )}
          </nav>
          <div className="labor-notices" aria-live="polite">
            {state.laborNotices.map((n) => (
              <div className="labor-notice" key={n.id}>
                {n.text}
                <button
                  aria-label="Bildirimi kapat"
                  onClick={() =>
                    act((s) => ({
                      ...s,
                      laborNotices: s.laborNotices.filter((x) => x.id !== n.id),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {!category && (
            <>
              <div className="category-grid">
                {g.categories.map((c) => (
                  <button
                    className={`category-card category-${c.id}`}
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    <span className="category-art" aria-hidden="true">
                      <span className="category-icon">{c.icon}</span>
                    </span>
                    <h2>{c.name}</h2>
                    <CategorySummary state={state} category={c.id} />
                    <span>Sahaları yönet →</span>
                  </button>
                ))}
              </div>
              <p>
                İlk saha 100₺. Sonraki her saha, önceki satın alımın iki katı:
                şu an {money(g.sitePurchaseCost(state))}.
              </p>
            </>
          )}
          {category && !definition && (
            <div className="production-grid">
              {g.siteDefinitions
                .filter((s) => s.category === category)
                .map((s) => (
                  <article className="production-card" key={s.id}>
                    <button
                      className={`site-card-link art-${s.category === "mine" ? 5 : s.category === "livestock" ? 2 : 1}`}
                      onClick={() => openSite(s)}
                    >
                      <span className="category-icon">{s.icon}</span>
                      <h2>{s.name}</h2>
                      <p>
                        {g
                          .siteProducts(s)
                          .map((r) => g.resourceNames[r])
                          .join(" · ")}
                      </p>
                      <span>
                        {state.sites[s.id]
                          ? `Seviye ${state.sites[s.id].level} · ${g.productionStatus(state, s)}`
                          : `Satın al · ${money(g.sitePurchaseCost(state))}`}
                      </span>
                      <b>Sahayı aç →</b>
                    </button>
                  </article>
                ))}
            </div>
          )}
          {definition && !site && (
            <section className="panel purchase-panel">
              <span className="category-icon">{definition.icon}</span>
              <h2>{definition.name} sahasını kur</h2>
              <p>
                {g
                  .siteProducts(definition)
                  .map((r) => g.resourceNames[r])
                  .join(" · ")}
              </p>
              <p>
                {definition.finite
                  ? "Seviye 1: 100 birim rezerv. Rezerv tükendiğinde sahayı yükselt."
                  : definition.recipes.length
                    ? "Hammaddesiz ürünler sürekli üretilir; işlenecek ürünlerin miktarını sen seçersin."
                    : "Ekipmanlı işçiler mesai boyunca sürekli üretir."}
              </p>
              <p>
                3 işçi kapasitesi. Her işçi için{" "}
                {definition.equipment
                  .map((t) => g.equipmentTypes[t].name)
                  .join(", ")}{" "}
                gerekir.
              </p>
              <button
                className="primary"
                disabled={state.money < g.sitePurchaseCost(state)}
                onClick={() => act((s) => g.purchaseSite(s, definition.id))}
              >
                Sahayı satın al · {money(g.sitePurchaseCost(state))}
              </button>
              <p>Sonraki saha: {money(g.sitePurchaseCost(state) * 2)}</p>
            </section>
          )}
          {definition && site && (
            <div className="site-detail">
              <section className="panel site-overview">
                <span className="eyebrow">SAHA SEVİYESİ {site.level}</span>
                <h2>
                  {definition.icon} {definition.name}
                </h2>
                <p role="status">{g.productionStatus(state, definition)}</p>
                <div className="site-metrics">
                  <div>
                    <small>İŞÇİ KAPASİTESİ</small>
                    <strong>
                      {assigned.length} / {g.workerCapacity(site)}
                    </strong>
                  </div>
                  <div>
                    <small>
                      {definition.finite
                        ? "KALAN REZERV"
                        : definition.recipes.length
                          ? "ÜRETİM HEDEFİ KAPASİTESİ"
                          : "TEMEL ÜRETİM KAPASİTESİ"}
                    </small>
                    <strong>
                      {definition.finite
                        ? `${g.productionCapacity(site) - site.extracted} / ${g.productionCapacity(site)}`
                        : definition.recipes.length
                          ? `${site.queue.reduce((n, q) => n + q.remaining, 0)} / ${g.productionCapacity(site)}`
                          : `${g.workerCapacity(site) * 12} adet/dk`}
                    </strong>
                  </div>
                </div>
                <button
                  disabled={
                    site.level >= 20 || state.money < g.siteUpgradeCost(site)
                  }
                  onClick={() => act((s) => g.upgradeSite(s, definition.id))}
                >
                  {site.level >= 20
                    ? "En yüksek seviye"
                    : `Sahayı yükselt · ${money(g.siteUpgradeCost(site))}`}
                </button>
                <p>
                  Her seviye +3 işçi sağlar. Sınırlı sahalarda rezerv, işlenen
                  ürünlerde toplam üretim hedefi kapasitesi +100 artar.
                </p>
                <div className="staff-controls">
                  <button
                    disabled={!assigned.some((w) => !w.strikeRemaining)}
                    onClick={() =>
                      act((s) => g.changeWorkers(s, definition.job, -1))
                    }
                  >
                    − İşçi çıkart
                  </button>
                  <strong>{assigned.length}</strong>
                  <button
                    disabled={
                      !g.canAssign(state, definition.job) ||
                      (idleWorkers.length > 0
                        ? !availableWorker
                        : state.money < g.hiringCost(state) ||
                          state.workers.length >= state.shelterCapacity)
                    }
                    onClick={() => act((s) => g.hireForJob(s, definition.job))}
                  >
                    {idleWorkers.length > 0
                      ? "+ İşçi ata"
                      : `İşçi al + ata · ${money(g.hiringCost(state))}`}
                  </button>
                </div>
                <p className="staff-hint" role="status">
                  {assigned.length >= g.workerCapacity(site)
                    ? "Saha dolu. Daha fazla işçi için sahayı yükselt."
                    : idleWorkers.length > 0
                      ? availableWorker
                        ? "Boştaki işçi ek ücret olmadan atanır."
                        : "Boştaki işçi için barınak gerekli veya grevin bitmesi bekleniyor."
                      : state.workers.length >= state.shelterCapacity
                        ? "Yeni işçi için yönetim alanından barınak ekle."
                        : state.money < g.hiringCost(state)
                          ? "Yeni işçi almak için kasa yetersiz."
                          : "Boşta işçi yok. Yeni işçi alınarak bu sahaya atanır."}
                  {assigned.length > g.equippedCapacity(state, definition) &&
                    " Eksik ekipmanları tamamla; her işçi üretim için tam set bekler."}
                </p>
                <p>
                  {g.equippedCapacity(state, definition)} tam ekipman seti ·{" "}
                  {assigned.filter((w) => w.strikeRemaining).length} grevde ·{" "}
                  {assigned.filter((w) => !g.isHoused(state, w.id)).length}{" "}
                  barınaksız
                </p>
                <div className="site-storage" aria-label="Saha depoları">
                  <h3>Depolar</h3>
                  {g.siteProducts(definition).map((r) => (
                    <div className="site-storage-row" key={r}>
                      <div>
                        <strong>{g.resourceNames[r]}</strong>
                        <small>
                          {state.stock[r]}/{state.warehouseCapacity[r]} adet
                        </small>
                      </div>
                      <button
                        aria-label={`${g.resourceNames[r]} deposunu yükselt`}
                        disabled={
                          state.money < g.warehouseUpgradeCost(state, r)
                        }
                        onClick={() => act((s) => g.upgradeWarehouse(s, r))}
                      >
                        Depoyu +100 yükselt ·{" "}
                        {money(g.warehouseUpgradeCost(state, r))}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              {definition.recipes.length > 0 && (
                <ProductControls
                  state={state}
                  act={act}
                  definition={definition}
                />
              )}
              <section className="panel equipment-panel">
                <h2>Saha ekipmanları</h2>
                <p>
                  Her işçi bir tam set kullanır. Ürün başına aşınma oluşur.
                  Kırılmadan yükselt: dayanıklılık %100 olur, ekipman daha uzun
                  dayanır ve tam setin seviyesi üretimi hızlandırır. Kırılan
                  ekipman yok olur.
                </p>
                <div className="equipment-grid">
                  {definition.equipment.map((type) => {
                    const items = state.equipment.filter(
                      (e) => e.siteId === definition.id && e.type === type,
                    );
                    const average = items.length
                      ? items.reduce((sum, e) => sum + e.durability, 0) /
                        items.length
                      : 0;
                    const missing = Math.max(0, assigned.length - items.length);
                    return (
                      <div className="equipment-card" key={type}>
                        <div className="equipment-card-title">
                          <strong>
                            {g.equipmentTypes[type].icon}{" "}
                            {g.equipmentTypes[type].name}
                          </strong>
                          <b>{items.length} adet</b>
                        </div>
                        <span className="equipment-summary">
                          {items.length
                            ? `Ortalama dayanıklılık %${Math.ceil(average)}`
                            : "Henüz ekipman yok"}
                          {missing > 0 && ` · ${missing} adet eksik`}
                        </span>
                        <meter
                          min={0}
                          max={100}
                          value={average}
                          aria-label={`${g.equipmentTypes[type].name} ortalama dayanıklılık`}
                        />
                        <EquipmentPurchase
                          key={`${definition.id}-${type}`}
                          state={state}
                          act={act}
                          siteId={definition.id}
                          type={type}
                        />
                        {items.length > 0 && (
                          <details className="equipment-details">
                            <summary>
                              Ekipmanları yönet ({items.length})
                            </summary>
                            <div className="equipment-list">
                              {g.groupEquipment(items).map((group) => {
                                const e = group[0];
                                const cost = g.equipmentUpgradeCost(e);
                                const count =
                                  e.level >= 10
                                    ? 0
                                    : Math.min(
                                        group.length,
                                        Math.floor(state.money / cost),
                                      );
                                return (
                                  <div
                                    className="equipment-item"
                                    key={`${e.level}-${Math.ceil(e.durability)}`}
                                  >
                                    <span>
                                      {group.length} adet · Sv. {e.level} · %
                                      {Math.ceil(e.durability)} dayanıklılık
                                    </span>
                                    <button
                                      disabled={count === 0}
                                      onClick={() =>
                                        act((s) =>
                                          g.upgradeEquipmentGroup(
                                            s,
                                            group.map((item) => item.id),
                                          ),
                                        )
                                      }
                                    >
                                      {e.level >= 10
                                        ? "En yüksek seviye"
                                        : count === 0
                                          ? `Yetersiz bakiye · ${money(cost)} / adet`
                                          : `Yükselt · ${count}/${group.length} adet · ${money(count * cost)}`}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </main>
        <aside className="city-sidebar">
          <section className="panel order-card">
            <span className="eyebrow">TİCARET MERKEZİ</span>
            <h2>Siparişler</h2>
            {state.order ? (
              <>
                <div className="order-ticket">
                  <small>SİPARİŞ #{state.order.id}</small>
                  <strong>+{money(state.order.reward)}</strong>
                  <span>{state.order.remaining} sn kaldı</span>
                </div>
                <div className="order-needs">
                  {g.resources
                    .filter((r) => state.order!.needs[r] > 0)
                    .map((r) => (
                      <div key={r}>
                        <span>{g.resourceNames[r]}</span>
                        <b>
                          {state.stock[r]} / {state.order!.needs[r]}
                        </b>
                      </div>
                    ))}
                </div>
                <button
                  className="primary fulfill-button"
                  disabled={!g.canFulfillOrder(state)}
                  onClick={() => act(g.fulfillOrder)}
                >
                  Siparişi teslim et →
                </button>
                <p>
                  Süre sonunda yeterli stok varsa otomatik teslim. Eksikse{" "}
                  {money(state.order.reward / 2)} ceza.
                </p>
              </>
            ) : (
              <p>
                {Object.keys(state.sites).length
                  ? `Yeni sipariş ${state.orderIn} sn içinde.`
                  : "Siparişleri başlatmak için ilk sahanı satın al."}
              </p>
            )}
            {state.lastOrder && (
              <p role="status">
                {state.lastOrder.success ? "Başarılı" : "Başarısız"} ·{" "}
                {money(
                  state.lastOrder.success
                    ? state.lastOrder.reward
                    : -state.lastOrder.penalty,
                )}
              </p>
            )}
          </section>
          <section
            className="panel site-warehouse"
            aria-label="Şehir yönetimi"
          >
            <span className="eyebrow">ŞEHİR YÖNETİMİ</span>
            <h2>Yönetim</h2>
            <div className="management-summary">
              <h3>İşçi durumu</h3>
              <dl className="management-stats">
                <div>
                  <dt>Toplam işçi</dt>
                  <dd>{state.workers.length}</dd>
                </div>
                <div>
                  <dt>Sahaya atanmış</dt>
                  <dd>
                    {state.workers.filter((w) => w.job !== "idle").length}
                  </dd>
                </div>
                <div>
                  <dt>Boşta</dt>
                  <dd>{idleWorkers.length}</dd>
                </div>
                <div>
                  <dt>Grevde</dt>
                  <dd>
                    {state.workers.filter((w) => w.strikeRemaining).length}
                  </dd>
                </div>
              </dl>
              <p>
                Günlük maaş: <strong>{money(g.dailyPayroll(state))}</strong>
                <br />
                Kişi başı {money(g.dailyWagePerWorker(state))} · İşçi alım
                bedelinin %10’u
              </p>
              <h3>Barınaklar</h3>
              <dl className="management-stats">
                <div>
                  <dt>Barınak sayısı</dt>
                  <dd>{Math.ceil(state.shelterCapacity / g.SHELTER_BEDS)}</dd>
                </div>
                <div>
                  <dt>Kalan işçi / yatak</dt>
                  <dd>
                    {housedWorkers} / {state.shelterCapacity}
                  </dd>
                </div>
                <div>
                  <dt>Boş yatak</dt>
                  <dd>{state.shelterCapacity - housedWorkers}</dd>
                </div>
                <div>
                  <dt>Barınaksız işçi</dt>
                  <dd>{state.workers.length - housedWorkers}</dd>
                </div>
              </dl>
              <button
                disabled={state.money < g.shelterCost(state)}
                onClick={() => act(g.buildShelter)}
              >
                Barınak +3 · {money(g.shelterCost(state))}
              </button>
            </div>
          </section>
        </aside>
      </div>
      <AssistantDock state={state} act={act} openSite={openSite} />
    </div>
  );
}
