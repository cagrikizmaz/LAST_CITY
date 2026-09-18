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
        Her gün {g.dailyOrderMinimum(state.day)}–
        {g.dailyOrderMinimum(state.day) + 3} yeni teklif. Kolay, orta ve zor
        siparişler her oyun günü büyür. Kabul edilmeyen teklifler ertesi gün
        yenilenir. Aynı anda bir sipariş üstlenebilirsin; süre kabul edince
        başlar.
      </p>
      <div className="merchant-credits">
        {g.merchants.map((name, i) => (
          <div key={name}>
            <span>{name}</span>
            <b>Güven {state.merchantCredit[i]}/100</b>
            <small>Teklif değeri %{50 + state.merchantCredit[i] / 2}</small>
          </div>
        ))}
      </div>
      {state.order ? (
        <>
          <div className="order-ticket">
            <small>
              {g.merchants[state.order.merchantId]} · SİPARİŞ #{state.order.id}
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
            İlk %80 sürede teslim: %20 bonus. Son %20 sürede: normal bedel (
            {money(state.order.reward)}). Süre sonunda stok yeterliyse normal
            bedelle otomatik teslim.
          </p>
          <p>
            Gecikme: güven −10. {g.LATE_GRACE} sn ek sürede tamamlanamazsa veya
            vazgeçersen: güven −10. Düşük güven bu tüccarın yeni tekliflerini
            ucuzlatır.
          </p>
          <button onClick={() => act(g.abandonOrder)}>
            Siparişten vazgeç (güven −10)
          </button>
        </>
      ) : (
        <p>Henüz kabul edilmiş sipariş yok.</p>
      )}
      <p className="board-day">
        {state.day}. gün · {state.orderPool.length} bekleyen teklif · Yeni pano:
        ertesi gün
      </p>
      {!Object.keys(state.sites).length && (
        <p>İlk sahanı kurduğunda tüccarlar teklif vermeye başlar.</p>
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
                {g.merchants[offer.merchantId]} · #{offer.id}
              </small>
              <strong>{money(offer.reward)}</strong>
              <span>
                {offer.duration} sn · Erken teslim +
                {money(Math.ceil(offer.reward * g.EARLY_BONUS))}
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
                  onClick={() => act((s) => g.acceptOrder(s, offer.id))}
                >
                  Siparişi kabul et #{offer.id}
                </button>
              </details>
            </article>
          ))}
      </div>
      {state.lastOrder && (
        <p role="status">
          {state.lastOrder.outcome === "early"
            ? "Erken teslim · bonuslu"
            : state.lastOrder.outcome === "late"
              ? "Gecikmeli teslim"
              : state.lastOrder.success
                ? "Zamanında teslim"
                : "Tamamlanamadı · güven −10"}{" "}
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
