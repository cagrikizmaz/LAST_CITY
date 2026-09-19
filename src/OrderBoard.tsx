import { useState } from "react";
import * as g from "./game";
const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}₺`;
export function OrderBoard({
  state,
  act,
}: {
  state: g.GameState;
  act: (fn: (s: g.GameState) => g.GameState) => void;
}) {
  const [filter, setFilter] = useState<g.OrderDifficulty | "all">("all");
  const difficultyOf = (offer: g.Order) =>
    offer.difficulty ?? (offer.challenge ? "hard" : "medium");
  return (
    <section className="panel order-card">
      <span className="eyebrow">TİCARET MERKEZİ</span>
      <h1>Sipariş panosu</h1>
      <p>
        Siparişler anonim ve rastgele gelir. Pano her oyun saatinde tamamen
        yenilenir; kârlı teklifler daha kısa, düşük kârlı veya zararlı teklifler
        daha uzun süre görünür. Aynı anda bir sipariş üstlenebilirsin.
      </p>
      {state.order ? (
        <>
          <div className="order-ticket">
            <small>
              Sipariş
            </small>
            <strong>+{money(g.orderPayout(state.order))}</strong>
            <span>
              {state.order.remaining >= 0
                ? `${state.order.remaining} sn kaldı`
                : `${-state.order.remaining} sn gecikti · Ek süre ${g.LATE_GRACE + state.order.remaining} sn`}
            </span>
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
            Teslimat bedeli: {money(state.order.reward)}. Süre sonunda stok
            yeterliyse otomatik teslim edilir.
          </p>
          <p>
            Gecikme veya vazgeçme siparişi başarısız sonuçlandırır.
          </p>
          <button onClick={() => act(g.abandonOrder)}>
            Siparişten vazgeç
          </button>
        </>
      ) : (
        <p>Henüz kabul edilmiş sipariş yok.</p>
      )}
      <p className="board-day">
        {state.day}. gün · {state.orderPool.length} bekleyen teklif · Yeni pano:
        her saat
      </p>
      {!Object.keys(state.sites).length && (
        <p>İlk sahanı kurduğunda anonim siparişler gelmeye başlar.</p>
      )}
      {Object.keys(state.sites).length > 0 && !state.orderPool.length && (
        <p>Bugünün panosunda teklif kalmadı. Yeni teklifler yarın gelecek.</p>
      )}
      <div className="order-filters" aria-label="Sipariş zorluğu">
        {(["all", "easy", "medium", "hard"] as const).map((kind) => (
          <button
            key={kind}
            aria-pressed={filter === kind}
            onClick={() => setFilter(kind)}
          >
            {kind === "all" ? "Tümü" : g.orderDifficultyNames[kind]} ·{" "}
            {
              state.orderPool.filter(
                (o) => kind === "all" || difficultyOf(o) === kind,
              ).length
            }
          </button>
        ))}
      </div>
      <div className="offer-list">
        {state.orderPool
          .filter((offer) => filter === "all" || difficultyOf(offer) === filter)
          .map((offer) => (
            <article
              className={`order-ticket ${offer.challenge ? "challenge-offer" : ""}`}
              key={offer.id}
            >
              <b className="offer-kind">
                {
                  g.orderDifficultyNames[
                    offer.difficulty ?? (offer.challenge ? "hard" : "medium")
                  ]
                }{" "}
                · Seviye {offer.dayLevel ?? state.day}
                {offer.challenge ? " · Yatırım siparişi" : ""}
              </b>
              <small>
                Sipariş
              </small>
              <strong>{money(offer.reward)}</strong>
              <div className="offer-value-summary">
                <span>Piyasa değeri: {money(g.orderMarketValue(state, offer))}</span>
                <strong
                  className={
                    offer.reward >= g.orderMarketValue(state, offer)
                      ? "offer-profit"
                      : "offer-loss"
                  }
                >
                  {offer.reward >= g.orderMarketValue(state, offer)
                    ? `Kâr ${money(offer.reward - g.orderMarketValue(state, offer))}`
                    : `Zarar ${money(g.orderMarketValue(state, offer) - offer.reward)}`}
                </strong>
              </div>
              <span>
                {offer.duration} sn · Sabit teslim bedeli
              </span>
              <details>
                <summary>Teklif detayları ve yatırım ihtiyacı</summary>
                <div className="order-needs">
                  {g.resources
                    .filter((r) => offer.needs[r] > 0)
                    .map((r) => (
                      <div key={r}>
                        <span>
                          {g.resourceNames[r]}
                          <small>
                            Eksik stok:{" "}
                            {Math.max(0, offer.needs[r] - state.stock[r])}
                          </small>
                          {!g.ownedSite(state, r) && (
                            <small className="investment-need">
                              Yeni saha gerekli:{" "}
                              {
                                g.siteDefinitions.find((s) =>
                                  g.siteProducts(s).includes(r),
                                )?.name
                              }
                            </small>
                          )}
                          {offer.needs[r] > state.warehouseCapacity[r] && (
                            <small className="investment-need">
                              Depo büyüt: {state.warehouseCapacity[r]} → en az{" "}
                              {offer.needs[r]}
                            </small>
                          )}
                        </span>
                        <b>
                          {state.stock[r]} / {offer.needs[r]}
                        </b>
                      </div>
                    ))}
                </div>
                <button
                  disabled={!!state.order}
                  onClick={() =>
                    act((s) => {
                      const accepted = g.acceptOrder(s, offer.id);
                      const ready = g.resources.every(
                        (resource) => state.stock[resource] >= offer.needs[resource],
                      );
                      return ready ? g.fulfillOrder(accepted) : accepted;
                    })
                  }
                >
                  {g.resources.every(
                    (resource) => state.stock[resource] >= offer.needs[resource],
                  )
                    ? "Kabul et ve teslim et"
                    : "Siparişi kabul et"}
                </button>
              </details>
            </article>
          ))}
      </div>
      {state.lastOrder && (
        <p role="status">
          {state.lastOrder.outcome === "early"
            ? "Erken teslim"
            : state.lastOrder.outcome === "late"
              ? "Gecikmeli teslim"
              : state.lastOrder.success
                ? "Zamanında teslim"
                : "Tamamlanamadı"}{" "}
          ·{" "}
          {money(
            state.lastOrder.success
              ? state.lastOrder.reward
              : -state.lastOrder.penalty,
          )}
        </p>
      )}
    </section>
  );
}
