import React from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/services/api";
import { ChevronRight, CalendarDays, ArrowLeft } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const formatted = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return buildPageMetadata({
    title: `${formatted} | Giftlaya Blog`,
    description: `Read curated articles and guides on ${formatted.toLowerCase()} from Giftlaya.`,
    path: `/blog/category/${slug}`,
  });
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { topics, articles } = await api.getBlogData();
  const topic = topics.find((t) => t.slug === slug);
  const title =
    topic?.title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const filtered = articles.filter(
    (a) =>
      a.categorySlug === slug ||
      a.category.toLowerCase().includes(slug.split("-")[0]) ||
      a.slug.includes(slug.split("-")[0])
  );
  const displayArticles = filtered.length > 0 ? filtered : articles.slice(0, 9);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: title, path: `/blog/category/${slug}` },
  ]);

  return (
    <div className="max-w-[1168px] mx-auto px-4 sm:px-6 py-6 sm:py-10 min-h-[65vh]">
      <JsonLd data={breadcrumbJsonLd} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#856e7b] mb-4">
        <Link href="/" className="hover:text-[#9b1b45]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/blog" className="hover:text-[#9b1b45]">Blog</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#292229] font-medium">{title}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#f0e8ed]">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229]">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[#79717c] mt-1">
            {displayArticles.length} curated guides &amp; celebration ideas
          </p>
        </div>
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9b1b45] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All blog articles
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {displayArticles.map((post) => (
          <article
            key={post.slug}
            className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs hover:shadow-card transition-shadow"
          >
            <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 360px, 50vw"
                className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-[#9b1b45]">
                {post.category}
              </span>
            </Link>
            <div className="flex flex-col gap-2 p-4 flex-1">
              <h2 className="text-[15px] font-bold text-gray-900 line-clamp-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#9b1b45]">
                  {post.title}
                </Link>
              </h2>
              <p className="text-xs text-gray-500 line-clamp-3 flex-1">{post.excerpt}</p>
              <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-gray-100 text-[11px] text-gray-400">
                <span>{post.author}</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {post.publishedAt}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

