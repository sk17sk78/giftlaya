import React from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/services/api";
import { ArrowRight, CalendarDays } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildCanonicalUrl,
  buildPageMetadata,
  toAbsoluteImageUrl,
  toIsoDate,
} from "@/lib/seo";

const BLOG_DESCRIPTION =
  "Birthday, wedding and festive decoration ideas, cake designs, gift guides and wishes — practical celebration tips from the Giftlaya team.";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Decoration Ideas, Party Tips & Gifting Blog | Giftlaya",
  description: BLOG_DESCRIPTION,
  path: "/blog",
});

export default async function BlogPage() {
  const { topics, articles } = await api.getBlogData();
  const featured = articles[0];
  const rest = articles.slice(1);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Giftlaya Blog",
    url: buildCanonicalUrl("/blog"),
    description: BLOG_DESCRIPTION,
    blogPost: articles.slice(0, 12).map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: buildCanonicalUrl(`/blog/${a.slug}`),
      image: toAbsoluteImageUrl(a.image),
      datePublished: toIsoDate(a.publishedAt),
      author: {
        "@type": "Person",
        name: a.author,
      },
    })),
  };

  return (
    <div className="bg-white">
      <JsonLd data={blogJsonLd} />
      {/* Top Pink Hero Header */}
      <section className="bg-[radial-gradient(ellipse_at_top,#fff1f5_0%,#ffffff_75%)] border-b border-[#f5e8ee] px-4 py-10 sm:py-14 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b1b45] mb-2">
            THE GIFTLAYA BLOG
          </p>
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[#292229] tracking-tight leading-tight">
            Decoration Ideas, Party Tips &amp; Gifting Guides
          </h1>
          <p className="text-xs sm:text-sm text-[#79717c] mt-3 max-w-xl mx-auto leading-relaxed">
            Birthday, wedding and festive decoration ideas, cake designs, gift guides and wishes — curated celebration tips from the Giftlaya team.
          </p>
        </div>
      </section>

      <div className="max-w-[1168px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        {/* Featured Article */}
        {featured && (
          <section aria-label="Featured">
            <h2 className="text-lg font-bold text-[#292229] mb-4">Featured</h2>
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid grid-cols-1 md:grid-cols-12 rounded-2xl border border-[#eee5e9] bg-white overflow-hidden shadow-2xs hover:shadow-card transition-all"
            >
              <div className="md:col-span-6 relative aspect-[16/10] md:aspect-auto md:min-h-[260px] bg-[#faf5f8] overflow-hidden">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 768px) 580px, 100vw"
                  className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="md:col-span-6 p-5 sm:p-8 flex flex-col justify-center">
                <span className="inline-block w-fit text-[10px] font-bold uppercase tracking-wider text-[#9b1b45] bg-[#fcf2f6] px-2.5 py-1 rounded-full mb-3">
                  {featured.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#292229] group-hover:text-[#9b1b45] transition-colors leading-snug">
                  {featured.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6d6170] mt-2.5 line-clamp-3 leading-relaxed">
                  {featured.excerpt}
                </p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#f5eff3]">
                  <div className="flex items-center gap-2 text-xs text-[#6d6170]">
                    <span className="w-6 h-6 rounded-full bg-[#fce4eb] text-[#9b1b45] font-bold text-[10px] grid place-items-center">
                      {featured.author[0]}
                    </span>
                    <span className="font-semibold">{featured.author}</span>
                    <span>· {featured.publishedAt}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9b1b45]">
                    Read article <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Browse by Topic */}
        <section aria-label="Browse by Topic">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#292229]">Browse by Topic</h2>
            <p className="text-xs text-[#79717c]">Jump straight to what you&apos;re planning</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/blog/category/${topic.slug}`}
                className="group relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 border border-[#eee5e9]"
              >
                <Image
                  src={topic.image}
                  alt={topic.title}
                  fill
                  sizes="(min-width: 1024px) 280px, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3.5 flex flex-col justify-end">
                  <h3 className="text-white text-xs sm:text-sm font-bold leading-snug line-clamp-2">
                    {topic.title}
                  </h3>
                  <span className="text-white/85 text-[10px] font-semibold mt-1 inline-flex items-center gap-1">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest Articles */}
        <section aria-label="Latest Articles">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-[#292229]">Latest Articles</h2>
            <p className="text-xs text-[#79717c]">
              Fresh guides and celebration inspiration from our editorial team
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {rest.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.16)] transition-shadow h-full"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className="block relative aspect-[16/10] bg-gray-100 overflow-hidden"
                >
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(min-width: 1024px) 360px, 50vw"
                    className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-[#9b1b45] shadow-sm">
                    {post.category}
                  </span>
                </Link>

                <div className="flex flex-col gap-2.5 p-4 sm:p-5 flex-1">
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-snug line-clamp-2">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[#9b1b45] transition-colors">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-2 pt-3 mt-auto border-t border-gray-100">
                    <span className="w-7 h-7 rounded-full bg-[#fce4eb] text-[#9b1b45] text-[11px] font-bold flex items-center justify-center shrink-0">
                      {post.author[0]}
                    </span>
                    <span className="text-[12px] font-medium text-gray-600 truncate">
                      {post.author}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
                      <CalendarDays className="w-3 h-3" /> {post.publishedAt}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Bottom Maroon CTA Banner */}
        <section
          aria-label="Planning a celebration?"
          className="rounded-3xl bg-gradient-to-br from-[#7d1538] via-[#9b1b45] to-[#b93260] text-white p-7 sm:p-10 text-center"
        >
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold">
            Planning a celebration?
          </h2>
          <p className="text-xs sm:text-sm text-white/85 mt-2 max-w-lg mx-auto">
            Let Giftlaya bring the decorations, fresh flowers, cakes &amp; gifts to your doorstep.
          </p>
          <Link
            href="/balloon-decorations"
            className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#9b1b45] text-xs sm:text-sm font-bold hover:bg-[#fcf2f6] transition-colors shadow-md"
          >
            Explore decorations <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

