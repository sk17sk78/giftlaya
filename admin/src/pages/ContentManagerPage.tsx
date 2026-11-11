import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCode2,
  BookOpen,
  Sparkles,
  Network,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Tags,
} from "lucide-react";
import { adminApi, API_BASE_URL } from "@/api/client";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { FormModal } from "@/components/ui/FormModal";
import { useToast } from "@/components/ui/Toast";

export function ContentManagerPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const initialTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/blog/categories")) return "blog_categories";
    if (p.includes("/blog")) return "blog";
    if (p.includes("/recent-work/categories")) return "rw_categories";
    if (p.includes("/recent-work")) return "recent_work";
    if (p.includes("/sitemap")) return "sitemap";
    if (p.includes("/reviews")) return "reviews";
    return "pages";
  }, [location.pathname]);

  type ContentTab = "pages" | "blog" | "blog_categories" | "recent_work" | "rw_categories" | "reviews" | "faqs" | "sitemap";
  const [tab, setTab] = useState<ContentTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [blogCatName, setBlogCatName] = useState("");
  const [blogCatSeo, setBlogCatSeo] = useState("");
  const [rwCatName, setRwCatName] = useState("");
  const [revName, setRevName] = useState("");
  const [revCity, setRevCity] = useState("Kolkata");
  const [revComment, setRevComment] = useState("");
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageModal, setPageModal] = useState(false);
  const [pageForm, setPageForm] = useState({
    slug: "",
    page_type: "static",
    title: "",
    body_html: "",
    seo_title: "",
    seo_description: "",
    is_published: true,
  });

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postModal, setPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content_html: "",
    featured_image_url: "",
    author_name: "Giftlaya Editorial",
    status: "published",
  });

  const [editingRwId, setEditingRwId] = useState<number | null>(null);
  const [rwTitle, setRwTitle] = useState("");
  const [rwCat, setRwCat] = useState("birthday-decoration");
  const [rwImg, setRwImg] = useState("");

  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");

  const [redFrom, setRedFrom] = useState("");
  const [redTo, setRedTo] = useState("");

  const { data: pages = [] } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: () => adminApi.listCMSPages(),
    enabled: tab === "pages",
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => adminApi.listBlogPosts(),
    enabled: tab === "blog",
  });

  const { data: blogCategories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => adminApi.listBlogCategories(),
    enabled: tab === "blog_categories" || tab === "blog",
  });

  const { data: rwCatSetting = [] } = useQuery({
    queryKey: ["site-settings-content"],
    queryFn: () => adminApi.listSiteSettings("content"),
    enabled: tab === "rw_categories" || tab === "recent_work",
  });

  const rwCategoriesList = useMemo(() => {
    const found = rwCatSetting.find((s) => s.key === "recent_work_categories");
    const items = (found?.value_json as { items?: Array<{ name: string; slug: string }> } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  }, [rwCatSetting]);

  const { data: works = [] } = useQuery({
    queryKey: ["recent-works"],
    queryFn: () => adminApi.listRecentWorks(),
    enabled: tab === "recent_work",
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => adminApi.listReviews(),
    enabled: tab === "reviews",
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => adminApi.listFAQs(),
    enabled: tab === "faqs",
  });

  const { data: redirects = [] } = useQuery({
    queryKey: ["seo-redirects"],
    queryFn: () => adminApi.listSEORedirects(),
    enabled: tab === "sitemap",
  });

  const savePageMut = useMutation({
    mutationFn: () => adminApi.saveCMSPage({ id: editingPageId ?? undefined, ...pageForm }),
    onSuccess: () => {
      showToast(editingPageId ? "Page updated" : "Page saved", "success");
      setEditingPageId(null);
      setPageModal(false);
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const savePostMut = useMutation({
    mutationFn: () => adminApi.saveBlogPost({ id: editingPostId ?? undefined, ...postForm }),
    onSuccess: () => {
      showToast(editingPostId ? "Blog article updated" : "Blog article published", "success");
      setEditingPostId(null);
      setPostModal(false);
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveWorkMut = useMutation({
    mutationFn: () =>
      adminApi.saveRecentWork({
        id: editingRwId ?? undefined,
        title: rwTitle,
        category_slug: rwCat,
        image_url: rwImg,
        is_published: true,
      }),
    onSuccess: () => {
      showToast(editingRwId ? "Recent work updated" : "Recent work added", "success");
      setEditingRwId(null);
      setRwTitle("");
      setRwImg("");
      qc.invalidateQueries({ queryKey: ["recent-works"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const moderateRevMut = useMutation({
    mutationFn: ({ id, status, featured }: { id: number; status: string; featured: boolean }) =>
      adminApi.moderateReview(id, { status, is_featured_home: featured }),
    onSuccess: () => {
      showToast("Review moderated", "success");
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveFaqMut = useMutation({
    mutationFn: () =>
      adminApi.saveFAQ({
        id: editingFaqId ?? undefined,
        question: faqQ,
        answer: faqA,
        scope_type: "home",
        is_active: true,
      }),
    onSuccess: () => {
      showToast(editingFaqId ? "FAQ updated" : "FAQ saved", "success");
      setEditingFaqId(null);
      setFaqQ("");
      setFaqA("");
      qc.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveRedirectMut = useMutation({
    mutationFn: () =>
      adminApi.saveSEORedirect({
        from_path: redFrom,
        to_path: redTo,
        status_code: 301,
        is_active: true,
      }),
    onSuccess: () => {
      showToast("301 redirect rule added", "success");
      setRedFrom("");
      setRedTo("");
      qc.invalidateQueries({ queryKey: ["seo-redirects"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <div className="space-y-4 animate-bd-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <FileCode2 size={20} className="text-[#4f6ef7]" />
            {tab === "blog_categories"
              ? "Blog Categories"
              : tab === "blog"
              ? "Blog Articles"
              : tab === "rw_categories"
              ? "Recent Work Categories"
              : tab === "recent_work"
              ? "Recent Decoration Works"
              : tab === "sitemap"
              ? "XML Sitemap & 301 Redirects"
              : tab === "reviews"
              ? "Customer Reviews"
              : "Content, Blog, Recent Work & SEO"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Static/policy pages, blog articles & categories, recent decoration portfolio, FAQs, reviews, 301 redirects & XML sitemap.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        {(
          [
            ["pages", "CMS & Policy Pages", FileCode2],
            ["blog", "Blog Posts", BookOpen],
            ["blog_categories", "Blog Categories", Tags],
            ["recent_work", "Recent Works", Sparkles],
            ["rw_categories", "Work Categories", Tags],
            ["reviews", "Reviews", Star],
            ["faqs", "FAQs", FileCode2],
            ["sitemap", "301 Redirects & Sitemap", Network],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
              tab === id ? "bg-[#4f6ef7] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === "blog_categories" && (
        <div className="space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .saveBlogCategory({ name: blogCatName, seo_title: blogCatSeo })
                .then(() => {
                  showToast("Blog category saved", "success");
                  setBlogCatName("");
                  setBlogCatSeo("");
                  qc.invalidateQueries({ queryKey: ["blog-categories"] });
                })
                .catch((err: Error) => showToast(err.message, "error"));
            }}
            className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80"
          >
            <input required value={blogCatName} onChange={(e) => setBlogCatName(e.target.value)} placeholder="Category Name *" className="px-3 py-2 rounded-xl border border-slate-200 w-64" />
            <input value={blogCatSeo} onChange={(e) => setBlogCatSeo(e.target.value)} placeholder="SEO Title (optional)" className="px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[200px]" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Add Blog Category</button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
            {blogCategories.map((bc) => (
              <div key={bc.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{bc.name}</p>
                  <p className="text-[11px] text-slate-400">/{bc.slug} {bc.seo_title ? `· ${bc.seo_title}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rw_categories" && (
        <div className="space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const slug = rwCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const next = [...rwCategoriesList, { name: rwCatName, slug }];
              adminApi
                .upsertSiteSetting("recent_work_categories", "content", { items: next })
                .then(() => {
                  showToast("Recent work category added", "success");
                  setRwCatName("");
                  qc.invalidateQueries({ queryKey: ["site-settings-content"] });
                });
            }}
            className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80"
          >
            <input required value={rwCatName} onChange={(e) => setRwCatName(e.target.value)} placeholder="Portfolio category name (e.g. Haldi Decor)" className="px-3 py-2 rounded-xl border border-slate-200 w-72" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Add Work Category</button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
            {rwCategoriesList.map((rc, idx) => (
              <div key={idx} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{rc.name}</p>
                  <p className="text-[11px] text-slate-400">slug: {rc.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = rwCategoriesList.filter((_, j) => j !== idx);
                    adminApi.upsertSiteSetting("recent_work_categories", "content", { items: next }).then(() => qc.invalidateQueries({ queryKey: ["site-settings-content"] }));
                  }}
                  className="text-red-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pages" && (
        <div className="space-y-3 text-xs">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingPageId(null);
                setPageForm({
                  slug: "",
                  page_type: "static",
                  title: "",
                  body_html: "",
                  seo_title: "",
                  seo_description: "",
                  is_published: true,
                });
                setPageModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
            >
              <Plus size={14} /> New CMS Page
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100">
            {pages.map((pg) => (
              <div key={pg.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{pg.title}</p>
                  <p className="text-[11px] text-slate-400">
                    /pages/{pg.slug} · {pg.page_type}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      pg.is_published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pg.is_published ? "Published" : "Draft"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPageId(pg.id ?? null);
                      setPageForm({
                        slug: pg.slug || "",
                        page_type: pg.page_type || "static",
                        title: pg.title || "",
                        body_html: pg.body_html || "",
                        seo_title: pg.seo_title || "",
                        seo_description: pg.seo_description || "",
                        is_published: pg.is_published !== false,
                      });
                      setPageModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                    aria-label={`Edit page ${pg.slug}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminApi.deleteCMSPage(pg.id!).then(() => {
                        showToast("CMS page deleted", "success");
                        qc.invalidateQueries({ queryKey: ["cms-pages"] });
                      })
                    }
                    className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                    aria-label={`Delete page ${pg.slug}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "blog" && (
        <div className="space-y-3 text-xs">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingPostId(null);
                setPostForm({
                  title: "",
                  slug: "",
                  excerpt: "",
                  content_html: "",
                  featured_image_url: "",
                  author_name: "Giftlaya Editorial",
                  status: "published",
                });
                setPostModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
            >
              <Plus size={14} /> Write Blog Post
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100">
            {posts.map((bp) => (
              <div key={bp.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{bp.title}</p>
                  <p className="text-[11px] text-slate-400">/blog/{bp.slug} · {bp.author_name}</p>
                </div>
                <div className="inline-flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold capitalize">
                    {bp.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostId(bp.id ?? null);
                      setPostForm({
                        title: bp.title || "",
                        slug: bp.slug || "",
                        excerpt: bp.excerpt || "",
                        content_html: bp.content_html || "",
                        featured_image_url: bp.featured_image_url || "",
                        author_name: bp.author_name || "Giftlaya Editorial",
                        status: bp.status || "published",
                      });
                      setPostModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                    aria-label={`Edit post ${bp.slug}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminApi.deleteBlogPost(bp.id!).then(() => {
                        showToast("Blog post deleted", "success");
                        qc.invalidateQueries({ queryKey: ["blog-posts"] });
                      })
                    }
                    className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                    aria-label={`Delete post ${bp.slug}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "recent_work" && (
        <div className="space-y-4 text-xs">
          <form onSubmit={(e) => { e.preventDefault(); saveWorkMut.mutate(); }} className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80">
            <input required value={rwTitle} onChange={(e) => setRwTitle(e.target.value)} placeholder="Setup title (e.g. Haldi Decor Mumbai)" className="px-3 py-2 rounded-xl border border-slate-200" />
            <input value={rwCat} onChange={(e) => setRwCat(e.target.value)} placeholder="Category slug" className="px-3 py-2 rounded-xl border border-slate-200" />
            <input required value={rwImg} onChange={(e) => setRwImg(e.target.value)} placeholder="Photo URL" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              {editingRwId ? "Update Work" : "Add Work"}
            </button>
            {editingRwId && (
              <button
                type="button"
                onClick={() => {
                  setEditingRwId(null);
                  setRwTitle("");
                  setRwCat("birthday-decoration");
                  setRwImg("");
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
            )}
          </form>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {works.map((w) => (
              <div key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 overflow-hidden">
                <img src={w.image_url} alt={w.title} className="w-full h-32 object-cover bg-slate-100" />
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{w.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{w.category_slug}</p>
                  </div>
                  <div className="inline-flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRwId(w.id ?? null);
                        setRwTitle(w.title || "");
                        setRwCat(w.category_slug || "birthday-decoration");
                        setRwImg(w.image_url || "");
                      }}
                      className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                      aria-label={`Edit ${w.title}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminApi.deleteRecentWork(w.id!).then(() => {
                          showToast("Recent work removed", "success");
                          qc.invalidateQueries({ queryKey: ["recent-works"] });
                        })
                      }
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                      aria-label={`Delete ${w.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .createReview({ reviewer_name: revName, city_name: revCity, comment: revComment, rating: 5, status: "approved", is_featured_home: true })
                .then(() => {
                  showToast("Review added", "success");
                  setRevName("");
                  setRevComment("");
                  qc.invalidateQueries({ queryKey: ["reviews"] });
                });
            }}
            className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80"
          >
            <input required value={revName} onChange={(e) => setRevName(e.target.value)} placeholder="Reviewer name *" className="px-3 py-2 rounded-xl border border-slate-200 w-44" />
            <input value={revCity} onChange={(e) => setRevCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-xl border border-slate-200 w-32" />
            <input required value={revComment} onChange={(e) => setRevComment(e.target.value)} placeholder="Review comment *" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Add Review</button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
            {(reviewsData?.items || []).map((rv) => (
              <div key={rv.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {rv.reviewer_name} ({rv.city_name}) · {"★".repeat(rv.rating || 5)}
                  </p>
                  <p className="text-slate-600 mt-1">{rv.comment}</p>
                  <p className="text-[11px] text-slate-400 mt-1 capitalize">Status: {rv.status}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moderateRevMut.mutate({ id: rv.id!, status: "approved", featured: true })}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                    title="Approve & Feature"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moderateRevMut.mutate({ id: rv.id!, status: "rejected", featured: false })}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                    title="Reject"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adminApi.deleteReview(rv.id!).then(() => qc.invalidateQueries({ queryKey: ["reviews"] }))}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "faqs" && (
        <div className="space-y-4 text-xs">
          <form onSubmit={(e) => { e.preventDefault(); saveFaqMut.mutate(); }} className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80">
            <input required value={faqQ} onChange={(e) => setFaqQ(e.target.value)} placeholder="Question..." className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            <textarea required rows={2} value={faqA} onChange={(e) => setFaqA(e.target.value)} placeholder="Answer..." className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            <div className="flex items-center gap-2">
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                {editingFaqId ? "Update FAQ" : "Add FAQ"}
              </button>
              {editingFaqId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaqId(null);
                    setFaqQ("");
                    setFaqA("");
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
            {faqs.map((f) => (
              <div key={f.id} className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{f.question}</p>
                  <p className="text-slate-600 mt-1">{f.answer}</p>
                </div>
                <div className="inline-flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFaqId(f.id ?? null);
                      setFaqQ(f.question || "");
                      setFaqA(f.answer || "");
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                    aria-label={`Edit FAQ ${f.id}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      adminApi.deleteFAQ(f.id!).then(() => {
                        showToast("FAQ removed", "success");
                        qc.invalidateQueries({ queryKey: ["faqs"] });
                      })
                    }
                    className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                    aria-label={`Delete FAQ ${f.id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "sitemap" && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="font-bold">Live Dynamic Sitemap XML</p>
              <p className="text-slate-500">Auto-generated from published products, categories, blog posts & CMS pages</p>
            </div>
            <a href={`${API_BASE_URL}/api/v1/public/sitemap.xml`} target="_blank" rel="noreferrer" className="px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold">
              Open sitemap.xml
            </a>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); saveRedirectMut.mutate(); }} className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80">
            <input required value={redFrom} onChange={(e) => setRedFrom(e.target.value)} placeholder="From (/old-slug)" className="flex-1 px-3 py-2 rounded-xl border border-slate-200" />
            <input required value={redTo} onChange={(e) => setRedTo(e.target.value)} placeholder="To (/new-slug)" className="flex-1 px-3 py-2 rounded-xl border border-slate-200" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Add 301 Redirect</button>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 divide-y divide-slate-100">
            {redirects.map((r) => (
              <div key={r.id} className="px-4 py-3 flex justify-between items-center font-mono">
                <span>{r.from_path} → {r.to_path} ({r.status_code})</span>
                <button type="button" onClick={() => adminApi.deleteSEORedirect(r.id!).then(() => qc.invalidateQueries({ queryKey: ["seo-redirects"] }))} className="text-red-400 hover:text-red-600 cursor-pointer">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <FormModal open={pageModal} title={editingPageId ? "Edit CMS Page" : "Create CMS Page"} onClose={() => setPageModal(false)}>
        <form onSubmit={(e) => { e.preventDefault(); savePageMut.mutate(); }} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required placeholder="Title" value={pageForm.title} onChange={(e) => setPageForm((s) => ({ ...s, title: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
            <input required placeholder="Slug (e.g. about-us)" value={pageForm.slug} onChange={(e) => setPageForm((s) => ({ ...s, slug: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
            <select value={pageForm.page_type} onChange={(e) => setPageForm((s) => ({ ...s, page_type: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200">
              <option value="static">Static Page</option>
              <option value="footer_policy">Footer Policy</option>
              <option value="landing">Dynamic Landing Page</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="SEO Title" value={pageForm.seo_title} onChange={(e) => setPageForm((s) => ({ ...s, seo_title: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
            <input placeholder="SEO Meta Description" value={pageForm.seo_description} onChange={(e) => setPageForm((s) => ({ ...s, seo_description: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <RichTextEditor value={pageForm.body_html} onChange={(html) => setPageForm((s) => ({ ...s, body_html: html }))} />
          <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
            <input type="checkbox" checked={pageForm.is_published} onChange={(e) => setPageForm((s) => ({ ...s, is_published: e.target.checked }))} />
            Published on Storefront
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPageModal(false)} className="px-4 py-2 rounded-xl border cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Save Page</button>
          </div>
        </form>
      </FormModal>

      <FormModal open={postModal} title={editingPostId ? "Edit Blog Article" : "Publish Blog Article"} onClose={() => setPostModal(false)}>
        <form onSubmit={(e) => { e.preventDefault(); savePostMut.mutate(); }} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Article Title" value={postForm.title} onChange={(e) => setPostForm((s) => ({ ...s, title: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
            <input placeholder="Slug (auto if blank)" value={postForm.slug} onChange={(e) => setPostForm((s) => ({ ...s, slug: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <input placeholder="Short Excerpt" value={postForm.excerpt} onChange={(e) => setPostForm((s) => ({ ...s, excerpt: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Featured Image URL" value={postForm.featured_image_url} onChange={(e) => setPostForm((s) => ({ ...s, featured_image_url: e.target.value }))} className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200" />
            <select value={postForm.status} onChange={(e) => setPostForm((s) => ({ ...s, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <RichTextEditor value={postForm.content_html} onChange={(html) => setPostForm((s) => ({ ...s, content_html: html }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPostModal(false)} className="px-4 py-2 rounded-xl border cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              {editingPostId ? "Update Post" : "Publish"}
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}

