import { replaceStandInPhotos } from "./lib/seed-data";

/** Server-start housekeeping that needs Node (the database). Never lets a failure stop the server. */
export function onServerStart() {
  try {
    const changed = replaceStandInPhotos();
    if (changed) console.log(`[startup] put the shop's own photos on ${changed} ${changed === 1 ? "product" : "products"}`);
  } catch (e) {
    console.error("[startup] photo update skipped:", e);
  }
}
