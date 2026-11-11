import { NextResponse } from "next/server";
import { buildSitemapIndexXml, getSiteUrl } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  const xml = buildSitemapIndexXml(getSiteUrl());
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
