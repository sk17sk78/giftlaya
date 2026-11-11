import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { api } from "@/services/api";
import { ChevronRight, ArrowRight, CalendarDays } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  SITE_NAME,
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildFaqJsonLd,
  buildPageMetadata,
  getBaseUrl,
  toAbsoluteImageUrl,
  toIsoDate,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { articles } = await api.getBlogData();
  const post = articles.find((a) => a.slug === slug);
  if (!post) {
    return buildPageMetadata({
      title: "Article Not Found | Giftlaya",
      description: "The requested blog article could not be found on Giftlaya.",
      index: false,
      follow: false,
    });
  }
  return buildPageMetadata({
    title: `${post.title} | Giftlaya`,
    description: post.excerpt,
    path: `/blog/${slug}`,
    type: "article",
    publishedTime: toIsoDate(post.publishedAt),
    authors: [post.author],
    image: post.image
      ? {
          url: post.image,
          alt: post.title,
        }
      : null,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { articles } = await api.getBlogData();
  const post = articles.find((a) => a.slug === slug);
  if (!post) {
    notFound();
  }
  const popular = articles.filter((a) => a.slug !== post.slug).slice(0, 4);
  const canonicalUrl = buildCanonicalUrl(`/blog/${post.slug}`);

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: toAbsoluteImageUrl(post.image),
    datePublished: toIsoDate(post.publishedAt),
    dateModified: toIsoDate(post.updatedAt || post.publishedAt),
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${getBaseUrl()}/apple-icon.png`,
        width: 180,
        height: 180,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.category, path: `/blog/category/${post.categorySlug}` },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  const faqJsonLd =
    post.faqs && post.faqs.length > 0 ? buildFaqJsonLd(post.faqs) : null;

  return (
    <article className="max-w-[1168px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <JsonLd
        data={[
          blogPostingJsonLd,
          breadcrumbJsonLd,
          ...(faqJsonLd ? [faqJsonLd] : []),
        ]}
      />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#856e7b] mb-4">
        <Link href="/" className="hover:text-[#9b1b45]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/blog" className="hover:text-[#9b1b45]">Blog</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#292229] font-medium truncate">{post.title}</span>
      </nav>

      {/* Header */}
      <header className="max-w-3xl mb-6">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#9b1b45] bg-[#fcf2f6] px-2.5 py-1 rounded-full mb-3">
          {post.category}
        </span>
        <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[#292229] leading-tight">
          {post.title}
        </h1>
        <p className="text-sm text-[#625865] mt-3 leading-relaxed">{post.excerpt}</p>
        <div className="flex items-center gap-3 mt-4 text-xs text-[#79717c]">
          <span className="w-7 h-7 rounded-full bg-[#fce4eb] text-[#9b1b45] font-bold grid place-items-center">
            {post.author[0]}
          </span>
          <strong className="text-[#292229]">{post.author}</strong>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> {post.publishedAt}
          </span>
          <span>· {post.readTime}</span>
        </div>
      </header>

      {/* Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#faf5f8] border border-[#eee5e9]">
            <Image
              src={post.image}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 1024px) 760px, 100vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-6 text-sm sm:text-[15px] text-[#3a323e] leading-relaxed">
            {post.contentHtml && (
              <div
                className="prose prose-sm sm:prose-base max-w-none text-[#3a323e]"
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />
            )}
            {post.sections.map((sec, i) => (
              <section key={i} className="space-y-3">
                <h2 className="text-lg sm:text-xl font-bold text-[#292229]">
                  {sec.heading}
                </h2>
                {sec.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {sec.bullets && (
                  <ul className="list-disc pl-5 space-y-1.5 text-[#4a3f4e]">
                    {sec.bullets.map((b, k) => (
                      <li key={k}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Right Sticky Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-5">
          <div className="p-5 rounded-2xl border border-[#eee5e9] bg-[#fffbfd]">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#fce4eb] text-[#9b1b45] font-bold grid place-items-center">
                {post.author[0]}
              </span>
              <div>
                <p className="text-sm font-bold text-[#292229]">{post.author}</p>
                <p className="text-[11px] text-[#79717c]">Content Writer, Giftlaya</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#eee5e9] bg-white space-y-3.5">
            <h3 className="text-sm font-bold text-[#292229]">Popular Articles</h3>
            <div className="space-y-3">
              {popular.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    <Image src={p.image} alt={p.title} fill sizes="56px" className="object-cover" />
                  </div>
                  <p className="text-xs font-semibold text-[#34212a] group-hover:text-[#9b1b45] line-clamp-2">
                    {p.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Ready to celebrate CTA */}
      <section className="mt-12 rounded-3xl bg-gradient-to-br from-[#7d1538] via-[#9b1b45] to-[#b93260] text-white p-7 sm:p-10 text-center">
        <h2 className="font-heading text-xl sm:text-2xl font-extrabold">
          Ready to celebrate?
        </h2>
        <p className="text-xs sm:text-sm text-white/85 mt-2">
          Transform ideas into real celebrations with same-day delivery &amp; home setup.
        </p>
        <Link
          href="/balloon-decorations"
          className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#9b1b45] text-xs sm:text-sm font-bold hover:bg-[#fcf2f6]"
        >
          Explore decorations <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </article>
  );
}

