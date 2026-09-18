export type LevelId = number;
export type Job =
  | "idle"
  | "wood"
  | "egg"
  | "fruit"
  | "stone"
  | "coal"
  | "iron"
  | `product${number}`;
export type Worker = {
  id: string;
  name: string;
  role: string;
  job: Job;
  progress: number;
  strikeRemaining?: number;
};
export type LedgerItem = {
  id: number;
  text: string;
  tone: Resource | "system";
};
export type Resource = Exclude<Job, "idle">;
export type Order = {
  id: number;
  needs: Record<Resource, number>;
  reward: number;
  remaining: number;
  duration: number;
};
export type OrderResult = {
  id: number;
  success: boolean;
  penalty: number;
  reward: number;
};
export const resourceNames: Record<Resource, string> = {
  wood: "Odun",
  egg: "Yumurta",
  fruit: "Meyve",
  stone: "Taş",
  coal: "Kömür",
  iron: "Demir",
};
export const resources: Resource[] = [
  "wood",
  "egg",
  "fruit",
  "stone",
  "coal",
  "iron",
];
export const levels: LevelId[] = Array.from({ length: 100 }, (_, i) => i + 1);
export const MAX_LEVEL = 100;
export const zeroStock = (): Record<Resource, number> =>
  Object.fromEntries(resources.map((resource) => [resource, 0])) as Record<
    Resource,
    number
  >;
export const resourceLevel: Record<Resource, LevelId> = {
  wood: 1,
  egg: 2,
  fruit: 3,
  stone: 4,
  coal: 5,
  iron: 6,
};
export const FIRST_ORDER_DELAY = 15;
export const ORDER_DELAY_MIN = 15;
export const ORDER_DELAY_MAX = 25;
export type LaborNotice = { id: number; text: string };
export const WORK_START = 8 * 60;
export const WORK_END = 20 * 60;
export const MINUTES_PER_TICK = 1;
export const isWorkingHours = (state: GameState): boolean =>
  state.minuteOfDay >= WORK_START && state.minuteOfDay < WORK_END;
export const formatGameTime = (minute: number): string =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
export const togglePause = (state: GameState): GameState => ({
  ...state,
  paused: !state.paused,
});
export function skipToMorning(state: GameState): GameState {
  if (isWorkingHours(state)) return state;
  const resolved = finishOrder(state, canFulfillOrder(state));
  const next =
    state.minuteOfDay >= WORK_END ? payDailyWages(resolved) : resolved;
  return {
    ...next,
    day: state.day + (state.minuteOfDay >= WORK_END ? 1 : 0),
    minuteOfDay: WORK_START,
    lastTick: Date.now(),
  };
}

export type GameState = {
  sites: Record<string, SiteState>;
  equipment: Equipment[];
  equipmentSequence: number;
  day: number;
  minuteOfDay: number;
  paused: boolean;
  shelterCapacity: number;
  warehouseCapacity: Record<Resource, number>;
  laborEventIn: number;
  laborSequence: number;
  laborNotices: LaborNotice[];
  version: number;
  orderQuantities: Record<Resource, number>;
  consumptionIn: number;
  shortage: boolean;
  order: Order | null;
  orderIn: number;
  orderSequence: number;
  lastOrder: OrderResult | null;
  seed: number;
  money: number;
  level: LevelId;
  selectedWorker: string | null;
  workers: Worker[];
  stock: Record<Exclude<Job, "idle">, number>;
  ledger: LedgerItem[];
  lastTick: number;
};

export const levelInfo: Record<
  LevelId,
  {
    title: string;
    subtitle: string;
    unlock: number;
    price: number;
    job: Exclude<Job, "idle">;
    icon: string;
    color: string;
    description: string;
  }
> = {
  1: {
    title: "Kayıp Orman",
    subtitle: "İlk kaynak: kes, taşı, sat",
    unlock: 0,
    price: 1,
    job: "wood",
    icon: "🪵",
    color: "amber",
    description:
      "Kuru ağaçlar ve eski kereste stoklarıyla yerleşimin ilk gelirini kur.",
  },
  2: {
    title: "Tavukluk Vadisi",
    subtitle: "Daha hızlı dönen bir üretim",
    unlock: 20,
    price: 1.25,
    job: "egg",
    icon: "🥚",
    color: "cream",
    description:
      "Tavuklar düzenli yumurta verir. İşçilerini buraya atayarak gıda üretimini başlat.",
  },
  3: {
    title: "Küller Arasında Bahçe",
    subtitle: "Bahçeden kampa taze gıda",
    unlock: 60,
    price: 1.5,
    job: "fruit",
    icon: "🍎",
    color: "green",
    description:
      "Eski meyve bahçesi yeniden canlanır. İşçiler daha yüksek değerli ürün taşır.",
  },
  4: {
    title: "Taş Ocağı",
    subtitle: "Yerleşimin sağlam temelleri",
    unlock: 150,
    price: 2,
    job: "stone",
    icon: "🪨",
    color: "slate",
    description:
      "Eski taş ocağını yeniden işlet. Taş üret ve büyüyen yerleşimlerin siparişlerini karşıla.",
  },
  5: {
    title: "Kömür Madeni",
    subtitle: "Derinlerden gelen enerji",
    unlock: 300,
    price: 2.5,
    job: "coal",
    icon: "⛏️",
    color: "coal",
    description:
      "Terk edilmiş galerilerde kömür çıkar. Sanayi siparişleri için yakıt biriktir.",
  },
  6: {
    title: "Demir Sahası",
    subtitle: "Yeni şehrin endüstrisi",
    unlock: 550,
    price: 3,
    job: "iron",
    icon: "⚙️",
    color: "steel",
    description:
      "Demir cevheri topla ve en değerli ticaret rotalarını besle. Üretim ekibini altı bölgeye dağıt.",
  },
};

