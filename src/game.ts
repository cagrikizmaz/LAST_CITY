export type LevelId = number;
export type Job = "idle" | "wood" | "egg" | "fruit" | "stone" | "coal" | "iron" | `product${number}`;
export type Worker = { id: string; name: string; role: string; job: Job; progress: number; strikeRemaining?: number };
export type LedgerItem = { id: number; text: string; tone: Resource | "system" };
export type Resource = Exclude<Job, "idle">;
export type Order = { id: number; needs: Record<Resource, number>; reward: number; remaining: number; duration: number };
export type OrderResult = { id: number; success: boolean; penalty: number; reward: number };
export const resourceNames: Record<Resource, string> = { wood: "Odun", egg: "Yumurta", fruit: "Meyve", stone: "Taş", coal: "Kömür", iron: "Demir" };
export const resources: Resource[] = ["wood", "egg", "fruit", "stone", "coal", "iron"];
export const levels: LevelId[] = Array.from({ length: 100 }, (_, i) => i + 1);
export const MAX_LEVEL = 100;
export const zeroStock = (): Record<Resource, number> => Object.fromEntries(resources.map(resource => [resource, 0])) as Record<Resource, number>;
export const resourceLevel: Record<Resource, LevelId> = { wood: 1, egg: 2, fruit: 3, stone: 4, coal: 5, iron: 6 };
export const CONSUMPTION_INTERVAL = 30;
export const FIRST_ORDER_DELAY = 15;
export const ORDER_DELAY_MIN = 15;
export const ORDER_DELAY_MAX = 25;
export type LaborNotice = { id: number; text: string };
export const WORK_START = 8 * 60;
export const WORK_END = 20 * 60;
export const MINUTES_PER_TICK = 1;
export const isWorkingHours = (state: GameState): boolean => state.minuteOfDay >= WORK_START && state.minuteOfDay < WORK_END;
export const formatGameTime = (minute: number): string => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const togglePause = (state: GameState): GameState => ({ ...state, paused: !state.paused });
export function skipToMorning(state: GameState): GameState {
  if (isWorkingHours(state)) return state;
  const next = finishOrder(state, canFulfillOrder(state));
  return { ...next, day: state.day + (state.minuteOfDay >= WORK_END ? 1 : 0),
    minuteOfDay: WORK_START, lastTick: Date.now() };
}

export type GameState = { day: number; minuteOfDay: number; paused: boolean; shelterCapacity: number; warehouseCapacity: Record<Resource, number>; laborEventIn: number; laborSequence: number; laborNotices: LaborNotice[]; version: number; orderQuantities: Record<Resource, number>; consumptionIn: number; shortage: boolean; order: Order | null; orderIn: number; orderSequence: number; lastOrder: OrderResult | null; seed: number; money: number; level: LevelId; selectedWorker: string | null; workers: Worker[]; stock: Record<Exclude<Job, "idle">, number>; ledger: LedgerItem[]; lastTick: number };

export const levelInfo: Record<LevelId, { title: string; subtitle: string; unlock: number; price: number; job: Exclude<Job, "idle">; icon: string; color: string; description: string }> = {
  1: { title: "Kayıp Orman", subtitle: "İlk kaynak: kes, taşı, sat", unlock: 0, price: 1, job: "wood", icon: "🪵", color: "amber", description: "Kuru ağaçlar ve eski kereste stoklarıyla yerleşimin ilk gelirini kur." },
  2: { title: "Tavukluk Vadisi", subtitle: "Daha hızlı dönen bir üretim", unlock: 20, price: 1.25, job: "egg", icon: "🥚", color: "cream", description: "Tavuklar düzenli yumurta verir. İşçilerini buraya atayarak gıda üretimini başlat." },
  3: { title: "Küller Arasında Bahçe", subtitle: "Bahçeden kampa taze gıda", unlock: 60, price: 1.5, job: "fruit", icon: "🍎", color: "green", description: "Eski meyve bahçesi yeniden canlanır. İşçiler daha yüksek değerli ürün taşır." },
  4: { title: "Taş Ocağı", subtitle: "Yerleşimin sağlam temelleri", unlock: 150, price: 2, job: "stone", icon: "🪨", color: "slate", description: "Eski taş ocağını yeniden işlet. Taş üret ve büyüyen yerleşimlerin siparişlerini karşıla." },
  5: { title: "Kömür Madeni", subtitle: "Derinlerden gelen enerji", unlock: 300, price: 2.5, job: "coal", icon: "⛏️", color: "coal", description: "Terk edilmiş galerilerde kömür çıkar. Sanayi siparişleri için yakıt biriktir." },
  6: { title: "Demir Sahası", subtitle: "Yeni şehrin endüstrisi", unlock: 550, price: 3, job: "iron", icon: "⚙️", color: "steel", description: "Demir cevheri topla ve en değerli ticaret rotalarını besle. Üretim ekibini altı bölgeye dağıt." },
};

