import type { useGameSession } from "./useGameSession";
import type { Dispatch } from "./commands";
import { useState } from "react";
import * as g from "./game";
const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}₺`;
export function OrderBoard({
  state,
  act,
  session,
}: {
  state: g.GameState;
  act: Dispatch;
  session?: ReturnType<typeof useGameSession>;
}) {
  const [filter, setFilter] = useState<g.OrderDifficulty | "all">("all");
  const difficultyOf = (offer: g.Order) =>
    offer.difficulty ?? (offer.challenge ? "hard" : "medium");
  return (
    <section className="panel order-card">
      <span className="eyebrow">TİCARET MERKEZİ</span>
      <h1>Sipariş panosu</h1>
      {session?.status === "connected" && session.snapshot && <>
        <h2>Oyuncu siparişleri</h2>
        {session.error && <p className="network-error" role="alert">{session.error}</p>}
        <p>Oyuncu pazarından verilen siparişler. Teslimatta ürünler alıcıya, ödeme satıcıya aktarılır.</p>
        <div className="player-market">
          {!(session.snapshot.orders ?? []).length && <p>Henüz oyuncu siparişi yok.</p>}
          {(session.snapshot.orders ?? []).map((order) => {
            const own = order.buyerId === session.snapshot!.playerId;
            const enough = state.stock[order.resource] >= order.quantity;
            return <article key={order.id} className="player-offer">
              <small>{order.buyerName}{own ? " · Senin siparişin" : ""}</small>
              <strong>{order.quantity} {g.resourceNames[order.resource]}</strong>
              <span>{money(order.total)} toplam ödeme</span>
              <button disabled={!own && !enough} onClick={() => {
                session.setError("");
                session.send({ type: own ? "cancelPlayerOrder" : "fulfillPlayerOrder", id: order.id });
              }}>{own ? "Siparişi iptal et" : enough ? "Siparişi teslim et" : "Stok yetersiz"}</button>
            </article>;
          })}
        </div>
        <h2>Anonim siparişler</h2>
      </>}
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
            onClick={() => act({ type: "fulfillOrder", args: [] })}
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
          <button onClick={() => act({ type: "abandonOrder", args: [] })}>
            Siparişten vazgeç
          </button>
        </>
      ) : (
        <p>Henüz kabul edilmiş sipariş yok.</p>
      )}
      <p className="board-day">
        {state.timeMode === "continuous" ? "24 saat üretim" : `${state.day}. gün`} · {state.orderPool.length} bekleyen teklif · Yeni pano:
        her saat
      </p>
      {!Object.keys(state.sites).length && (
        <p>İlk sahanı kurduğunda anonim siparişler gelmeye başlar.</p>
      )}
      {Object.keys(state.sites).length > 0 && !state.orderPool.length && (
        <p>Panoda teklif kalmadı. Yeni teklifler bir sonraki oyun saatinde gelecek.</p>
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
                    act({ type: "acceptOrder", args: [offer.id] })
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
