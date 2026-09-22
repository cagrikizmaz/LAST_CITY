import { ProductIcon } from "./ProductIcon";
import { useState } from "react";
import * as g from "./game";
import type { useGameSession } from "./useGameSession";
export function PlayerMarket({ session, openMultiplayer }: { session: ReturnType<typeof useGameSession>; openMultiplayer: () => void }) {
  const [resource, setResource] = useState<g.Resource>("wood");
  const [quantity, setQuantity] = useState("1");
  const [total, setTotal] = useState("10");
  const [orderResource, setOrderResource] = useState<g.Resource>("wood");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderTotal, setOrderTotal] = useState("10");
  const available = g.resources.filter((r) => session.state.stock[r] >= 1);
  const saleResource = available.includes(resource) ? resource : available[0];
  const orderRoom = session.state.warehouseCapacity[orderResource] - session.state.stock[orderResource];
  if (session.status !== "connected" || !session.snapshot) return <section className="panel order-card">
    <h1>Oyuncu pazarı</h1>
    <p>Oyuncularla ürün alıp satmak için Multiplayer bölümünden bir odaya katıl veya oda kur.</p>
    <button onClick={openMultiplayer}>Multiplayer'a git</button>
  </section>;
  return <section className="panel order-card">
    {session.error && <p className="network-error" role="alert">{session.error}</p>}
        <h1>Oyuncu pazarı</h1>
        <form className="network-form" onSubmit={(event) => {
          event.preventDefault(); session.setError("");
          if (!saleResource) return;
          session.send({ type: "offer", resource: saleResource, quantity: Number(quantity), total: Number(total) });
        }}>
          <label>Satılacak ürün<select aria-label="Satılacak ürün" value={saleResource ?? ""} disabled={!saleResource} onChange={(event) => setResource(event.target.value as g.Resource)}>
            {available.map((r) => <option key={r} value={r}>{g.resourceNames[r]} · {session.state.stock[r]} adet</option>)}
          </select></label>
          <label>Adet<input aria-label="Satılacak adet" type="number" min="1" max={(saleResource ? session.state.stock[saleResource] : 0)} step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>Toplam fiyat (₺)<input aria-label="Satış toplam fiyatı" type="number" min="0.01" max="1000000000" step="0.01" required value={total} onChange={(event) => setTotal(event.target.value)} /></label>
          <button type="submit" disabled={(saleResource ? session.state.stock[saleResource] : 0) < 1}>Satış ilanı aç</button>
        </form>
        <p className="muted">İlan tüm miktarı kapsar. Ürün stokta kalır; satın alma sırasında stok, bakiye ve alıcının deposu kontrol edilir.</p>
        {!available.length && <p>Satılabilecek ürününüz yok. Üretim yaptığınızda ürünler burada görünür.</p>}
        <h2>Ürün sipariş et</h2>
        <form className="network-form" onSubmit={(event) => {
          event.preventDefault(); session.setError("");
          session.send({ type: "placeOrder", resource: orderResource, quantity: Number(orderQuantity), total: Number(orderTotal) });
        }}>
          <label>Sipariş edilecek ürün<select aria-label="Sipariş edilecek ürün" value={orderResource} onChange={(event) => setOrderResource(event.target.value as g.Resource)}>
            {g.resources.map((r) => <option key={r} value={r}>{g.resourceNames[r]} · Stok: {session.state.stock[r]}</option>)}
          </select></label>
          <label>Adet<input aria-label="Sipariş adedi" type="number" min="1" max={orderRoom} step="1" required value={orderQuantity} onChange={(event) => setOrderQuantity(event.target.value)} /></label>
          <label>Toplam ödeme (₺)<input aria-label="Sipariş toplam ödemesi" type="number" min="0.01" max={Math.min(session.state.money, 1000000000)} step="0.01" required value={orderTotal} onChange={(event) => setOrderTotal(event.target.value)} /></label>
          <button type="submit" disabled={orderRoom < 1 || session.state.money < Number(orderTotal)}>Sipariş panosuna ekle</button>
        </form>
        <p className="muted">Sipariş tüm oyuncuların sipariş panosunda görünür. Ödeme teslimatta yapılır; bakiye ve depo alanı teslimat sırasında tekrar kontrol edilir.</p>
        {orderRoom < 1 && <p>Bu ürün için deponuzda yer yok.</p>}
        <h2>Satış ilanları</h2>
        <div className="player-market">{session.snapshot.offers.length === 0 ? <p>Henüz satış ilanı yok. Üretim yapıp ilk ilanı açabilirsiniz.</p> : session.snapshot.offers.map((offer) => {
          const own = offer.sellerId === session.snapshot!.playerId;
          const room = session.state.warehouseCapacity[offer.resource] - session.state.stock[offer.resource];
          return <article key={offer.id} className="player-offer">
            <small>{offer.sellerName}</small><strong className="product-name"><ProductIcon resource={offer.resource} />{offer.quantity} {g.resourceNames[offer.resource]}</strong>
            <span>{offer.total.toLocaleString("tr-TR")}₺ toplam</span>
            <button disabled={!own && (session.state.money < offer.total || room < offer.quantity)} onClick={() => {
              session.setError(""); session.send({ type: own ? "cancelOffer" : "buy", id: offer.id });
            }}>{own ? "İlanı kaldır" : room < offer.quantity ? "Depoda yer yok" : session.state.money < offer.total ? "Bakiye yetersiz" : "Satın al"}</button>
          </article>;
        })}</div>
  </section>;
}
