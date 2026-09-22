import { ProductIcon } from "./ProductIcon";
import type { Dispatch } from "./commands";
import { useEffect, useRef, useState } from "react";
import * as g from "./game";
type Props = {
  state: g.GameState;
  act: Dispatch;
};
const people: Record<g.Category, { name: string; avatar: string }> = {
  workshop: { name: "Eren", avatar: "🧑‍🔧" },
  hospital: { name: "Selin", avatar: "👩‍⚕️" },
  forest: { name: "Deniz", avatar: "🧑🏽‍🌾" },
  farm: { name: "Zeynep", avatar: "👩🏻‍🌾" },
  livestock: { name: "Elif", avatar: "👩🏽‍🌾" },
  mine: { name: "Kemal", avatar: "👷🏻" },
};
function categoryNeeds(state: g.GameState, category: g.Category) {
  const needs: Partial<Record<g.Resource, number>> = {};
  for (const definition of g.siteDefinitions.filter(
    (s) => s.category === category && state.sites[s.id],
  )) {
    for (const recipe of definition.recipes) {
      const count = g.productionRemaining(
        state.sites[definition.id],
        recipe.output,
      );
      for (const [r, amount] of Object.entries(recipe.inputs))
        needs[r as g.Resource] =
          (needs[r as g.Resource] ?? 0) + amount! * count;
    }
  }
  return Object.entries(needs)
    .map(([resource, count]) => ({
      resource: resource as g.Resource,
      missing: Math.max(0, count! - state.stock[resource as g.Resource]),
    }))
    .filter((n) => n.missing > 0);
}
export function CategorySummary({
  state,
  category,
}: {
  state: g.GameState;
  category: g.Category;
}) {
  if (category === "hospital")
    return (
      <span className="category-summary">
        <span>
          Seviye {state.hospital.level} · {state.hospital.doctors}/
          {g.doctorCapacity(state)} doktor
        </span>
        <span>
          {state.workers.filter((w) => w.illnessRemaining).length} hasta ?{" "}
          {state.hospital.doctors * 2} tedavi kapasitesi
        </span>
      </span>
    );
  const definitions = g.siteDefinitions.filter((s) => s.category === category);
  const owned = definitions.filter((s) => state.sites[s.id]);
  const products = [...new Set(definitions.flatMap(g.siteProducts))];
  const equipment = g.managerRequests(state, category);
  const shortages = categoryNeeds(state, category);
  const working = owned.filter(
    (s) => g.productionStatus(state, s) === "Üretimde",
  ).length;
  return (
    <span className="category-summary">
      <span className="category-stats">
        {working} saha üretimde · {owned.length} / {definitions.length} saha
        açık
      </span>
      <span className="category-stocks">
        {products.map((r) => (
          <span
            key={r}
            className={!g.ownedSite(state, r) ? "unowned-stock" : ""}
          >
            <span className="product-name"><ProductIcon resource={r} size={20} />{g.resourceNames[r]}</span>
            <b>{state.stock[r]}</b>
          </span>
        ))}
      </span>
      <span className="category-alerts">
        {equipment.slice(0, 3).map((r) => (
          <span key={`${r.site.id}-${r.type}`} className="shortage-text">
            {r.count} {g.equipmentTypes[r.type].name} eksik · {r.site.name}
          </span>
        ))}
        {equipment.length > 3 && (
          <span>+{equipment.length - 3} ekipman ihtiyacı</span>
        )}
        {shortages.map((n) => (
          <span className="shortage-text" key={n.resource}>
            {g.resourceNames[n.resource]}: {n.missing} adet eksik
          </span>
        ))}
        {!owned.length ? (
          <span>İlk sahanı kurarak üretime başla.</span>
        ) : !equipment.length && !shortages.length ? (
          <span className="success">Ekipman ve hammadde eksiği yok</span>
        ) : null}
      </span>
    </span>
  );
}
export function EquipmentPurchase({
  state,
  act,
  siteId,
  type,
}: Props & { siteId: string; type: g.EquipmentType }) {
  const [quantity, setQuantity] = useState(1);
  const equipment = g.equipmentTypes[type];
  const total = quantity * equipment.price;
  return (
    <div className="equipment-purchase">
      <small>Çalışan işçilerin eksik ekipmanları stoktan otomatik tamamlanır.</small>
      <button disabled={state.stock[g.equipmentResources[type]] < quantity}
        onClick={() => act({ type: "equipFromStock", args: [siteId, type, quantity] })}>
        Stoktan kullan · {quantity} adet (Stok: {state.stock[g.equipmentResources[type]]})
      </button>
      <div
        className="quantity-stepper"
        aria-label={`${equipment.name} alım miktarı`}
      >
        <button
          aria-label={`${equipment.name} alımını azalt`}
          disabled={quantity <= 1}
          onClick={() => setQuantity((n) => n - 1)}
        >
          −
        </button>
        <output aria-label={`${equipment.name} alım adedi`}>{quantity}</output>
        <button
          aria-label={`${equipment.name} alımını artır`}
          disabled={state.money < total + equipment.price}
          onClick={() => setQuantity((n) => n + 1)}
        >
          +
        </button>
      </div>
      <button
        disabled={state.money < total}
        onClick={() =>
          act({ type: "buyEquipment", args: [siteId, type, quantity] })
        }
      >
        Satın al · {quantity} adet · {total.toLocaleString("tr-TR")}₺
      </button>
    </div>
  );
}
function ProductionQuantity({
  value,
  max,
  label,
  commit,
}: {
  value: number;
  max: number;
  label: string;
  commit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const save = () => {
    if (draft !== null && /^\d+$/.test(draft)) commit(Number(draft));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      step={1}
      aria-label={`${label} kalan üretim`}
      value={draft ?? value}
      onFocus={(e) => {
        setDraft(String(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
        }
      }}
    />
  );
}
export function ProductControls({
  state,
  act,
  definition,
}: Props & { definition: g.SiteDefinition }) {
  const site = state.sites[definition.id];
  const total = site.queue.reduce((n, q) => n + q.remaining, 0);
  return (
    <section className="panel recipes-panel">
      <h2>Üretim</h2>
      <p>
        − / + ile veya sayıyı yazarak kalan üretim hedefini ayarla. Enter ya da
        alan dışına tıklayarak uygula. Her ürün bağımsız ilerler; hammadde
        gerektirmeyenler sürekli üretilir.
      </p>
      {definition.recipes.map((recipe) => {
        const automatic = g.isAutomatic(recipe);
        const remaining = g.productionRemaining(site, recipe.output);
        const shortages = g.productionShortages(state, recipe, remaining);
        const status = g.productProductionStatus(state, definition, recipe);
        const progress = site.productProgress?.[recipe.output] ?? 0;
        const working = status === "Üretimde";
        const label = g.resourceNames[recipe.output];
        return (
          <article
            className="product-production"
            key={recipe.output}
            aria-label={`${label} üretimi`}
          >
            <div className="product-heading">
              <div>
                <h3 className="product-name"><ProductIcon resource={recipe.output} size={28} />{label}</h3>
                <span className="product-stock">
                  Stok: {state.stock[recipe.output]} /{" "}
                  {state.warehouseCapacity[recipe.output]}
                </span>
              </div>
              {automatic ? (
                <span className="automatic-tag">↻ Sürekli üretim</span>
              ) : (
                <div
                  className="quantity-stepper"
                  aria-label={`${label} üretim miktarı`}
                >
                  <button
                    aria-label={`${label} üretimini azalt`}
                    disabled={!remaining}
                    onClick={() =>
                      act({ type: "adjustProduction", args: [definition.id, recipe.output, -1] })
                    }
                  >
                    −
                  </button>
                  <ProductionQuantity
                    value={remaining}
                    max={g.productionCapacity(site) - total + remaining}
                    label={label}
                    commit={(quantity) =>
                      act({ type: "setProduction", args: [definition.id, recipe.output, quantity] })
                    }
                  />
                  <button
                    aria-label={`${label} üretimini artır`}
                    disabled={total >= g.productionCapacity(site)}
                    onClick={() =>
                      act({ type: "adjustProduction", args: [definition.id, recipe.output, 1] })
                    }
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <p className="recipe-ingredients">
              {automatic
                ? "Hammadde gerektirmez"
                : Object.entries(recipe.inputs)
                    .map(([r, n]) => `${n} ${g.resourceNames[r as g.Resource]}`)
                    .join(" + ")}{" "}
              → 1 {label}
            </p>
            <div className="ingredient-feedback" aria-live="polite">
              {shortages.map((n) => (
                <p className="shortage-text" key={n.resource}>
                  {g.resourceNames[n.resource]} yetersiz, {n.missing} tane daha
                  gerekiyor.
                </p>
              ))}
              {!automatic && remaining > 0 && !shortages.length && (
                <p className="success">
                  {remaining} adet için hammaddeler hazır.
                </p>
              )}
            </div>
            <div className="product-progress-label">
              <span>{status}</span>
              <span>{Math.floor(progress)}%</span>
            </div>
            <div
              className={`product-progress ${working ? "is-producing" : ""}`}
              role="progressbar"
              aria-label={`${label} üretim ilerlemesi`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(progress)}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            {!automatic && remaining > 0 && (
              <small>
                {remaining} adet kaldı · Eksik hammadde tamamlandıkça üretim
                devam eder.
              </small>
            )}
          </article>
        );
      })}
      {total >= g.productionCapacity(site) && (
        <p className="shortage-text">
          Üretim hedefi kapasitesi dolu. Sahayı yükseltebilir veya miktarları
          azaltabilirsin.
        </p>
      )}
    </section>
  );
}
function MaterialProduction({ state, act, resource, missing }: Props & {
  resource: g.Resource;
  missing: number;
}) {
  const plan = g.planProductionChain(state, resource, missing);
  const quantity = Math.min(missing, state.warehouseCapacity[resource] - state.stock[resource]);
  const price = Math.round(g.marketPrice(state, resource) * quantity * 1.2 * 100) / 100;
  return <div>
    {missing > 0 && <button disabled={quantity <= 0 || state.money < price}
      onClick={() => act({ type: "tradeResource", args: [resource, quantity, "buy"] })}>
      {g.resourceNames[resource]} satın al · {quantity} adet · {price.toLocaleString("tr-TR")}₺
    </button>}
    {plan.steps.length > 0 && <small>
      Kuyruğa eklenecek: {plan.steps.map(step =>
        `${step.quantity} ${g.resourceNames[step.resource]} (${step.site})`).join(" + ")}
    </small>}
    {plan.waiting.map(message => <small key={message}>{message}</small>)}
    <button disabled={!plan.steps.length}
      aria-label={`${g.resourceNames[resource]} üretim emri ver`}
      onClick={() => act({ type: "queueProductionChain", args: [resource, missing] })}>
      Üretim emri ver · Ara ürünleri de kuyruğa al
    </button>
    {!plan.steps.length && !plan.waiting.length && <small>Stok ve mevcut üretim emirleri ihtiyacı karşılıyor.</small>}
  </div>;
}

export function AssistantDock({
  state,
  act,
  openSite,
}: Props & { openSite: (definition: g.SiteDefinition) => void }) {
  const [selected, setSelected] = useState<g.Category | null>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selected) close.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) {
        setSelected(null);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [selected]);
  const dismiss = () => {
    setSelected(null);
    trigger.current?.focus();
  };
  const category = g.categories.find((c) => c.id === selected);
  const requests = selected ? g.managerRequests(state, selected) : [];
  const shortages = selected ? categoryNeeds(state, selected) : [];
  return (
    <aside className="assistant-dock" aria-label="Kategori asistanları">
      {category && (
        <section
          className="assistant-popup panel"
          role="dialog"
          aria-label={`${people[category.id].name} · ${category.manager}`}
        >
          <div className="assistant-heading">
            <span className="assistant-avatar">
              {people[category.id].avatar}
            </span>
            <div>
              <h2>{people[category.id].name}</h2>
              <small>{category.manager} · Asistanın</small>
            </div>
            <button ref={close} aria-label="Asistanı kapat" onClick={dismiss}>
              ×
            </button>
          </div>
          {selected === "hospital" && (
            <HospitalSupplies state={state} act={act} />
          )}
          {selected !== "hospital" && (
            <p>
              Merhaba! {category.name.toLocaleLowerCase("tr-TR")} sahalarını
              takip ediyorum.{" "}
              {requests.length || shortages.length
                ? "Eksik malzemeleri satın alabilir veya açık saha ve atölyelerimizde ara ürünleriyle birlikte üretim kuyruğuna alabiliriz."
                : "Şu an bekleyen malzeme ihtiyacımız yok."}
            </p>
          )}
          {requests.map((r) => (
            <div className="manager-request" key={`${r.site.id}-${r.type}`}>
              <span>
                {r.site.name} için {r.count} adet{" "}
                {g.equipmentTypes[r.type].name.toLocaleLowerCase("tr-TR")}{" "}
                gerekli.
              </span>
              <button disabled={state.stock[g.equipmentResources[r.type]] < 1}
                onClick={() => act({ type: "equipFromStock", args: [r.site.id, r.type, 1] })}>
                Stoktan kullan · {g.equipmentTypes[r.type].name}
              </button>
              <button disabled={state.money < g.equipmentTypes[r.type].price * r.count}
                onClick={() => act({ type: "buyEquipment", args: [r.site.id, r.type, r.count] })}>
                Satın al ve kullan · {r.count} {g.equipmentTypes[r.type].name} · {(g.equipmentTypes[r.type].price * r.count).toLocaleString("tr-TR")}₺
              </button>
              <MaterialProduction state={state} act={act} resource={g.equipmentResources[r.type]}
                missing={Math.max(0, requests.filter((request) => request.type === r.type)
                  .reduce((sum, request) => sum + request.count, 0) - state.stock[g.equipmentResources[r.type]])} />
            </div>
          ))}
          {shortages.map((n) => (
            <div className="manager-request" key={n.resource}>
              <span className="shortage-text">
                {g.resourceNames[n.resource]} yetersiz, {n.missing} tane daha gerekiyor.
              </span>
              <MaterialProduction state={state} act={act} resource={n.resource} missing={n.missing} />
            </div>
          ))}
          {g.siteDefinitions
            .filter((s) => s.category === selected && state.sites[s.id])
            .map((s) => (
              <button
                className="assistant-site-link"
                key={s.id}
                onClick={() => {
                  openSite(s);
                  dismiss();
                }}
              >
                {s.name} · {g.productionStatus(state, s)} →
              </button>
            ))}
          {selected !== "hospital" &&
            !g.siteDefinitions.some(
              (s) => s.category === selected && state.sites[s.id],
            ) && (
              <p>
                İlk sahamızı kurduğunda ekipman ihtiyaçlarını sana bildireceğim.
              </p>
            )}
        </section>
      )}
      <div className="assistant-launchers">
        {g.categories.map((c) => {
          const count =
            (c.id === "hospital" ? g.hospitalRequests(state).length : 0) +
            g.managerRequests(state, c.id).length +
            categoryNeeds(state, c.id).length;
          return (
            <button
              key={c.id}
              className="assistant-trigger"
              aria-label={`${c.name} asistanı${count ? `, ${count} ihtiyaç` : ""}`}
              aria-expanded={selected === c.id}
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setSelected(selected === c.id ? null : c.id);
              }}
            >
              <span>{people[c.id].avatar}</span>
              <small>{people[c.id].name}</small>
              {count > 0 && <b className="assistant-badge">{count}</b>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function HospitalSupplies({ state, act }: Props) {
  const requests = g.hospitalRequests(state);
  return (
    <div>
      <h3>Hastane Müdürü · Malzeme talepleri</h3>
      <p>
        Her tedavi başlangıcında 1 iğne, 1 ağrı kesici ve 1 antibiyotik
        kullanılır. Malzeme veya doktor bekleyen işçi kendiliğinden iyileşmeye
        devam eder.
      </p>
      {requests.length === 0 && <p>Bekleyen malzeme talebi yok.</p>}
      {g.supplyTypes.map((type) => (
        <div className="manager-request" key={type}>
          <span>
            {g.medicalSupplies[type].name}: {state.hospital.supplies[type]} stok
            · {requests.find((r) => r.type === type)?.count ?? 0} adet gerekli
          </span>
          <button
            disabled={
              !state.hospital.level ||
              state.money < g.medicalSupplies[type].price
            }
            onClick={() => act({ type: "buyMedicalSupply", args: [type] })}
          >
            {g.medicalSupplies[type].name} al · {g.medicalSupplies[type].price}₺
          </button>
        </div>
      ))}
    </div>
  );
}
export function HospitalPanel({ state, act }: Props) {
  const patients = state.workers.filter((w) => w.illnessRemaining);
  const missingSupplies = g.supplyTypes.filter(
    (type) => state.hospital.supplies[type] < 1,
  );
  const waitingReason = !state.hospital.level
    ? "Hastane kurulmalı"
    : !state.hospital.doctors
      ? "Doktor bekliyor"
      : patients.filter((w) => w.treatment).length >= state.hospital.doctors * 2
        ? "Boş tedavi kapasitesi bekliyor"
        : missingSupplies.length
          ? `Eksik malzeme: ${missingSupplies.map((type) => g.medicalSupplies[type].name).join(", ")}`
          : state.paused
            ? "Oyun duraklatıldı; devam edince stoktan tedavi başlayacak"
            : "Stoktan tedavi başlayacak";
  return (
    <section className="panel hospital-panel">
      <span className="eyebrow">SAĞLIK MERKEZİ</span>
      <h2>Hastane · Seviye {state.hospital.level}</h2>
      <p>
        {state.hospital.doctors} / {g.doctorCapacity(state)} doktor ·{" "}
        {state.hospital.doctors * 2} hasta kapasitesi. Her seviye +2 doktor
        kapasitesi sağlar.
      </p>
      <button
        disabled={
          state.hospital.level >= 20 ||
          state.money < g.hospitalUpgradeCost(state)
        }
        onClick={() => act({ type: "upgradeHospital", args: [] })}
      >
        {state.hospital.level === 0 ? "Hastaneyi kur" : "Hastaneyi yükselt"} ·{" "}
        {g.hospitalUpgradeCost(state)}₺
      </button>{" "}
      <button
        disabled={
          state.hospital.doctors >= g.doctorCapacity(state) || state.money < 50
        }
        onClick={() => act({ type: "hireDoctor", args: [] })}
      >
        Doktor al · 50₺
      </button>
      <h3>Hastalar · {patients.length}</h3>
      <p>
        İyileşme: 10 gerçek dakika; kesintisiz tedavi: 5 gerçek dakika. Hastalık
        başına %1 ölüm riski vardır. Tedavi saatten bağımsız sürer; duraklatıldığında
        sayaçlar durur.
      </p>
      {patients.length === 0 && <p>Hasta işçi yok.</p>}
      {patients.map((w) => (
        <p key={w.id}>
          {g.workerLabel(w)} · {w.treatment ? "Tedavi oluyor" : waitingReason} ·{" "}
          {Math.ceil(w.illnessRemaining! / (w.treatment ? 2 : 1))} sn kaldı
        </p>
      ))}
      <HospitalSupplies state={state} act={act} />
    </section>
  );
}
