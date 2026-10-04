import { getDb } from "./db";
import { changeStatus, getOrderByCode, placeOrder, type OrderStatus } from "./orders";
import { createProduct, listProducts, type ProductInput } from "./products";

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const peso = (n: number) => n * 100;

type SeedProduct = Omit<ProductInput, "active" | "price" | "compareAt" | "images" | "variants"> & {
  price: number; compareAt?: number; photos: string[]; variants: [name: string, stock: number, sku: string][];
};

const PRODUCTS: SeedProduct[] = [
  {
    slug: "classic-cinnamon-rolls", name: "Classic Cinnamon Rolls", category: "Rolls & Donuts", featured: true,
    price: 480, compareAt: 550,
    description: "A box of 4 soft, pull-apart rolls. The dough proofs overnight, then gets rolled with brown sugar, butter and Ceylon cinnamon. This is the recipe we started with.",
    howToUse: "Warm for 15 seconds in the microwave, or 5 minutes in a 160°C oven. Keeps 3 days at room temperature, or a month in the freezer.",
    photos: ["1509365465985-25d11c17e812", "1483695028939-5bb13f8648b0"],
    variants: [["Classic glaze", 24, "JC-ROL-CIN-GLZ"], ["Cream cheese frosting", 10, "JC-ROL-CIN-CCF"]],
  },
  {
    slug: "sprinkle-donuts", name: "Sprinkle Donuts", category: "Rolls & Donuts", featured: false,
    price: 390, compareAt: 450,
    description: "Half a dozen yeast-raised donuts, fried in small batches and dipped by hand. Light and fluffy inside, with a glaze that sets to a thin crackle.",
    howToUse: "Best eaten the day they arrive. If you're keeping them for tomorrow, leave them in the box at room temperature and skip the ref, which dries them out.",
    photos: ["1551024601-bec78aea704b", "1527515545081-5db817172677"],
    variants: [["Chocolate glaze", 30, "JC-ROL-DON-CHO"], ["Strawberry glaze", 15, "JC-ROL-DON-STR"]],
  },
  {
    slug: "butter-croissants", name: "Butter Croissants", category: "Rolls & Donuts", featured: false,
    price: 420, compareAt: 480,
    description: "A box of 4 croissants made with a three-day laminated dough and 82% butterfat butter. Crisp, flaky layers outside and a honeycomb crumb inside.",
    howToUse: "Reheat for 4 minutes in a 170°C oven or toaster oven to bring back the crunch. Don't microwave them; they go soft.",
    photos: ["1555507036-ab1f4038808a", "1568254183919-78a4f43a2877"],
    variants: [["Butter", 16, "JC-ROL-CRO-BUT"], ["Almond", 9, "JC-ROL-CRO-ALM"], ["Chocolate", 11, "JC-ROL-CRO-CHO"]],
  },
  {
    slug: "hokkaido-milk-loaf", name: "Hokkaido Milk Loaf", category: "Rolls & Donuts", featured: false,
    price: 190,
    description: "A soft, tall loaf made with fresh milk and a cooked-flour starter that keeps it tender for days. Slightly sweet, and good for toast or sandwiches.",
    howToUse: "Slice thick and toast, or use it for French toast on day 3. Keeps 4 days in its bag at room temperature.",
    photos: ["1620921568790-c1cf8984624c", "1608198093002-ad4e005484ec"],
    variants: [["Plain", 28, "JC-ROL-LOF-PLN"], ["Cheese", 13, "JC-ROL-LOF-CHS"]],
  },
  {
    slug: "chocolate-chunk-cookies", name: "Chocolate Chunk Cookies", category: "Cookies", featured: true,
    price: 320,
    description: "A box of 6 thick cookies with crisp edges and a soft middle. We chop the chocolate by hand, so every cookie has both big pools and small shards.",
    howToUse: "Warm for 10 seconds in the microwave to melt the chocolate again. Keeps 2 weeks in a sealed container.",
    photos: ["1499636136210-6f4ee915583e", "1558961363-fa8fdf82db35"],
    variants: [["Dark chocolate", 20, "JC-COO-CHK-DRK"], ["Milk chocolate", 14, "JC-COO-CHK-MLK"], ["Walnut", 3, "JC-COO-CHK-WAL"]],
  },
  {
    slug: "butter-cookie-tin", name: "Butter Cookie Tin", category: "Cookies", featured: false,
    price: 360,
    description: "A tin of 24 small, crisp butter cookies. They are made with browned butter, which gives them a toasted, nutty flavour.",
    howToUse: "Good with coffee or tea. The tin keeps them crisp for 3 weeks; close the lid properly after opening.",
    photos: ["1464195244916-405fa0a82545", "1558961363-fa8fdf82db35"],
    variants: [["Classic", 22, "JC-COO-TIN-CLA"], ["Sea salt", 8, "JC-COO-TIN-SAL"]],
  },
  {
    slug: "fudge-brownie-bars", name: "Fudge Brownie Bars", category: "Cookies", featured: false,
    price: 280,
    description: "A box of 4 dense, fudgy brownie bars with a thin, shiny crust. Made with 70% dark chocolate and very little flour.",
    howToUse: "Eat at room temperature for a fudgy bite, or chill for a firmer, truffle-like one. Keeps 1 week sealed.",
    photos: ["1590080875515-8a3a8dc5735e", "1599599810769-bcde5a160d32"],
    variants: [["Original", 25, "JC-COO-BRO-ORG"], ["Sprinkles", 12, "JC-COO-BRO-SPR"]],
  },
  {
    slug: "iced-sugar-cookies", name: "Iced Sugar Cookies", category: "Cookies", featured: false,
    price: 210,
    description: "A box of 6 soft sugar cookies, each iced and decorated by hand. A good small gift, or something for the kids' baon.",
    howToUse: "Keep in the box away from heat so the icing doesn't smudge. Best within 10 days.",
    photos: ["1495147466023-ac5c588e2e94", "1599599810769-bcde5a160d32"],
    variants: [["Vanilla", 35, "JC-COO-SUG-VAN"], ["Calamansi", 5, "JC-COO-SUG-CAL"]],
  },
  {
    slug: "blueberry-cheesecake", name: "Blueberry Cheesecake", category: "Cakes", featured: true,
    price: 650,
    description: "A 6-inch baked cheesecake on a graham crust, topped with a fruit compote we cook down ourselves. Serves 6 to 8.",
    howToUse: "Keep chilled and serve cold. Slice with a knife dipped in hot water for clean edges. Keeps 4 days in the ref.",
    photos: ["1533134242443-d4fd215305ad", "1571115177098-24ec42ed204d"],
    variants: [["Blueberry", 12, "JC-CAK-CHS-BLU"], ["Strawberry", 0, "JC-CAK-CHS-STR"]],
  },
  {
    slug: "chocolate-berry-cake", name: "Chocolate Berry Cake", category: "Cakes", featured: true,
    price: 520,
    description: "A 6-inch, three-layer chocolate cake filled with whipped ganache and topped with fresh berries. Serves 6 to 8.",
    howToUse: "Take it out of the ref 20 minutes before serving so the ganache softens. Keeps 3 days chilled.",
    photos: ["1606890737304-57a1ca8a5b62", "1578985545062-69928b1d9587"],
    variants: [["Dark chocolate", 18, "JC-CAK-BER-DRK"], ["Mocha", 4, "JC-CAK-BER-MOC"]],
  },
  {
    slug: "red-velvet-cupcakes", name: "Red Velvet Cupcakes", category: "Cakes", featured: false,
    price: 240, compareAt: 290,
    description: "A box of 4 red velvet cupcakes with a light cocoa flavour and a tall swirl of frosting.",
    howToUse: "Keep chilled, and let them sit out for 15 minutes before eating. Best within 4 days.",
    photos: ["1614707267537-b85aaf00c4b7", "1519869325930-281384150729"],
    variants: [["Cream cheese frosting", 40, "JC-CAK-RED-CCF"], ["Vanilla buttercream", 18, "JC-CAK-RED-VAN"]],
  },
  {
    slug: "chocolate-cupcakes", name: "Chocolate Cupcakes", category: "Cakes", featured: false,
    price: 450,
    description: "A box of 6 moist chocolate cupcakes topped with piped buttercream and chocolate chips.",
    howToUse: "Keep chilled, and let them sit out for 15 minutes before eating. Best within 4 days.",
    photos: ["1550617931-e17a7b70dce2", "1587668178277-295251f900ce"],
    variants: [["Chocolate buttercream", 15, "JC-CAK-CUP-CHO"], ["Mocha", 6, "JC-CAK-CUP-MOC"]],
  },
];

