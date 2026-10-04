import { closeDb } from "../lib/db";
import { listOrders } from "../lib/orders";
import { listProducts } from "../lib/products";
import { seed } from "../lib/seed-data";

seed();
console.log(`Seeded ${listProducts().length} products, ${listOrders().length} orders.`);
closeDb();