const extraProducts =
  "Bakır|Kil|Kum|Buğday|Un|Ekmek|Süt|Peynir|Yün|Pamuk|İplik|Kumaş|Deri|Halat|Tuğla|Cam|Çelik|Çivi|Tahta|Kâğıt|Kömür Briketi|Tuz|Şeker|Bal|Patates|Havuç|Domates|Mısır|Pirinç|Zeytin|Zeytinyağı|Üzüm|Meyve Suyu|Reçel|Tereyağı|Yoğurt|Et|Balık|Konserve|Kurutulmuş Gıda|Sabun|Mum|Seramik|Kiremit|Çimento|Beton|Boru|Tel|Kablo|Vida|Dişli|Alet Takımı|Balta|Kazma|Kürek|El Arabası|Mobilya|Masa|Sandalye|Dolap|Yatak|Battaniye|Giysi|Bot|Eldiven|Kask|İlaç|Bandaj|Gübre|Tohum|Fidan|Kauçuk|Plastik|Petrol|Benzin|Pil|Akü|Ampul|Devre|Sensör|Motor|Pompa|Jeneratör|Güneş Paneli|Türbin|Filtre|Arıtılmış Su|Radyo|Bilgisayar|Robot Kol|Drone|Uydu Parçası|Enerji Hücresi|Şehir Çekirdeği".split(
    "|",
  );
extraProducts.forEach((name, index) => {
  const level = index + 7;
  const job: Resource = `product${level}`;
  resources.push(job);
  resourceNames[job] = name;
  resourceLevel[job] = level;
  levelInfo[level] = {
    title: `${name} Atölyesi`,
    subtitle: "Şehrin üretim ağı",
    unlock: Math.round(800 * Math.pow(1.12, level - 7)),
    price: Math.round((3.5 + (level - 7) * 0.65) * 100) / 100,
    job,
    icon: ["◈", "▧", "⬡", "⚒"][index % 4],
    color: "steel",
    description: `${name} üretimini başlat ve şehrin ticaret ağını büyüt.`,
  };
});
const foodNames = new Set(
  "Yumurta|Meyve|Buğday|Un|Ekmek|Süt|Peynir|Tuz|Şeker|Bal|Patates|Havuç|Domates|Mısır|Pirinç|Zeytin|Zeytinyağı|Üzüm|Meyve Suyu|Reçel|Tereyağı|Yoğurt|Et|Balık|Konserve|Kurutulmuş Gıda".split(
    "|",
  ),
);
export const foodResources = resources.filter((resource) =>
  foodNames.has(resourceNames[resource]),
);
export const foodStock = (state: GameState): number =>
  foodResources.reduce((sum, resource) => sum + state.stock[resource], 0);
export function changeWorkers(
  state: GameState,
  job: Resource,
  delta: 1 | -1,
): GameState {
  if (!resources.includes(job) || !ownedSite(state, job)) return state;
  if (delta === 1 && !canAssign(state, job)) return state;
  const worker = state.workers.find(
    (item) =>
      item.job === (delta === 1 ? "idle" : job) &&
      !item.strikeRemaining &&
      (delta === -1 || isHoused(state, item.id)),
  );
  return worker
    ? assignJob(state, worker.id, delta === 1 ? job : "idle")
    : state;
}

const initialState = (): GameState => ({
  version: 12,
  sites: {},
  equipment: [],
  equipmentSequence: 0,
  day: 1,
  minuteOfDay: WORK_START,
  paused: false,
  shelterCapacity: 3,
  warehouseCapacity: Object.fromEntries(
    resources.map((resource) => [resource, 100]),
  ) as Record<Resource, number>,
  laborEventIn: 240 + Math.floor(Math.random() * 241),
  laborSequence: 0,
  laborNotices: [],
  orderQuantities: zeroStock(),
  consumptionIn: 30,
  shortage: false,
  order: null,
  orderIn: FIRST_ORDER_DELAY,
  orderSequence: 0,
  lastOrder: null,
  seed: Date.now() >>> 0,
  money: 250,
  level: 1,
  selectedWorker: null,
  workers: [
    { id: "w1", name: "", role: "Toplayıcı", job: "idle", progress: 0 },
    { id: "w2", name: "", role: "Taşıyıcı", job: "idle", progress: 0 },
    { id: "w3", name: "", role: "Usta", job: "idle", progress: 0 },
  ],
  stock: zeroStock(),
  ledger: [{ id: 1, text: "Üç işçi kampın başında bekliyor.", tone: "system" }],
  lastTick: Date.now(),
});
export const emptyState = (): GameState => initialState();
export function addLedger(
  state: GameState,
  text: string,
  tone: LedgerItem["tone"] = "system",
): GameState {
  return {
    ...state,
    ledger: [
      { id: (state.ledger[0]?.id ?? 0) + 1, text, tone },
      ...state.ledger,
    ].slice(0, 8),
  };
}
export function assignJob(
  state: GameState,
  workerId: string,
  job: Job,
): GameState {
  const worker = state.workers.find((item) => item.id === workerId);
  if (
    !worker ||
    worker.strikeRemaining ||
    (job !== "idle" &&
      (!isHoused(state, workerId) ||
        !resources.includes(job) ||
        !ownedSite(state, job)))
  )
    return state;
  if (job !== "idle" && worker.job !== job && !canAssign(state, job))
    return state;
  const next = {
    ...state,
    workers: state.workers.map((item) =>
      item.id === workerId ? { ...item, job, progress: 0 } : item,
    ),
  };
  const label =
    job === "idle"
      ? "boşa alındı"
      : `${levelInfo[resourceLevel[job]].title} görevine gönderildi`;
  return addLedger(next, `Bir işçi ${label}.`, job === "idle" ? "system" : job);
}
export function simulateTick(state: GameState): GameState {
  if (state.paused) return state;
  const production = produce(state);
  const { stock, workers } = production;
  const elapsed = state.minuteOfDay + MINUTES_PER_TICK;
  const next = simulateEconomy(
    advanceLevel({
      ...production,
      stock,
      workers,
      minuteOfDay: elapsed % 1440,
      day: state.day + Math.floor(elapsed / 1440),
      lastTick: Date.now(),
    }),
  );
  return simulateLabor(elapsed >= 1440 ? payDailyWages(next) : next);
}
export function unlockLevel(state: GameState, level: LevelId): GameState {
  const site = siteDefinitions.find(
    (site) => resourceLevel[site.job] === level,
  );
  return site ? purchaseSite(state, site.id) : state;
}