type SeedOrder = {
  daysAgo: number; name: string; mobile: string; province: string; city: string; address: string;
  notes?: string; gcashRef?: string; status: OrderStatus; items: [slug: string, variant: string, qty: number][];
};

const ORDERS: SeedOrder[] = [
  { daysAgo: 59, name: "Maria Santos", mobile: "09171230001", province: "Cebu", city: "Cebu City", address: "45 Gorordo Ave, Lahug", status: "delivered", items: [["classic-cinnamon-rolls", "Classic glaze", 2], ["red-velvet-cupcakes", "Cream cheese frosting", 1]] },
  { daysAgo: 53, name: "Jose Ramirez", mobile: "09181230002", province: "Cebu", city: "Cebu City", address: "Unit 3B, 12 Escario St, Kamputhaw", gcashRef: "4012887766541", status: "delivered", items: [["chocolate-chunk-cookies", "Dark chocolate", 2], ["chocolate-cupcakes", "Chocolate buttercream", 1]] },
  { daysAgo: 47, name: "Liza Bautista", mobile: "09191230003", province: "Cebu", city: "Mandaue City", address: "8 A. Del Rosario St, Guizo", status: "delivered", items: [["chocolate-berry-cake", "Dark chocolate", 1]] },
  { daysAgo: 41, name: "Paolo Mendoza", mobile: "09271230004", province: "Cebu", city: "Talisay City", address: "Blk 4 Lot 9, Bulacao Heights", notes: "Leave with the guard if no one answers.", gcashRef: "5013996654120", status: "delivered", items: [["sprinkle-donuts", "Strawberry glaze", 2], ["iced-sugar-cookies", "Vanilla", 2], ["butter-croissants", "Butter", 1]] },
  { daysAgo: 34, name: "Carmela Dizon", mobile: "09061230005", province: "Cebu", city: "Lapu-Lapu City", address: "27 M.L. Quezon National Hwy, Pusok", status: "cancelled", items: [["blueberry-cheesecake", "Blueberry", 1]] },
  { daysAgo: 28, name: "Ramon Villanueva", mobile: "09151230006", province: "Cebu", city: "Cebu City", address: "1803 Tower B, Cebu IT Park, Apas", gcashRef: "6014115543209", status: "shipped", items: [["chocolate-cupcakes", "Mocha", 1], ["fudge-brownie-bars", "Original", 2]] },
  { daysAgo: 23, name: "Grace Lim", mobile: "09171230007", province: "Cebu", city: "Mandaue City", address: "16 Hernan Cortes St, Banilad", status: "shipped", items: [["butter-croissants", "Almond", 2], ["butter-cookie-tin", "Classic", 1]] },
  { daysAgo: 19, name: "Antonio Cruz", mobile: "09281230008", province: "Cebu", city: "Consolacion", address: "5 Purok 2, Cansaga", status: "cancelled", items: [["red-velvet-cupcakes", "Vanilla buttercream", 2]] },
  { daysAgo: 15, name: "Bea Fernandez", mobile: "09391230009", province: "Cebu", city: "Minglanilla", address: "214 Purok 3, Tunghaan", gcashRef: "7015224432108", status: "shipped", items: [["classic-cinnamon-rolls", "Cream cheese frosting", 1], ["hokkaido-milk-loaf", "Plain", 2]] },
  { daysAgo: 12, name: "Miguel Torres", mobile: "09171230010", province: "Cebu", city: "Liloan", address: "Km 18, Yati", status: "confirmed", items: [["chocolate-chunk-cookies", "Milk chocolate", 3]] },
  { daysAgo: 8, name: "Katrina Reyes", mobile: "09181230011", province: "Cebu", city: "Cebu City", address: "Unit 12F, 7 Salinas Dr, Lahug", gcashRef: "8016333321007", status: "confirmed", items: [["chocolate-berry-cake", "Dark chocolate", 2], ["classic-cinnamon-rolls", "Classic glaze", 2]] },
  { daysAgo: 5, name: "Noel Aquino", mobile: "09061230012", province: "Cebu", city: "Danao City", address: "19 Rizal St, Poblacion", status: "confirmed", items: [["iced-sugar-cookies", "Calamansi", 1], ["fudge-brownie-bars", "Sprinkles", 1]] },
  { daysAgo: 3, name: "Isabel Garcia", mobile: "09191230013", province: "Cebu", city: "Cebu City", address: "730 Sikatuna St, Parian", gcashRef: "9017442210906", status: "new", items: [["butter-croissants", "Chocolate", 1], ["chocolate-cupcakes", "Chocolate buttercream", 1]] },
  { daysAgo: 2, name: "Dennis Uy", mobile: "09271230014", province: "Cebu", city: "Lapu-Lapu City", address: "33 Basak-Marigondon Rd", status: "new", items: [["sprinkle-donuts", "Chocolate glaze", 1]] },
  { daysAgo: 1, name: "Trisha Navarro", mobile: "09151230015", province: "Cebu", city: "Talisay City", address: "Blk 12 Lot 3, Lawaan 2", notes: "Call before delivery, please.", status: "new", items: [["butter-cookie-tin", "Sea salt", 1], ["hokkaido-milk-loaf", "Cheese", 1], ["red-velvet-cupcakes", "Cream cheese frosting", 2]] },
];

