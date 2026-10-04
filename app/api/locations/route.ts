import { NextResponse, type NextRequest } from "next/server";
import { deliversTo } from "@/lib/delivery";
import { citiesOf } from "@/lib/ph-locations";

/** Cities for one province we deliver to. Keeps the full 1,600-entry list out of the browser bundle. */
export function GET(req: NextRequest) {
  const province = req.nextUrl.searchParams.get("province") ?? "";
  return NextResponse.json({ cities: deliversTo(province) ? citiesOf(province) : [] }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
