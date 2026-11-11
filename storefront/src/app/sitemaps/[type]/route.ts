import { NextResponse } from "next/server";
import {
  getSubSitemapXml,
  SITEMAP_SECTIONS,
  type SitemapSection,
} from "@/lib/sitemap";

export async function GET(
  _req: Request,
  context: { params: Promise<{ type: string }> }
) {
  const { type } = await context.params;
  if (!SITEMAP_SECTIONS.includes(type as SitemapSection)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const xml = await getSubSitemapXml(type as SitemapSection);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

