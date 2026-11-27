"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react";
import type { BlogArticleSpec } from "@/config/seo-pages";

const TAG_STYLES = [
  "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
];

function getTagStyle(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % TAG_STYLES.length;
  }
  return TAG_STYLES[Math.abs(hash)] ?? TAG_STYLES[0]!;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTagStyle(
            tag
          )}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function BlogIndexClient({ articles }: { articles: BlogArticleSpec[] }) {
  const [search, setSearch] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("All");
  const [page, setPage] = useState(1);

  const recentThree = articles.slice(0, 3);
  const featured = recentThree[0];
  const secondaryRecent = recentThree.slice(1, 3);

  const clusters = ["All", ...Array.from(new Set(articles.map((a) => a.cluster)))];

  const isFiltering = search.trim().length > 0 || selectedCluster !== "All";
  const gridSource = isFiltering ? articles : articles.slice(3);

  const filteredGrid = gridSource.filter((a) => {
    if (selectedCluster !== "All" && a.cluster !== selectedCluster) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q)) ||
      a.cluster.toLowerCase().includes(q)
    );
  });

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredGrid.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedArticles = filteredGrid.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="space-y-16">
      {/* Section 1: Recent blog posts (Asymmetric Bento Layout matching reference) */}
      {!isFiltering && featured && (
        <section aria-labelledby="recent-posts-heading" className="space-y-7">
          <h2
            id="recent-posts-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Recent blog posts
          </h2>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left: Featured Post */}
            <Link href={`/blog/${featured.slug}`} className="group block lg:col-span-6">
              <div className="bg-surface relative aspect-[16/10] w-full overflow-hidden rounded-xl">
                <Image
                  src={featured.coverImage}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <p className="text-primary mt-5 text-xs font-semibold">
                {featured.authorName} &bull; {formatDisplayDate(featured.publishedAt)}
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h3 className="text-foreground group-hover:text-primary text-xl font-semibold tracking-tight transition-colors">
                  {featured.title}
                </h3>
                <ArrowUpRight
                  className="text-foreground mt-0.5 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted mt-2 line-clamp-2 text-sm leading-relaxed">
                {featured.excerpt}
              </p>
              <TagPills tags={featured.tags} />
            </Link>

            {/* Right: 2 Stacked Horizontal Cards */}
            <div className="flex flex-col gap-8 lg:col-span-6">
              {secondaryRecent.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group grid grid-cols-1 items-start gap-5 sm:grid-cols-12"
                >
                  <div className="bg-surface relative aspect-[16/10] overflow-hidden rounded-xl sm:col-span-5">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 22vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <p className="text-primary text-xs font-semibold">
                      {post.authorName} &bull; {formatDisplayDate(post.publishedAt)}
                    </p>
                    <div className="mt-1.5 flex items-start justify-between gap-2">
                      <h3 className="text-foreground group-hover:text-primary text-base leading-snug font-semibold tracking-tight transition-colors">
                        {post.title}
                      </h3>
                      <ArrowUpRight
                        className="text-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-muted mt-1.5 line-clamp-2 text-sm leading-relaxed">
                      {post.excerpt}
                    </p>
                    <TagPills tags={post.tags} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 2: All blog posts (3-Column Grid + Filter + Pagination) */}
      <section aria-labelledby="all-posts-heading" className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="all-posts-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            All blog posts{" "}
            <span className="text-muted text-sm font-normal">
              ({articles.length} guides)
            </span>
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="text-muted pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search articles..."
                aria-label="Search blog articles"
                className="border-border bg-card text-foreground placeholder:text-muted focus:border-primary h-9 w-52 rounded-lg border pr-3 pl-8 text-xs outline-none"
              />
            </div>

            <select
              value={selectedCluster}
              onChange={(e) => {
                setSelectedCluster(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by topic"
              className="border-border bg-card text-foreground h-9 rounded-lg border px-3 text-xs outline-none"
            >
              {clusters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pagedArticles.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed p-12 text-center">
            <p className="text-muted text-sm">
              No blog posts match your search. Clear filters to view all {articles.length}{" "}
              guides.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {pagedArticles.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col"
              >
                <div className="bg-surface relative aspect-[16/10] w-full overflow-hidden rounded-xl">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="text-primary mt-4 text-xs font-semibold">
                  {post.authorName} &bull; {formatDisplayDate(post.publishedAt)}
                </p>
                <div className="mt-2 flex items-start justify-between gap-2.5">
                  <h3 className="text-foreground group-hover:text-primary text-lg leading-snug font-semibold tracking-tight transition-colors">
                    {post.title}
                  </h3>
                  <ArrowUpRight
                    className="text-foreground mt-1 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-muted mt-2 line-clamp-2 text-sm leading-relaxed">
                  {post.excerpt}
                </p>
                <TagPills tags={post.tags} />
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Pagination Bar matching reference */}
        {totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="border-border mt-12 flex items-center justify-between border-t pt-5"
          >
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => {
                    setPage(pNum);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-current={pNum === safePage ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pNum === safePage
                      ? "bg-primary-soft text-primary font-semibold"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {pNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
