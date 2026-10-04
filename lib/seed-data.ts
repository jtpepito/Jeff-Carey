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
    slug: "benguet-arabica", name: "Benguet Arabica", category: "Coffee", featured: true,
    price: 480, compareAt: 550,
    description: "Grown at 1,400 metres in Atok, Benguet, by the Bagayao family. Medium roast, with brown sugar sweetness and a clean citrus finish. This is the coffee we started with and still drink every morning.",
    howToUse: "Use 15g of coffee for every 250ml of water just off the boil. Works well in a pour-over, French press or drip machine. Grind right before brewing if you can.",
    photos: ["1447933601403-0c6688de566e", "1559056199-641a0ac8b55e", "1495474472287-4d71bcdd2085"],
    variants: [["250g", 24, "JC-COF-BEN-250"], ["500g", 10, "JC-COF-BEN-500"]],
  },
  {
    slug: "sagada-dark-roast", name: "Sagada Dark Roast", category: "Coffee", featured: true,
    price: 520,
    description: "A full-bodied dark roast from Sagada, Mountain Province. Dark chocolate and toasted nut, with very little acidity. Holds up to milk and to ice.",
    howToUse: "Brew strong for espresso-style drinks, or 16g per 250ml for a French press. Steep 4 minutes, then press slowly.",
    photos: ["1514432324607-a09d9b4aefdd", "1509042239860-f550ce710b93"],
    variants: [["250g", 18, "JC-COF-SAG-250"], ["500g", 4, "JC-COF-SAG-500"]],
  },
  {
    slug: "mt-apo-natural", name: "Mt. Apo Natural", category: "Coffee", featured: false,
    price: 650,
    description: "Naturally processed arabica from Bansalan, Davao del Sur, dried whole on raised beds for 21 days. Expect ripe berry, a winey sweetness and a long finish. A small lot, so it sells out.",
    howToUse: "Best as a pour-over: 15g of coffee, 240ml of water at 92°C, poured over 3 minutes. Let it cool a little before the first sip to taste the fruit.",
    photos: ["1497935586351-b67a49e012bf", "1461023058943-07fcbe16d735"],
    variants: [["250g", 12, "JC-COF-APO-250"], ["500g", 0, "JC-COF-APO-500"]],
  },
  {
    slug: "batangas-barako", name: "Batangas Barako", category: "Coffee", featured: false,
    price: 390, compareAt: 450,
    description: "Liberica from Lipa, Batangas, roasted dark the way lolo liked it. Bold and smoky with a jackfruit aroma you won't find in any other coffee.",
    howToUse: "Simmer 2 tablespoons in 2 cups of water for 3 minutes, then strain. Or brew it in a drip machine. Sweeten with muscovado.",
    photos: ["1511920170033-f8396924c348", "1442512595331-e89e73853f31"],
    variants: [["250g", 30, "JC-COF-BAR-250"], ["500g", 15, "JC-COF-BAR-500"]],
  },
  {
    slug: "davao-tablea-discs", name: "Davao Tablea Discs", category: "Tablea & Cacao", featured: true,
    price: 320,
    description: "Stone-ground cacao from Calinan, Davao, pressed into 20g discs. Each pouch holds 12 discs, enough for 12 cups of thick tsokolate or one pot of champorado.",
    howToUse: "Melt 1 disc in 200ml of hot water or milk over low heat, whisking until smooth. For champorado, add 4 discs to a cup of cooked glutinous rice.",
    photos: ["1511381939415-e44015466834", "1481391319762-47dff72954d9"],
    variants: [["Pure 100%", 20, "JC-TAB-DSC-PUR"], ["Muscovado-sweetened", 14, "JC-TAB-DSC-MUS"], ["Sili-spiced", 3, "JC-TAB-DSC-SIL"]],
  },
  {
    slug: "drinking-chocolate", name: "Drinking Chocolate", category: "Tablea & Cacao", featured: false,
    price: 420, compareAt: 480,
    description: "Finely ground 70% Davao cacao blended with coconut sugar. Dissolves in a minute and tastes like melted chocolate, not cocoa powder. 250g tin, about 12 cups.",
    howToUse: "Whisk 3 tablespoons into 200ml of hot milk. For iced, dissolve in a splash of hot water first, then pour over ice and cold milk.",
    photos: ["1542843137-8791a6904d14", "1606312619070-d48b4c652a52"],
    variants: [["Classic", 16, "JC-TAB-DRK-CLA"], ["Sea Salt", 9, "JC-TAB-DRK-SAL"], ["Barako Mocha", 11, "JC-TAB-DRK-MOC"]],
  },
  {
    slug: "roasted-cacao-nibs", name: "Roasted Cacao Nibs", category: "Tablea & Cacao", featured: false,
    price: 360,
    description: "Crushed, roasted cacao beans and nothing else. Crunchy, bitter and nutty. 200g resealable pouch.",
    howToUse: "Scatter over oatmeal, yogurt or banana bread. Blend a tablespoon into a smoothie for chocolate flavour without sugar.",
    photos: ["1549007994-cb92caebd54b", "1481391319762-47dff72954d9"],
    variants: [["Plain", 22, "JC-TAB-NIB-PLN"], ["Coco Sugar-glazed", 8, "JC-TAB-NIB-GLZ"]],
  },
  {
    slug: "cacao-husk-tea", name: "Cacao Husk Tea", category: "Tablea & Cacao", featured: false,
    price: 280,
    description: "The papery shells left after we winnow cacao, toasted until fragrant. Brews into a light, chocolate-scented tea with no bitterness and almost no caffeine. 100g, about 40 cups.",
    howToUse: "Steep 1 heaping teaspoon in 250ml of boiling water for 6 minutes. Good hot with honey, or chilled overnight in the ref.",
    photos: ["1544787219-7f47ccb76574", "1564890369478-c89ca6d9cde9"],
    variants: [["Original", 25, "JC-TAB-TEA-ORG"], ["Pandan", 12, "JC-TAB-TEA-PAN"]],
  },
  {
    slug: "wild-forest-honey", name: "Wild Forest Honey", category: "Pantry", featured: true,
    price: 450,
    description: "Raw honey gathered by Tagbanua harvesters in the forests of Palawan. Dark, slightly smoky and less sweet than supermarket honey. Unheated and unfiltered, so it may crystallise.",
    howToUse: "Stir into coffee or cacao tea, drizzle over kesong puti, or take a spoonful straight. If it crystallises, sit the jar in warm water for 10 minutes.",
    photos: ["1558642452-9d2a7deb7f62", "1471943311424-646960669fbc"],
    variants: [["250ml", 15, "JC-PAN-HON-250"], ["500ml", 6, "JC-PAN-HON-500"]],
  },
  {
    slug: "coconut-sugar", name: "Coconut Sugar", category: "Pantry", featured: false,
    price: 240, compareAt: 290,
    description: "Made from coconut sap boiled down in open pans in Quezon province. Tastes of caramel and swaps one-for-one with brown sugar in any recipe.",
    howToUse: "Use in place of brown sugar in coffee, baking and sauces. Store sealed in a dry place; break up any lumps with a fork.",
    photos: ["1610725664285-7c57e6eeac3f", "1599599810769-bcde5a160d32"],
    variants: [["500g", 40, "JC-PAN-COC-500"], ["1kg", 18, "JC-PAN-COC-1KG"]],
  },
  {
    slug: "negros-muscovado", name: "Negros Muscovado", category: "Pantry", featured: false,
    price: 210,
    description: "Unrefined cane sugar from a family mill in Bago, Negros Occidental. Moist and deep brown with a molasses flavour that white sugar can't match.",
    howToUse: "Sweeten barako or tsokolate, or use it in leche flan, kutsinta and barbecue marinades. Keep the bag tightly closed so it stays soft.",
    photos: ["1599599810769-bcde5a160d32", "1509440159596-0249088772ff"],
    variants: [["500g", 35, "JC-PAN-MUS-500"], ["1kg", 5, "JC-PAN-MUS-1KG"]],
  },
  {
    slug: "spiced-coconut-vinegar", name: "Spiced Coconut Vinegar", category: "Pantry", featured: false,
    price: 190,
    description: "Coconut sap vinegar aged 8 months, then bottled with siling labuyo, garlic and ginger. Sharp, a little sweet and properly spicy.",
    howToUse: "Use as sawsawan for grilled pork, lumpia and chicharon, or splash into paksiw and kinilaw. Shake before pouring.",
    photos: ["1474979266404-7eaacbcd87c5", "1504674900247-0877df9cc836"],
    variants: [["375ml", 28, "JC-PAN-VIN-375"], ["750ml", 13, "JC-PAN-VIN-750"]],
  },
];