export function warehouseUpgradeCost(
  state: GameState,
  resource: Resource,
): number {
  return state.warehouseCapacity[resource];
}
export function upgradeWarehouse(
  state: GameState,
  resource: Resource,
): GameState {
  if (!resources.includes(resource) || !ownedSite(state, resource))
    return state;
  const cost = warehouseUpgradeCost(state, resource);
  if (state.money < cost) return state;
  return addLedger(
    {
      ...state,
      money: state.money - cost,
      warehouseCapacity: {
        ...state.warehouseCapacity,
        [resource]: state.warehouseCapacity[resource] + 100,
      },
    },
    `${resourceNames[resource]} deposu +100 kapasite: ?${cost}?.`,
  );
}
export function warehouseResources(state: GameState): Resource[] {
  return resources
    .filter((resource) => !!ownedSite(state, resource))
    .sort(
      (a, b) =>
        state.stock[b] / state.warehouseCapacity[b] -
          state.stock[a] / state.warehouseCapacity[a] ||
        resourceLevel[a] - resourceLevel[b],
    );
}

// Beds go to workers in arrival order, including idle workers and strikers.
export function isHoused(state: GameState, workerId: string): boolean {
  const index = state.workers.findIndex((worker) => worker.id === workerId);
  return index >= 0 && index < state.shelterCapacity;
}
export const SHELTER_BEDS = 3;
export function shelterCost(state: GameState): number {
  return state.shelterCapacity * 10;
}
export function buildShelter(state: GameState): GameState {
  const cost = shelterCost(state);
  if (state.money < cost) return state;
  return addLedger(
    {
      ...state,
      money: state.money - cost,
      shelterCapacity: state.shelterCapacity + SHELTER_BEDS,
    },
    `Yeni barınak yapıldı: +${SHELTER_BEDS} kişilik yer, −${cost}₺.`,
  );
}

export function hiringCost(state: GameState): number {
  return 25 + Math.max(0, state.workers.length - 3) * 15;
}
export const dailyWagePerWorker = (state: GameState): number =>
  hiringCost(state) * 0.1;
export const dailyPayroll = (state: GameState): number =>
  Math.round(dailyWagePerWorker(state) * state.workers.length * 100) / 100;
function payDailyWages(state: GameState): GameState {
  const amount = dailyPayroll(state);
  return addLedger(
    { ...state, money: Math.round((state.money - amount) * 100) / 100 },
    `Günlük işçi ücretleri: ${state.workers.length} işçi, −${amount.toLocaleString("tr-TR")}₺.`,
  );
}

export function hireWorker(state: GameState): GameState {
  const cost = hiringCost(state);
  if (state.money < cost) return state;
  let number = state.workers.length + 1;
  while (state.workers.some((worker) => worker.id === `w${number}`)) number++;
  const worker: Worker = {
    id: `w${number}`,
    name: "",
    role: "Toplayıcı",
    job: "idle",
    progress: 0,
  };
  return addLedger(
    {
      ...state,
      money: state.money - cost,
      workers: [...state.workers, worker],
      selectedWorker: worker.id,
    },
    `Yeni işçi ekibe katıldı: −${cost}₺.`,
  );
}
export function hireForJob(state: GameState, job: Resource): GameState {
  if (state.workers.some((w) => w.job === "idle"))
    return changeWorkers(state, job, 1);
  if (
    !resources.includes(job) ||
    !canAssign(state, job) ||
    state.workers.length >= state.shelterCapacity
  )
    return state;
  const hired = hireWorker(state);
  return hired === state ? state : assignJob(hired, hired.selectedWorker!, job);
}
function notifyLabor(state: GameState, text: string): GameState {
  const id = state.laborSequence + 1;
  return addLedger(
    {
      ...state,
      laborSequence: id,
      laborNotices: [{ id, text }, ...state.laborNotices].slice(0, 5),
    },
    text,
  );
}
function simulateLabor(state: GameState): GameState {
  const returning = resources.filter((job) =>
    state.workers.some((w) => w.job === job && w.strikeRemaining === 1),
  );
  let next = {
    ...state,
    laborEventIn: state.laborEventIn - 1,
    workers: state.workers.map((w) =>
      w.strikeRemaining ? { ...w, strikeRemaining: w.strikeRemaining - 1 } : w,
    ),
  };
  for (const job of returning)
    next = notifyLabor(
      next,
      `${levelInfo[resourceLevel[job]].title}: grev bitti, işçiler üretime döndü.`,
    );
  if (next.laborEventIn > 0) return next;
  let seed = next.seed;
  const random = (min: number, max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor((seed / 4294967296) * (max - min + 1));
  };
  const interval = random(240, 480);
  const jobs = resources.filter((job) =>
    next.workers.some(
      (w) => w.job === job && !w.strikeRemaining && isHoused(next, w.id),
    ),
  );
  if (!jobs.length) return { ...next, seed, laborEventIn: interval };
  const job = jobs[random(0, jobs.length - 1)];
  const candidates = next.workers.filter(
    (w) => w.job === job && !w.strikeRemaining && isHoused(next, w.id),
  );
  const strike = random(0, 1) === 1;
  // Keep one employee so resignations alone cannot permanently stop the city.
  const count = strike
    ? candidates.length
    : random(
        1,
        Math.min(2, candidates.length, Math.max(1, next.workers.length - 1)),
      );
  next = { ...next, seed, laborEventIn: interval };
  if (!strike && next.workers.length <= 1) return next;
  const affected = new Set(candidates.slice(0, count).map((w) => w.id));
  const title = levelInfo[resourceLevel[job]].title;
  if (strike) {
    next = {
      ...next,
      workers: next.workers.map((w) =>
        affected.has(w.id) ? { ...w, strikeRemaining: 600 } : w,
      ),
    };
    return notifyLabor(
      next,
      `${title}: ${count} işçi 10 dakikalık greve başladı. Üretimi sürdürmek için yeni işçi alıp atayabilirsin.`,
    );
  }
  next = {
    ...next,
    workers: next.workers.filter((w) => !affected.has(w.id)),
    selectedWorker: affected.has(next.selectedWorker ?? "")
      ? null
      : next.selectedWorker,
  };
  return notifyLabor(
    next,
    `${title}: ${count} kişi istifa etti. Yerlerine yeni işçi almak ücretli.`,
  );
}

