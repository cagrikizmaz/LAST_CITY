import { useEffect, useRef, useState } from "react";
import * as g from "./game";
type Props = {
  state: g.GameState;
  act: (fn: (state: g.GameState) => g.GameState) => void;
};
const people: Record<g.Category, { name: string; avatar: string }> = {
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
            <span>{g.resourceNames[r]}</span>
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
          act((s) => {
            if (s.money < total) return s;
            for (let i = 0; i < quantity; i++)
              s = g.buyEquipment(s, siteId, type);
            return s;
          })
        }
      >
        Satın al · {quantity} adet · {total.toLocaleString("tr-TR")}₺
      </button>
    </div>
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
        − / + ile kalan üretim hedefini ayarla. Her ürün bağımsız ilerler;
        hammadde gerektirmeyenler sürekli üretilir.
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
                <h3>{label}</h3>
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
                      act((s) =>
                        g.adjustProduction(s, definition.id, recipe.output, -1),
                      )
                    }
                  >
                    −
                  </button>
                  <output aria-label={`${label} kalan üretim`}>
                    {remaining}
                  </output>
                  <button
                    aria-label={`${label} üretimini artır`}
                    disabled={total >= g.productionCapacity(site)}
                    onClick={() =>
                      act((s) =>
                        g.adjustProduction(s, definition.id, recipe.output, 1),
                      )
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
          <p>
            Merhaba! {category.name.toLocaleLowerCase("tr-TR")} sahalarını takip
            ediyorum.{" "}
            {requests.length || shortages.length
              ? "Ekibimizin ihtiyaçlarını aşağıda topladım."
              : "Şu an bekleyen malzeme ihtiyacımız yok."}
          </p>
          {requests.map((r) => (
            <div className="manager-request" key={`${r.site.id}-${r.type}`}>
              <span>
                {r.site.name} için {r.count} adet{" "}
                {g.equipmentTypes[r.type].name.toLocaleLowerCase("tr-TR")}{" "}
                gerekli.
              </span>
              <button
                disabled={state.money < g.equipmentTypes[r.type].price}
                onClick={() => act((s) => g.buyEquipment(s, r.site.id, r.type))}
              >
                1 adet al · {g.equipmentTypes[r.type].price}₺
              </button>
            </div>
          ))}
          {shortages.map((n) => (
            <p className="shortage-text" key={n.resource}>
              {g.resourceNames[n.resource]} yetersiz, {n.missing} tane daha
              gerekiyor.
            </p>
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
          {!g.siteDefinitions.some(
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