const extraProducts = "Bakır|Kil|Kum|Buğday|Un|Ekmek|Süt|Peynir|Yün|Pamuk|İplik|Kumaş|Deri|Halat|Tuğla|Cam|Çelik|Çivi|Tahta|Kâğıt|Kömür Briketi|Tuz|Şeker|Bal|Patates|Havuç|Domates|Mısır|Pirinç|Zeytin|Zeytinyağı|Üzüm|Meyve Suyu|Reçel|Tereyağı|Yoğurt|Et|Balık|Konserve|Kurutulmuş Gıda|Sabun|Mum|Seramik|Kiremit|Çimento|Beton|Boru|Tel|Kablo|Vida|Dişli|Alet Takımı|Balta|Kazma|Kürek|El Arabası|Mobilya|Masa|Sandalye|Dolap|Yatak|Battaniye|Giysi|Bot|Eldiven|Kask|İlaç|Bandaj|Gübre|Tohum|Fidan|Kauçuk|Plastik|Petrol|Benzin|Pil|Akü|Ampul|Devre|Sensör|Motor|Pompa|Jeneratör|Güneş Paneli|Türbin|Filtre|Arıtılmış Su|Radyo|Bilgisayar|Robot Kol|Drone|Uydu Parçası|Enerji Hücresi|Şehir Çekirdeği".split("|");
extraProducts.forEach((name, index) => {
  const level = index + 7;
  const job: Resource = `product${level}`;
  resources.push(job);
  resourceNames[job] = name;
  resourceLevel[job] = level;
  levelInfo[level] = { title: `${name} Atölyesi`, subtitle: "Şehrin üretim ağı", unlock: Math.round(800 * Math.pow(1.12, level - 7)), price: Math.round((3.5 + (level - 7) * 0.65) * 100) / 100, job, icon: ["◈", "▧", "⬡", "⚒"][index % 4], color: "steel", description: `${name} üretimini başlat ve şehrin ticaret ağını büyüt.` };
});
const foodNames = new Set("Yumurta|Meyve|Buğday|Un|Ekmek|Süt|Peynir|Tuz|Şeker|Bal|Patates|Havuç|Domates|Mısır|Pirinç|Zeytin|Zeytinyağı|Üzüm|Meyve Suyu|Reçel|Tereyağı|Yoğurt|Et|Balık|Konserve|Kurutulmuş Gıda".split("|"));
export const foodResources = resources.filter(resource => foodNames.has(resourceNames[resource]));
export const foodStock = (state: GameState): number => foodResources.reduce((sum, resource) => sum + state.stock[resource], 0);
export function changeWorkers(state: GameState, job: Resource, delta: 1 | -1): GameState {
  if (!resources.includes(job) || resourceLevel[job] > state.level) return state;
  const worker = state.workers.find(item => item.job === (delta === 1 ? "idle" : job) && !item.strikeRemaining && (delta === -1 || isHoused(state, item.id)));
  return worker ? assignJob(state, worker.id, delta === 1 ? job : "idle") : state;
}

