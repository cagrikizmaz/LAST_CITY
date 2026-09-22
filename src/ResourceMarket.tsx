import { ProductIcon } from "./ProductIcon";
import { useState } from "react";
import * as g from "./game";
import type { Dispatch } from "./commands";

export function ResourceMarket({ state, act }: { state: g.GameState; act: Dispatch }) {
  const [resource, setResource] = useState<g.Resource>("wood");
  const [quantity, setQuantity] = useState("1");
  const count = Number(quantity);
  const valid = Number.isSafeInteger(count) && count > 0;
  const price = g.marketPrice(state, resource);
  const buy = Math.round(price * count * 1.2 * 100) / 100;
  const sell = Math.round(price * count * 0.8 * 100) / 100;
  return <section className="panel order-card">
    <h1>Ürün pazarı</h1>
    <p>Tüm üretim ürünlerini sat veya eksik malzemeleri sipariş et. Satın alınan ürünler hemen depoya gelir. Sahalar, çalışan işçilerin eksik aletlerini stoktan otomatik alır; yıpranıp tükenen aletleri de stok varsa yeniler. Hayvanlar yem stokunu otomatik kullanır.</p>
    <div className="network-form">
      <label>Ürün<select aria-label="Pazar ürünü" value={resource} onChange={e => setResource(e.target.value as g.Resource)}>
        {g.tradeResources.map(r => <option key={r} value={r}>{g.resourceNames[r]}</option>)}
      </select></label>
      <label>Miktar<input aria-label="Pazar miktarı" type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <span className="product-name"><ProductIcon resource={resource} />Stok: {state.stock[resource]} / {state.warehouseCapacity[resource]}</span>
      <button disabled={!valid || state.money < buy || state.stock[resource] + count > state.warehouseCapacity[resource]}
        onClick={() => act({ type: "tradeResource", args: [resource, count, "buy"] })}>Satın al · {(valid ? buy : 0).toLocaleString("tr-TR")}₺</button>
      <button disabled={!valid || state.stock[resource] < count}
        onClick={() => act({ type: "tradeResource", args: [resource, count, "sell"] })}>Sat · {(valid ? sell : 0).toLocaleString("tr-TR")}₺</button>
    </div>
    <small>Alış: piyasa değerinin %120’si · Satış: %80’i. Daha yüksek gelir için Siparişler panosunu kullan.</small>
  </section>;
}