export function canFulfillOrder(state: GameState): boolean {
  return (
    state.order !== null &&
    resources.every(
      (resource) => state.stock[resource] >= state.order!.needs[resource],
    )
  );
}
function advanceLevel(state: GameState): GameState {
  return state;
}
function finishOrder(state: GameState, success: boolean): GameState {
  if (!state.order) return state;
  const order = state.order;
  const stock = { ...state.stock };
  if (success)
    resources.forEach((resource) => {
      stock[resource] -= order.needs[resource];
    });
  return addLedger(
    advanceLevel({
      ...state,
      stock,
      money: state.money + (success ? order.reward : -order.reward / 2),
      order: null,
      lastOrder: {
        id: order.id,
        success,
        penalty: success ? 0 : order.reward / 2,
        reward: success ? order.reward : 0,
      },
    }),
    success
      ? `Sipariş #${order.id} başarılı! +${order.reward}₺.`
      : `Sipariş #${order.id} başarısız: depoda yeterli ürün yok. Ceza: −${order.reward / 2}₺.`,
  );
}
export function fulfillOrder(state: GameState): GameState {
  return canFulfillOrder(state) ? finishOrder(state, true) : state;
}
function simulateEconomy(state: GameState): GameState {
  let next = state;
  if (next.order) {
    next = {
      ...next,
      order: { ...next.order, remaining: next.order.remaining - 1 },
    };
    if (next.order!.remaining <= 0)
      next = finishOrder(next, canFulfillOrder(next));
  } else {
    next = { ...next, orderIn: next.orderIn - 1 };
    if (next.orderIn <= 0) {
      let seed = next.seed;
      const random = (min: number, max: number) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return min + Math.floor((seed / 4294967296) * (max - min + 1));
      };
      const needs = zeroStock();
      const available = resources.filter(
        (resource) => !!ownedSite(next, resource),
      );
      if (!available.length) return { ...next, orderIn: FIRST_ORDER_DELAY };
      const crew = Math.max(
        1,
        next.workers.filter((w) => isHoused(next, w.id) && !w.strikeRemaining)
          .length,
      );
      const count = random(
        1,
        Math.min(6, crew, Math.max(1, available.length - 1)),
      );
      const averageStock =
        available.reduce((sum, resource) => sum + next.stock[resource], 0) /
        available.length;
      const pressure = (resource: Resource) =>
        averageStock <= 0
          ? "normal"
          : next.stock[resource] >= averageStock * 1.5
            ? "surplus"
            : next.stock[resource] <= averageStock * 0.5
              ? "scarce"
              : "normal";
      const weight = (resource: Resource) =>
        pressure(resource) === "surplus"
          ? 3
          : pressure(resource) === "scarce"
            ? 2
            : 1;
      const pool = [...available];
      const requested: Resource[] = [];
      // Weighted sampling without replacement, reproducible from the saved seed.
      for (let i = 0; i < count; i++) {
        let ticket = random(
          1,
          pool.reduce((sum, resource) => sum + weight(resource), 0),
        );
        const chosen = pool.findIndex((resource) => {
          ticket -= weight(resource);
          return ticket <= 0;
        });
        requested.push(pool.splice(chosen, 1)[0]);
      }
      const orderQuantities = { ...next.orderQuantities };
      for (const resource of requested) {
        const previous = next.orderQuantities[resource];
        // Growth is bounded by the crew and storage, never by elapsed order count alone.
        const limit = Math.min(
          next.warehouseCapacity[resource],
          Math.max(12, Math.floor((crew * 8) / count)),
        );
        const base = Math.min(
          limit,
          previous > 0
            ? previous + random(1, 3)
            : resource === "wood"
              ? random(10, 14)
              : random(3, 10),
        );
        // Stock pressure is temporary; do not compound it into future base quantities.
        orderQuantities[resource] = base;
        needs[resource] = Math.min(
          next.warehouseCapacity[resource],
          pressure(resource) === "surplus"
            ? Math.max(base, Math.ceil(next.stock[resource] * 0.6))
            : pressure(resource) === "scarce"
              ? Math.min(limit, base + random(2, 4))
              : base,
        );
      }
      const missing = requested.reduce(
        (sum, resource) =>
          sum + Math.max(0, needs[resource] - next.stock[resource]),
        0,
      );
      // Allow time to produce missing stock and reassign workers.
      const netRate = crew * 0.2;
      const duration = Math.max(
        random(60, 90),
        Math.min(240, Math.ceil(missing / netRate) + 20),
      );
      const reward = Math.ceil(
        resources.reduce(
          (total, resource) =>
            total + needs[resource] * levelInfo[resourceLevel[resource]].price,
          0,
        ) * 2,
      );
      const order = {
        id: next.orderSequence + 1,
        needs,
        reward,
        duration,
        remaining: duration,
      };
      const orderIn = random(ORDER_DELAY_MIN, ORDER_DELAY_MAX);
      next = addLedger(
        {
          ...next,
          seed,
          order,
          orderIn,
          orderQuantities,
          orderSequence: order.id,
        },
        `Yeni sipariş #${order.id}: ${duration} saniye, ${reward}₺ ödül.`,
      );
    }
  }
  return next;
}
// Migrate existing saves without losing the player's workers, money or warehouse.
export function loadGame(raw: string | null): GameState {
  const defaults = emptyState();
  try {
    const saved = JSON.parse(raw ?? "null");
    if (
      !saved ||
      !Array.isArray(saved.workers) ||
      !saved.workers.length ||
      !saved.stock ||
      !resources.every(
        (resource) =>
          saved.stock[resource] === undefined ||
          (Number.isFinite(saved.stock[resource]) &&
            saved.stock[resource] >= 0),
      ) ||
      !Number.isFinite(saved.money) ||
      !levels.includes(saved.level)
    )
      return defaults;
    const stock = { ...zeroStock(), ...saved.stock };
    const order = saved.order
      ? { ...saved.order, needs: { ...zeroStock(), ...saved.order.needs } }
      : null;
    const orderQuantities = {
      ...zeroStock(),
      ...(saved.orderQuantities ?? order?.needs),
    };
    const warehouseCapacity = Object.fromEntries(
      resources.map((resource) => {
        const capacity = saved.warehouseCapacity?.[resource];
        return [
          resource,
          Number.isSafeInteger(capacity) && capacity >= 100 ? capacity : 100,
        ];
      }),
    ) as Record<Resource, number>;
    const shelterCapacity =
      Number.isSafeInteger(saved.shelterCapacity) && saved.shelterCapacity >= 3
        ? saved.shelterCapacity
        : saved.shelterCapacity === undefined
          ? Math.max(
              3,
              Math.ceil(saved.workers.length / SHELTER_BEDS) * SHELTER_BEDS,
            )
          : 3;
    const orderIn =
      Number.isFinite(saved.orderIn) && saved.orderIn > 0
        ? saved.version >= 9
          ? saved.orderIn
          : Math.min(saved.orderIn, ORDER_DELAY_MAX)
        : FIRST_ORDER_DELAY;
    return migrateSites(
      {
        ...defaults,
        ...saved,
        stock,
        order,
        orderIn,
        orderQuantities,
        warehouseCapacity,
        shelterCapacity,
        lastOrder: saved.lastOrder ? { penalty: 0, ...saved.lastOrder } : null,
        version: 12,
        day: Number.isSafeInteger(saved.day) && saved.day >= 1 ? saved.day : 1,
        minuteOfDay:
          Number.isInteger(saved.minuteOfDay) &&
          saved.minuteOfDay >= 0 &&
          saved.minuteOfDay < 1440
            ? saved.minuteOfDay
            : WORK_START,
        shortage: false,
        consumptionIn: 30,
        paused: saved.paused === true,
        lastTick: Date.now(),
      },
      saved,
    );
  } catch {
    return defaults;
  }
}