const PATH: OrderStatus[] = ["confirmed", "shipped", "delivered"];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Wipes every table, then fills the shop with demo products and historical orders. */
export function seed(now: Date = new Date()): void {
  const db = getDb();
  db.exec("DELETE FROM order_items; DELETE FROM orders; DELETE FROM variants; DELETE FROM products; DELETE FROM settings;");

  for (const p of PRODUCTS) {
    const r = createProduct({
      slug: p.slug, name: p.name, category: p.category, description: p.description, howToUse: p.howToUse,
      price: peso(p.price), compareAt: p.compareAt ? peso(p.compareAt) : null, images: p.photos.map(img),
      featured: p.featured, active: true,
      variants: p.variants.map(([name, stock, sku]) => ({ name, stock, sku })),
    });
    if (!r.ok) throw new Error(`Seed product ${p.slug}: ${r.error}`);
  }

  const variantId = new Map<string, number>();
  for (const p of listProducts()) for (const v of p.variants) variantId.set(`${p.slug}|${v.name}`, v.id);

  for (const o of ORDERS) {
    const r = placeOrder(
      {
        customerName: o.name, mobile: o.mobile, province: o.province, city: o.city, address: o.address,
        notes: o.notes, paymentMethod: o.gcashRef ? "gcash" : "cod", gcashRef: o.gcashRef,
        lines: o.items.map(([slug, variant, qty]) => ({ variantId: variantId.get(`${slug}|${variant}`) ?? -1, qty })),
      },
      new Date(now.getTime() - o.daysAgo * DAY_MS),
    );
    if (!r.ok) throw new Error(`Seed order for ${o.name}: ${r.error}`);
    const id = getOrderByCode(r.code)!.id;
    const steps = o.status === "cancelled" ? ["cancelled" as const] : PATH.slice(0, PATH.indexOf(o.status) + 1);
    for (const s of steps) {
      const moved = changeStatus(id, s);
      if (!moved.ok) throw new Error(`Seed order ${r.code}: ${moved.error}`);
    }
  }
}
