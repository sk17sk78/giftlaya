import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET() {
  const baseUrl = getSiteUrl();
  const body = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /cms",
    "Disallow: /api/",
    "Disallow: /dashboard",
    "Disallow: /cart",
    "Disallow: /order-confirmation",
    "Disallow: /search",
    "",
    `Host: ${baseUrl}`,
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