const initialState = (): GameState => ({ version: 10, day: 1, minuteOfDay: WORK_START, paused: false, shelterCapacity: 3, warehouseCapacity: Object.fromEntries(resources.map(resource => [resource, 100])) as Record<Resource, number>, laborEventIn: 240 + Math.floor(Math.random() * 241), laborSequence: 0, laborNotices: [], orderQuantities: zeroStock(), consumptionIn: 30, shortage: false, order: null, orderIn: FIRST_ORDER_DELAY, orderSequence: 0, lastOrder: null, seed: Date.now() >>> 0, money: 0, level: 1, selectedWorker: null, workers: [{ id: "w1", name: "", role: "Toplayıcı", job: "idle", progress: 0 }, { id: "w2", name: "", role: "Taşıyıcı", job: "idle", progress: 0 }, { id: "w3", name: "", role: "Usta", job: "idle", progress: 0 }], stock: zeroStock(), ledger: [{ id: 1, text: "Üç işçi kampın başında bekliyor.", tone: "system" }], lastTick: Date.now() });
export const emptyState = (): GameState => initialState();
export function addLedger(state: GameState, text: string, tone: LedgerItem["tone"] = "system"): GameState { return { ...state, ledger: [{ id: (state.ledger[0]?.id ?? 0) + 1, text, tone }, ...state.ledger].slice(0, 8) }; }
export function assignJob(state: GameState, workerId: string, job: Job): GameState { const worker = state.workers.find((item) => item.id === workerId); if (!worker || worker.strikeRemaining || (job !== "idle" && (!isHoused(state, workerId) || !resources.includes(job) || state.level < resourceLevel[job]))) return state; const next = { ...state, workers: state.workers.map((item) => item.id === workerId ? { ...item, job, progress: 0 } : item) }; const label = job === "idle" ? "boşa alındı" : `${levelInfo[resourceLevel[job]].title} görevine gönderildi`; return addLedger(next, `Bir işçi ${label}.`, job === "idle" ? "system" : job); }
export function simulateTick(state: GameState): GameState {
  if (state.paused) return state;
  const stock = { ...state.stock };
  const workers = state.workers.map(worker => {
    if (!isWorkingHours(state) || !isHoused(state, worker.id) || worker.job === "idle" || worker.strikeRemaining ||
      stock[worker.job] >= state.warehouseCapacity[worker.job]) return worker;
    const progress = worker.progress + (state.shortage ? 10 : 20);
    if (progress < 100) return { ...worker, progress };
    // Production only fills storage. Order delivery is the sole source of income.
    stock[worker.job] += 1;
    return { ...worker, progress: 0 };
  });
  const elapsed = state.minuteOfDay + MINUTES_PER_TICK;
  return simulateLabor(simulateEconomy(advanceLevel({ ...state, stock, workers,
    minuteOfDay: elapsed % 1440, day: state.day + Math.floor(elapsed / 1440), lastTick: Date.now() })));
}
export function unlockLevel(state: GameState, level: LevelId): GameState { if (state.money < levelInfo[level].unlock || state.level >= level) return state; return addLedger({ ...state, level }, `Yeni ekran açıldı: ${levelInfo[level].title}.`, "system"); }

export function warehouseUpgradeCost(state: GameState, resource: Resource): number {
  return state.warehouseCapacity[resource];
}
export function upgradeWarehouse(state: GameState, resource: Resource): GameState {
  if (!resources.includes(resource) || resourceLevel[resource] > state.level) return state;
  const cost = warehouseUpgradeCost(state, resource);
  if (state.money < cost) return state;
  return addLedger({ ...state, money: state.money - cost,
    warehouseCapacity: { ...state.warehouseCapacity, [resource]: state.warehouseCapacity[resource] + 100 } },
    `${resourceNames[resource]} deposu +100 kapasite: ?${cost}?.`);
}
export function warehouseResources(state: GameState): Resource[] {
  return resources.filter(resource => resourceLevel[resource] <= state.level).sort((a, b) =>
    state.stock[b] / state.warehouseCapacity[b] - state.stock[a] / state.warehouseCapacity[a] || resourceLevel[a] - resourceLevel[b]);
}

