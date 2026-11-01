import { addNewSeedProducts, renameRetiredPhotos, replaceStandInPhotos } from "./lib/seed-data";

/** Server-start housekeeping that needs Node (the database). Never lets a failure stop the server. */
export function onServerStart() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET?.trim())
    console.warn("[startup] SESSION_SECRET is not set, so admin cookies are signed with the password alone. Set one with: fly secrets set SESSION_SECRET=<a long random string>");
  try {
    const changed = renameRetiredPhotos() + replaceStandInPhotos();
    if (changed) console.log(`[startup] put the shop's own photos on ${changed} ${changed === 1 ? "product" : "products"}`);
    const added = addNewSeedProducts();
    if (added) console.log(`[startup] added ${added} new ${added === 1 ? "product" : "products"} to the menu`);
  } catch (e) {
    console.error("[startup] menu update skipped:", e);
  }
}