export type Category = "forest" | "farm" | "livestock" | "mine";
export const categories: {
  id: Category;
  name: string;
  icon: string;
  manager: string;
}[] = [
  { id: "forest", name: "Orman", icon: "🌲", manager: "Orman Müdürü" },
  { id: "farm", name: "Tarım", icon: "🌾", manager: "Tarım Müdürü" },
  {
    id: "livestock",
    name: "Hayvancılık",
    icon: "🐄",
    manager: "Hayvancılık Müdürü",
  },
  { id: "mine", name: "Maden", icon: "⛏️", manager: "Maden Müdürü" },
];
export const equipmentTypes = {
  axe: { name: "Balta", price: 12, icon: "🪓" },
  gloves: { name: "Eldiven", price: 5, icon: "🧤" },
  pick: { name: "Kazma", price: 15, icon: "⛏️" },
  cart: { name: "El arabası", price: 20, icon: "🛒" },
  helmet: { name: "Baret", price: 10, icon: "⛑️" },
  basket: { name: "Yumurta sepeti", price: 8, icon: "🧺" },
  hoe: { name: "Çapa", price: 10, icon: "⚒️" },
  bucket: { name: "Süt kovası", price: 10, icon: "🪣" },
  shears: { name: "Kırkım makası", price: 12, icon: "✂️" },
  bow: { name: "Av yayı", price: 15, icon: "🏹" },
};
export type EquipmentType = keyof typeof equipmentTypes;
export type Equipment = {
  id: number;
  siteId: string;
  type: EquipmentType;
  level: number;
  durability: number;
};
export type SiteState = {
  level: number;
  extracted: number;
  productProgress?: Partial<Record<Resource, number>>;
  queue: { output: Resource; remaining: number }[];
};
export type Recipe = {
  output: Resource;
  inputs: Partial<Record<Resource, number>>;
};
export type SiteDefinition = {
  id: string;
  name: string;
  category: Category;
  job: Resource;
  icon: string;
  finite: boolean;
  equipment: EquipmentType[];
  recipes: Recipe[];
};
const product = (name: string): Resource => {
  const found = resources.find((r) => resourceNames[r] === name);
  if (found) return found;
  const id = resources.length + 1;
  const r: Resource = `product${id}`;
  resources.push(r);
  resourceNames[r] = name;
  resourceLevel[r] = id;
  levelInfo[id] = {
    title: name,
    subtitle: "",
    unlock: 0,
    price: 5,
    job: r,
    icon: "◈",
    color: "steel",
    description: "",
  };
  return r;
};
const milk = product("Süt"),
  cream = product("Kaymak"),
  butter = product("Tereyağı"),
  cheese = product("Peynir"),
  wool = product("Yün"),
  sheepMilk = product("Koyun sütü"),
  sheepCheese = product("Koyun peyniri");
