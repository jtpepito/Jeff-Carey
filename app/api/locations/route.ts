import { NextResponse, type NextRequest } from "next/server";
import { citiesOf } from "@/lib/ph-locations";

/** Cities for one province. Keeps the full 1,600-entry list out of the browser bundle. */
export function GET(req: NextRequest) {
  const province = req.nextUrl.searchParams.get("province") ?? "";
  return NextResponse.json({ cities: citiesOf(province) }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