type SeedOrder = {
  daysAgo: number; name: string; mobile: string; province: string; city: string; address: string;
  notes?: string; gcashRef?: string; status: OrderStatus; items: [slug: string, variant: string, qty: number][];
};

const ORDERS: SeedOrder[] = [
  { daysAgo: 59, name: "Maria Santos", mobile: "09171230001", province: "Metro Manila", city: "Quezon City", address: "45 Scout Tobias St, Brgy. Laging Handa", status: "delivered", items: [["benguet-arabica", "250g", 2], ["coconut-sugar", "500g", 1]] },
  { daysAgo: 53, name: "Jose Ramirez", mobile: "09181230002", province: "Cebu", city: "Cebu City", address: "Unit 3B, 12 Gorordo Ave, Lahug", gcashRef: "4012887766541", status: "delivered", items: [["davao-tablea-discs", "Pure 100%", 2], ["wild-forest-honey", "250ml", 1]] },
  { daysAgo: 47, name: "Liza Bautista", mobile: "09191230003", province: "Benguet", city: "Baguio City", address: "8 Leonard Wood Rd", status: "delivered", items: [["sagada-dark-roast", "250g", 1]] },
  { daysAgo: 41, name: "Paolo Mendoza", mobile: "09271230004", province: "Laguna", city: "Santa Rosa City", address: "Blk 4 Lot 9, Laguna Bel-Air", notes: "Leave with the guard if no one answers.", gcashRef: "5013996654120", status: "delivered", items: [["batangas-barako", "500g", 2], ["negros-muscovado", "500g", 2], ["drinking-chocolate", "Classic", 1]] },
  { daysAgo: 34, name: "Carmela Dizon", mobile: "09061230005", province: "Davao del Sur", city: "Davao City", address: "27 Juna Ave, Matina", status: "cancelled", items: [["mt-apo-natural", "250g", 1]] },
  { daysAgo: 28, name: "Ramon Villanueva", mobile: "09151230006", province: "Metro Manila", city: "Makati City", address: "1803 Tower B, 88 Leviste St, Salcedo Village", gcashRef: "6014115543209", status: "shipped", items: [["wild-forest-honey", "500ml", 1], ["cacao-husk-tea", "Original", 2]] },
  { daysAgo: 23, name: "Grace Lim", mobile: "09171230007", province: "Metro Manila", city: "Pasig City", address: "16 Sapphire Rd, Ortigas Center", status: "shipped", items: [["drinking-chocolate", "Sea Salt", 2], ["roasted-cacao-nibs", "Plain", 1]] },
  { daysAgo: 19, name: "Antonio Cruz", mobile: "09281230008", province: "Cebu", city: "Mandaue City", address: "5 A. Del Rosario St, Guizo", status: "cancelled", items: [["coconut-sugar", "1kg", 2]] },
  { daysAgo: 15, name: "Bea Fernandez", mobile: "09391230009", province: "Laguna", city: "Calamba City", address: "214 Purok 3, Brgy. Halang", gcashRef: "7015224432108", status: "shipped", items: [["benguet-arabica", "500g", 1], ["spiced-coconut-vinegar", "375ml", 2]] },
  { daysAgo: 12, name: "Miguel Torres", mobile: "09171230010", province: "Benguet", city: "La Trinidad", address: "Km 5, Pico Rd", status: "confirmed", items: [["davao-tablea-discs", "Muscovado-sweetened", 3]] },
  { daysAgo: 8, name: "Katrina Reyes", mobile: "09181230011", province: "Metro Manila", city: "Taguig City", address: "Unit 12F, 7th Ave cor 26th St, BGC", gcashRef: "8016333321007", status: "confirmed", items: [["sagada-dark-roast", "250g", 2], ["benguet-arabica", "250g", 2]] },
  { daysAgo: 5, name: "Noel Aquino", mobile: "09061230012", province: "Davao del Sur", city: "Davao City", address: "19 Mabini St, Poblacion", status: "confirmed", items: [["negros-muscovado", "1kg", 1], ["cacao-husk-tea", "Pandan", 1]] },
  { daysAgo: 3, name: "Isabel Garcia", mobile: "09191230013", province: "Metro Manila", city: "Manila", address: "730 Remedios St, Malate", gcashRef: "9017442210906", status: "new", items: [["drinking-chocolate", "Barako Mocha", 1], ["wild-forest-honey", "250ml", 1]] },
  { daysAgo: 2, name: "Dennis Uy", mobile: "09271230014", province: "Cebu", city: "Lapu-Lapu City", address: "33 M.L. Quezon National Hwy, Pusok", status: "new", items: [["batangas-barako", "250g", 1]] },
  { daysAgo: 1, name: "Trisha Navarro", mobile: "09151230015", province: "Laguna", city: "Santa Rosa City", address: "Blk 12 Lot 3, Nuvali Blvd", notes: "Call before delivery, please.", status: "new", items: [["roasted-cacao-nibs", "Coco Sugar-glazed", 1], ["spiced-coconut-vinegar", "750ml", 1], ["coconut-sugar", "500g", 2]] },
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