const miningEquipment: EquipmentType[] = ["pick", "gloves", "cart", "helmet"];
export const siteDefinitions: SiteDefinition[] = [
  {
    id: "lumber",
    name: "Oduncu",
    category: "forest",
    job: "wood",
    icon: "🪵",
    finite: true,
    equipment: ["axe", "gloves"],
    recipes: [],
  },
  {
    id: "hunter",
    name: "Avcı",
    category: "forest",
    job: product("Et"),
    icon: "🏹",
    finite: false,
    equipment: ["bow", "gloves"],
    recipes: [],
  },
  {
    id: "field",
    name: "Tarla",
    category: "farm",
    job: product("Buğday"),
    icon: "🌾",
    finite: false,
    equipment: ["hoe", "gloves"],
    recipes: [],
  },
  {
    id: "orchard",
    name: "Bahçe",
    category: "farm",
    job: "fruit",
    icon: "🍎",
    finite: false,
    equipment: ["basket", "gloves"],
    recipes: [],
  },
  {
    id: "barn",
    name: "İnek Ahırı",
    category: "livestock",
    job: milk,
    icon: "🐄",
    finite: false,
    equipment: ["bucket", "gloves"],
    recipes: [
      { output: milk, inputs: {} },
      { output: cream, inputs: { [milk]: 2 } },
      { output: butter, inputs: { [milk]: 3 } },
      { output: cheese, inputs: { [milk]: 2, [butter]: 1 } },
    ],
  },
  {
    id: "coop",
    name: "Kümes",
    category: "livestock",
    job: "egg",
    icon: "🥚",
    finite: false,
    equipment: ["basket"],
    recipes: [],
  },
  {
    id: "sheep",
    name: "Koyun Ağılı",
    category: "livestock",
    job: wool,
    icon: "🐑",
    finite: false,
    equipment: ["bucket", "shears", "gloves"],
    recipes: [
      { output: wool, inputs: {} },
      { output: sheepMilk, inputs: {} },
      { output: sheepCheese, inputs: { [sheepMilk]: 2 } },
    ],
  },
  ...["Kömür", "Bakır", "Kil", "Kum", "Altın", "Gümüş", "Taş", "Demir"].map(
    (name, index): SiteDefinition => ({
      id: `mine-${index}`,
      name: `${name} Madeni`,
      category: "mine",
      job: product(name),
      icon: "⛏️",
      finite: true,
      equipment: miningEquipment,
      recipes: [],
    }),
  ),
];
export const siteProducts = (site: SiteDefinition): Resource[] =>
  site.recipes.length ? site.recipes.map((r) => r.output) : [site.job];
export function ownedSite(
  state: GameState,
  resource: Resource,
): SiteDefinition | undefined {
  return siteDefinitions.find(
    (s) => !!state.sites[s.id] && siteProducts(s).includes(resource),
  );
}
export const sitePurchaseCost = (state: GameState): number =>
  100 * 2 ** Object.keys(state.sites).length;
export const workerCapacity = (site: SiteState): number => site.level * 3;
export const productionCapacity = (site: SiteState): number => site.level * 100;
export const siteUpgradeCost = (site: SiteState): number =>
  50 * 2 ** (site.level - 1);
export function purchaseSite(state: GameState, id: string): GameState {
  if (
    !siteDefinitions.some((s) => s.id === id) ||
    state.sites[id] ||
    state.money < sitePurchaseCost(state)
  )
    return state;
  return addLedger(
    {
      ...state,
      money: state.money - sitePurchaseCost(state),
      sites: { ...state.sites, [id]: { level: 1, extracted: 0, queue: [] } },
    },
    `${siteDefinitions.find((s) => s.id === id)!.name} satın alındı.`,
  );
}
export function upgradeSite(state: GameState, id: string): GameState {
  const site = state.sites[id];
  if (!site || site.level >= 20 || state.money < siteUpgradeCost(site))
    return state;
  return addLedger(
    {
      ...state,
      money: state.money - siteUpgradeCost(site),
      sites: {
        ...state.sites,
        [id]: { ...site, level: site.level + 1, extracted: 0 },
      },
    },
    "Saha geliştirildi; üretim rezervi yenilendi.",
  );
}
export function buyEquipment(
  state: GameState,
  id: string,
  type: EquipmentType,
): GameState {
  const definition = siteDefinitions.find((s) => s.id === id);
  if (
    !state.sites[id] ||
    !definition?.equipment.includes(type) ||
    !equipmentTypes[type] ||
    state.money < equipmentTypes[type].price
  )
    return state;
  return {
    ...state,
    money: state.money - equipmentTypes[type].price,
    equipmentSequence: state.equipmentSequence + 1,
    equipment: [
      ...state.equipment,
      {
        id: state.equipmentSequence + 1,
        siteId: id,
        type,
        level: 1,
        durability: 100,
      },
    ],
  };
}
export const equipmentUpgradeCost = (item: Equipment): number =>
  equipmentTypes[item.type].price * item.level;