// Beds go to workers in arrival order, including idle workers and strikers.
export function isHoused(state: GameState, workerId: string): boolean {
  const index = state.workers.findIndex(worker => worker.id === workerId);
  return index >= 0 && index < state.shelterCapacity;
}
export const SHELTER_BEDS = 3;
export function shelterCost(state: GameState): number { return state.shelterCapacity * 10; }
export function buildShelter(state: GameState): GameState {
  const cost = shelterCost(state);
  if (state.money < cost) return state;
  return addLedger({ ...state, money: state.money - cost, shelterCapacity: state.shelterCapacity + SHELTER_BEDS },
    `Yeni barınak yapıldı: +${SHELTER_BEDS} kişilik yer, −${cost}₺.`);
}

export function hiringCost(state: GameState): number { return 25 + Math.max(0, state.workers.length - 3) * 15; }
export function hireWorker(state: GameState): GameState {
  const cost = hiringCost(state);
  if (state.money < cost) return state;
  let number = state.workers.length + 1;
  while (state.workers.some(worker => worker.id === `w${number}`)) number++;
  const worker: Worker = { id: `w${number}`, name: "", role: "Toplayıcı", job: "idle", progress: 0 };
  return addLedger({ ...state, money: state.money - cost, workers: [...state.workers, worker], selectedWorker: worker.id }, `Yeni işçi ekibe katıldı: −${cost}₺.`);
}
export function hireForJob(state: GameState, job: Resource): GameState {
  if (!resources.includes(job) || resourceLevel[job] > state.level || state.workers.length >= state.shelterCapacity) return state;
  const hired = hireWorker(state);
  return hired === state ? state : assignJob(hired, hired.selectedWorker!, job);
}
function notifyLabor(state: GameState, text: string): GameState {
  const id = state.laborSequence + 1;
  return addLedger({ ...state, laborSequence: id, laborNotices: [{ id, text }, ...state.laborNotices].slice(0, 5) }, text);
}
function simulateLabor(state: GameState): GameState {
  const returning = resources.filter(job => state.workers.some(w => w.job === job && w.strikeRemaining === 1));
  let next = { ...state, laborEventIn: state.laborEventIn - 1,
    workers: state.workers.map(w => w.strikeRemaining ? { ...w, strikeRemaining: w.strikeRemaining - 1 } : w) };
  for (const job of returning) next = notifyLabor(next, `${levelInfo[resourceLevel[job]].title}: grev bitti, işçiler üretime döndü.`);
  if (next.laborEventIn > 0) return next;
  let seed = next.seed;
  const random = (min: number, max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(seed / 4294967296 * (max - min + 1));
  };
  const interval = random(240, 480);
  const jobs = resources.filter(job => next.workers.some(w => w.job === job && !w.strikeRemaining && isHoused(next, w.id)));
  if (!jobs.length) return { ...next, seed, laborEventIn: interval };
  const job = jobs[random(0, jobs.length - 1)];
  const candidates = next.workers.filter(w => w.job === job && !w.strikeRemaining && isHoused(next, w.id));
  const strike = random(0, 1) === 1;
  // Keep one employee so resignations alone cannot permanently stop the city.
  const count = strike ? candidates.length : random(1, Math.min(2, candidates.length, Math.max(1, next.workers.length - 1)));
  next = { ...next, seed, laborEventIn: interval };
  if (!strike && next.workers.length <= 1) return next;
  const affected = new Set(candidates.slice(0, count).map(w => w.id));
  const title = levelInfo[resourceLevel[job]].title;
  if (strike) {
    next = { ...next, workers: next.workers.map(w => affected.has(w.id) ? { ...w, strikeRemaining: 600 } : w) };
    return notifyLabor(next, `${title}: ${count} işçi 10 dakikalık greve başladı. Üretimi sürdürmek için yeni işçi alıp atayabilirsin.`);
  }
  next = { ...next, workers: next.workers.filter(w => !affected.has(w.id)),
    selectedWorker: affected.has(next.selectedWorker ?? "") ? null : next.selectedWorker };
  return notifyLabor(next, `${title}: ${count} kişi istifa etti. Yerlerine yeni işçi almak ücretli.`);
}
export function consumptionNeeds(state: GameState) {
  return { food: state.level >= 2 ? state.workers.length : 0 };
}
export function canFulfillOrder(state: GameState): boolean {
  return state.order !== null && resources.every(resource => state.stock[resource] >= state.order!.needs[resource]);
}
function advanceLevel(state: GameState): GameState {
  let level = state.level;
  while (level < MAX_LEVEL && state.money >= levelInfo[(level + 1) as LevelId].unlock) level = (level + 1) as LevelId;
  return { ...state, level };
}
function finishOrder(state: GameState, success: boolean): GameState {
  if (!state.order) return state;
  const order = state.order;
  const stock = { ...state.stock };
  if (success) resources.forEach(resource => { stock[resource] -= order.needs[resource]; });
  return addLedger(advanceLevel({ ...state, stock, money: state.money + (success ? order.reward : -order.reward / 2), order: null,
    lastOrder: { id: order.id, success, penalty: success ? 0 : order.reward / 2, reward: success ? order.reward : 0 } }),
    success ? `Sipariş #${order.id} başarılı! +${order.reward}₺.` : `Sipariş #${order.id} başarısız: depoda yeterli ürün yok. Ceza: −${order.reward / 2}₺.`);
}
export function fulfillOrder(state: GameState): GameState {
  return canFulfillOrder(state) ? finishOrder(state, true) : state;
}
function simulateEconomy(state: GameState): GameState {
  let next = { ...state, consumptionIn: state.consumptionIn - 1 };
  if (next.consumptionIn <= 0) {
    const stock = { ...next.stock };
    const needs = consumptionNeeds(next);
    // Eat the most plentiful food first, preserving variety for orders.
    let food = 0;
    while (food < needs.food) {
      const resource = foodResources.reduce((best, candidate) => stock[candidate] > stock[best] ? candidate : best);
      if (stock[resource] <= 0) break;
      stock[resource]--;
      food++;
    }
    const shortage = food < needs.food;
    next = addLedger({ ...next, stock, shortage, consumptionIn: CONSUMPTION_INTERVAL },
      `Kamp tüketimi: ${food} gıda.${shortage ? " Erzak eksik: üretim %50 hızda." : " İhtiyaçlar karşılandı: üretim tam hızda."}`);
  }
  if (next.order) {
    next = { ...next, order: { ...next.order, remaining: next.order.remaining - 1 } };
    if (next.order!.remaining <= 0) next = finishOrder(next, canFulfillOrder(next));
  } else {
    next = { ...next, orderIn: next.orderIn - 1 };
    if (next.orderIn <= 0) {
      let seed = next.seed;
      const random = (min: number, max: number) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return min + Math.floor(seed / 4294967296 * (max - min + 1));
      };
      const needs = zeroStock();
      const available = resources.filter(resource => resourceLevel[resource] <= next.level);
      const crew = Math.max(1, next.workers.filter(w => isHoused(next, w.id) && !w.strikeRemaining).length);
      const count = random(1, Math.min(6, crew, Math.max(1, available.length - 1)));
      const averageStock = available.reduce((sum, resource) => sum + next.stock[resource], 0) / available.length;
      const pressure = (resource: Resource) => averageStock <= 0 ? "normal"
        : next.stock[resource] >= averageStock * 1.5 ? "surplus"
        : next.stock[resource] <= averageStock * 0.5 ? "scarce" : "normal";
      const weight = (resource: Resource) => pressure(resource) === "surplus" ? 3 : pressure(resource) === "scarce" ? 2 : 1;
      const pool = [...available];
      const requested: Resource[] = [];
      // Weighted sampling without replacement, reproducible from the saved seed.
      for (let i = 0; i < count; i++) {
        let ticket = random(1, pool.reduce((sum, resource) => sum + weight(resource), 0));
        const chosen = pool.findIndex(resource => { ticket -= weight(resource); return ticket <= 0; });
        requested.push(pool.splice(chosen, 1)[0]);
      }
      const orderQuantities = { ...next.orderQuantities };
      for (const resource of requested) {
        const previous = next.orderQuantities[resource];
        // Growth is bounded by the crew and storage, never by elapsed order count alone.
        const limit = Math.min(next.warehouseCapacity[resource], Math.max(12, Math.floor(crew * 8 / count)));
        const base = Math.min(limit, previous > 0 ? previous + random(1, 3) : resource === "wood" ? random(10, 14) : random(3, 10));
        // Stock pressure is temporary; do not compound it into future base quantities.
        orderQuantities[resource] = base;
        needs[resource] = Math.min(next.warehouseCapacity[resource], pressure(resource) === "surplus"
          ? Math.max(base, Math.ceil(next.stock[resource] * 0.6))
          : pressure(resource) === "scarce" ? Math.min(limit, base + random(2, 4)) : base);
      }
      const missing = requested.reduce((sum, resource) => sum + Math.max(0, needs[resource] - next.stock[resource]), 0);
      // Allow food production and slow production during shortages, plus time to reassign.
      const netRate = Math.max(0.05, crew * 0.1 - (next.level >= 2 ? next.workers.length / CONSUMPTION_INTERVAL : 0));
      const duration = Math.max(random(60, 90), Math.min(240, Math.ceil(missing / netRate) + 20));
      const reward = Math.ceil(resources.reduce((total, resource) => total + needs[resource] * levelInfo[resourceLevel[resource]].price, 0) * 2);
      const order = { id: next.orderSequence + 1, needs, reward, duration, remaining: duration };
      const orderIn = random(ORDER_DELAY_MIN, ORDER_DELAY_MAX);
      next = addLedger({ ...next, seed, order, orderIn, orderQuantities, orderSequence: order.id }, `Yeni sipariş #${order.id}: ${duration} saniye, ${reward}₺ ödül.`);
    }
  }
  return next;
}
// Migrate existing saves without losing the player's workers, money or warehouse.
export function loadGame(raw: string | null): GameState {
  const defaults = emptyState();
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || !Array.isArray(saved.workers) || !saved.workers.length || !saved.stock ||
      !resources.every(resource => saved.stock[resource] === undefined || (Number.isFinite(saved.stock[resource]) && saved.stock[resource] >= 0)) ||
      !Number.isFinite(saved.money) || !levels.includes(saved.level)) return defaults;
    const stock = { ...zeroStock(), ...saved.stock };
    const order = saved.order ? { ...saved.order, needs: { ...zeroStock(), ...saved.order.needs } } : null;
    const orderQuantities = { ...zeroStock(), ...(saved.orderQuantities ?? order?.needs) };
    const warehouseCapacity = Object.fromEntries(resources.map(resource => {
      const capacity = saved.warehouseCapacity?.[resource];
      return [resource, Number.isSafeInteger(capacity) && capacity >= 100 ? capacity : 100];
    })) as Record<Resource, number>;
    const shelterCapacity = Number.isSafeInteger(saved.shelterCapacity) && saved.shelterCapacity >= 3
      ? saved.shelterCapacity : saved.shelterCapacity === undefined
        ? Math.max(3, Math.ceil(saved.workers.length / SHELTER_BEDS) * SHELTER_BEDS) : 3;
    const orderIn = Number.isFinite(saved.orderIn) && saved.orderIn > 0
      ? (saved.version >= 9 ? saved.orderIn : Math.min(saved.orderIn, ORDER_DELAY_MAX)) : FIRST_ORDER_DELAY;
    return advanceLevel({ ...defaults, ...saved, stock, order, orderIn, orderQuantities, warehouseCapacity, shelterCapacity,
      lastOrder: saved.lastOrder ? { penalty: 0, ...saved.lastOrder } : null, version: 10,
      day: Number.isSafeInteger(saved.day) && saved.day >= 1 ? saved.day : 1,
      minuteOfDay: Number.isInteger(saved.minuteOfDay) && saved.minuteOfDay >= 0 && saved.minuteOfDay < 1440 ? saved.minuteOfDay : WORK_START,
      paused: saved.paused === true, lastTick: Date.now() });
  } catch { return defaults; }
}