export function groupEquipment(items: Equipment[]): Equipment[][] {
  const groups = new Map<string, Equipment[]>();
  for (const item of items) {
    const key = `${item.siteId}-${item.type}-${item.level}-${Math.ceil(item.durability)}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) => a[0].level - b[0].level || a[0].durability - b[0].durability,
  );
}
export function upgradeEquipmentGroup(
  state: GameState,
  ids: number[],
): GameState {
  return [...new Set(ids)].reduce(
    (next, id) => upgradeEquipment(next, id),
    state,
  );
}
export function upgradeEquipment(state: GameState, id: number): GameState {
  const item = state.equipment.find((e) => e.id === id);
  if (
    !item ||
    item.durability <= 0 ||
    item.level >= 10 ||
    state.money < equipmentUpgradeCost(item)
  )
    return state;
  return {
    ...state,
    money: state.money - equipmentUpgradeCost(item),
    equipment: state.equipment.map((e) =>
      e.id === id ? { ...e, level: e.level + 1, durability: 100 } : e,
    ),
  };
}
export const equippedCapacity = (
  state: GameState,
  site: SiteDefinition,
): number =>
  Math.min(
    ...site.equipment.map(
      (type) =>
        state.equipment.filter(
          (e) => e.siteId === site.id && e.type === type && e.durability > 0,
        ).length,
    ),
  );
export function canAssign(state: GameState, job: Resource): boolean {
  const site = ownedSite(state, job);
  if (!site || job !== site.job) return false;
  const count = state.workers.filter((w) => w.job === job).length;
  return count < workerCapacity(state.sites[site.id]);
}
export function managerRequests(
  state: GameState,
  category: Category,
): { site: SiteDefinition; type: EquipmentType; count: number }[] {
  return siteDefinitions
    .filter((s) => s.category === category && state.sites[s.id])
    .flatMap((site) => {
      const demand = Math.max(
        1,
        state.workers.filter((w) => w.job === site.job).length,
      );
      return site.equipment
        .map((type) => ({
          site,
          type,
          count: Math.max(
            0,
            demand -
              state.equipment.filter(
                (e) =>
                  e.siteId === site.id && e.type === type && e.durability > 0,
              ).length,
          ),
        }))
        .filter((r) => r.count > 0);
    });
}
export const isAutomatic = (recipe: Recipe): boolean =>
  Object.keys(recipe.inputs).length === 0;
export const productionRemaining = (
  site: SiteState,
  output: Resource,
): number =>
  site.queue
    .filter((q) => q.output === output)
    .reduce((n, q) => n + q.remaining, 0);
export function productionShortages(
  state: GameState,
  recipe: Recipe,
  quantity: number,
) {
  return Object.entries(recipe.inputs)
    .map(([resource, amount]) => ({
      resource: resource as Resource,
      missing: Math.max(
        0,
        amount! * quantity - state.stock[resource as Resource],
      ),
    }))
    .filter((item) => item.missing > 0);
}
export function adjustProduction(
  state: GameState,
  id: string,
  output: Resource,
  delta: number,
): GameState {
  const site = state.sites[id];
  const recipe = siteDefinitions
    .find((s) => s.id === id)
    ?.recipes.find((r) => r.output === output);
  if (!site || !recipe || isAutomatic(recipe) || !Number.isSafeInteger(delta))
    return state;
  const remaining = productionRemaining(site, output) + delta;
  if (
    remaining < 0 ||
    site.queue.reduce((n, q) => n + q.remaining, 0) + delta >
      productionCapacity(site)
  )
    return state;
  const queue = site.queue.filter((q) => q.output !== output);
  if (remaining) queue.push({ output, remaining });
  return {
    ...state,
    sites: {
      ...state.sites,
      [id]: {
        ...site,
        queue,
        productProgress: {
          ...site.productProgress,
          [output]: remaining ? (site.productProgress?.[output] ?? 0) : 0,
        },
      },
    },
  };
}
export function requestProduction(
  state: GameState,
  id: string,
  output: Resource,
  quantity = 1,
): GameState {
  return quantity > 0 ? adjustProduction(state, id, output, quantity) : state;
}
export function cancelProduction(
  state: GameState,
  id: string,
  index: number,
): GameState {
  const task = state.sites[id]?.queue[index];
  return task
    ? adjustProduction(state, id, task.output, -task.remaining)
    : state;
}
export function productionStatus(
  state: GameState,
  site: SiteDefinition,
): string {
  const owned = state.sites[site.id];
  if (!owned) return "Satın alınmadı";
  if (state.paused) return "Duraklatıldı";
  if (!isWorkingHours(state)) return "Mesai dışında";
  if (site.finite && owned.extracted >= productionCapacity(owned))
    return "Rezerv tükendi · sahayı yükselt";
  if (!equippedCapacity(state, site)) return "Ekipman gerekli";
  if (
    !state.workers.some(
      (w) => w.job === site.job && !w.strikeRemaining && isHoused(state, w.id),
    )
  )
    return "Çalışabilir işçi gerekli";
  if (site.recipes.length) {
    const statuses = site.recipes.map((recipe) =>
      productProductionStatus(state, site, recipe, true),
    );
    return statuses.includes("Üretimde")
      ? "Üretimde"
      : (statuses.find((status) => status !== "Üretim miktarı seç") ??
          "Üretim miktarı seç");
  }
  return state.stock[site.job] >= state.warehouseCapacity[site.job]
    ? "Depo dolu"
    : "Üretimde";
}
export function productProductionStatus(
  state: GameState,
  definition: SiteDefinition,
  recipe: Recipe,
  skipSiteCheck = false,
): string {
  const site = state.sites[definition.id];
  if (!site) return "Satın alınmadı";
  if (!isAutomatic(recipe) && productionRemaining(site, recipe.output) <= 0)
    return "Üretim miktarı seç";
  if (!skipSiteCheck) {
    if (state.paused) return "Duraklatıldı";
    if (!isWorkingHours(state)) return "Mesai dışında";
    if (!equippedCapacity(state, definition)) return "Ekipman gerekli";
    if (
      !state.workers.some(
        (w) =>
          w.job === definition.job &&
          !w.strikeRemaining &&
          isHoused(state, w.id),
      )
    )
      return "Çalışabilir işçi gerekli";
  }
  if (state.stock[recipe.output] >= state.warehouseCapacity[recipe.output])
    return "Depo dolu";
  if (productionShortages(state, recipe, 1).length) return "Hammadde bekliyor";
  return "Üretimde";
}

function produce(state: GameState): GameState {
  if (!isWorkingHours(state)) return state;
  const next: GameState = {
    ...state,
    stock: { ...state.stock },
    workers: state.workers.map((w) => ({ ...w })),
    equipment: state.equipment.map((e) => ({ ...e })),
    sites: Object.fromEntries(
      Object.entries(state.sites).map(([id, s]) => [
        id,
        {
          ...s,
          queue: s.queue.map((q) => ({ ...q })),
          productProgress: { ...s.productProgress },
        },
      ]),
    ),
  };
  for (const definition of siteDefinitions) {
    const site = next.sites[definition.id];
    if (!site) continue;
    const used = new Set<number>();
    const crew = next.workers
      .filter(
        (w) =>
          w.job === definition.job &&
          !w.strikeRemaining &&
          isHoused(next, w.id),
      )
      .slice(0, workerCapacity(site));
    for (const worker of crew) {
      if (productionStatus(next, definition) !== "Üretimde") break;
      const kit = definition.equipment.map((type) =>
        next.equipment.find(
          (e) =>
            e.siteId === definition.id &&
            e.type === type &&
            e.durability > 0 &&
            !used.has(e.id),
        ),
      );
      if (kit.some((e) => !e)) break;
      kit.forEach((e) => used.add(e!.id));
      const speed = 20 + (Math.min(...kit.map((e) => e!.level)) - 1) * 5;
      if (definition.recipes.length) {
        for (const recipe of definition.recipes) {
          if (kit.some((e) => e!.durability <= 0)) break;
          if (productProductionStatus(next, definition, recipe) !== "Üretimde")
            continue;
          const progress = (site.productProgress![recipe.output] ?? 0) + speed;
          site.productProgress![recipe.output] = Math.min(100, progress);
          if (progress < 100) continue;
          for (const [resource, amount] of Object.entries(recipe.inputs))
            next.stock[resource as Resource] -= amount!;
          next.stock[recipe.output]++;
          site.productProgress![recipe.output] = 0;
          if (!isAutomatic(recipe)) {
            const task = site.queue.find((q) => q.output === recipe.output)!;
            task.remaining--;
            site.queue = site.queue.filter((q) => q.remaining > 0);
          }
          kit.forEach((e) => {
            e!.durability = Math.max(0, e!.durability - 1 / e!.level);
          });
        }
        continue;
      }
      worker.progress += speed;
      if (worker.progress < 100) continue;
      next.stock[definition.job]++;
      if (definition.finite) site.extracted++;
      kit.forEach((e) => {
        e!.durability = Math.max(0, e!.durability - 1 / e!.level);
      });
      worker.progress = 0;
    }
  }
  next.equipment = next.equipment.filter((e) => e.durability > 0);
  return next;
}
function migrateSites(state: GameState, saved: Partial<GameState>): GameState {
  const sites: Record<string, SiteState> = {};
  const legacy = !saved.version || saved.version < 12;
  for (const definition of siteDefinitions) {
    const s = saved.sites?.[definition.id];
    if (s && Number.isInteger(s.level) && s.level >= 1 && s.level <= 20)
      sites[definition.id] = {
        level: s.level,
        extracted: Number.isFinite(s.extracted) ? Math.max(0, s.extracted) : 0,
        productProgress: s.productProgress
          ? Object.fromEntries(
              definition.recipes
                .filter((r) => s.productProgress?.[r.output] !== undefined)
                .map((r) => [
                  r.output,
                  Number.isFinite(s.productProgress?.[r.output])
                    ? Math.max(0, Math.min(99, s.productProgress![r.output]!))
                    : 0,
                ]),
            )
          : undefined,
        queue: Array.isArray(s.queue)
          ? s.queue
              .filter(
                (q) =>
                  definition.recipes.some(
                    (r) => r.output === q.output && !isAutomatic(r),
                  ) &&
                  Number.isSafeInteger(q.remaining) &&
                  q.remaining > 0,
              )
              .slice(0, 2000)
          : [],
      };
    else if (legacy && resourceLevel[definition.job] <= state.level)
      sites[definition.id] = { level: 1, extracted: 0, queue: [] };
  }
  let next = {
    ...state,
    sites,
    equipment: [] as Equipment[],
    equipmentSequence: 0,
  };
  if (legacy) {
    for (const definition of siteDefinitions.filter((s) => sites[s.id])) {
      const count = Math.max(
        1,
        state.workers.filter((w) => w.job === definition.job).length,
      );
      for (let i = 0; i < count; i++)
        for (const type of definition.equipment)
          next.equipment.push({
            id: ++next.equipmentSequence,
            siteId: definition.id,
            type,
            level: 1,
            durability: 100,
          });
    }
  } else if (Array.isArray(saved.equipment)) {
    next.equipment = saved.equipment
      .filter(
        (e) =>
          sites[e.siteId] &&
          siteDefinitions
            .find((s) => s.id === e.siteId)
            ?.equipment.includes(e.type) &&
          Number.isSafeInteger(e.id) &&
          e.id > 0 &&
          Number.isInteger(e.level) &&
          e.level >= 1 &&
          e.level <= 10 &&
          Number.isFinite(e.durability) &&
          e.durability > 0 &&
          e.durability <= 100,
      )
      .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
    next.equipmentSequence = Math.max(0, ...next.equipment.map((e) => e.id));
  }
  next = {
    ...next,
    workers: next.workers.map((w) =>
      siteDefinitions.some((s) => sites[s.id] && s.job === w.job) ||
      w.job === "idle"
        ? w
        : { ...w, job: "idle", progress: 0 },
    ),
  };
  return next;
}
