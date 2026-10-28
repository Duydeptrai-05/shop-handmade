"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

type ReviewStatus = "pending" | "approved" | "hidden";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  customer: { id: number; name: string; email: string };
  product: {
    id: number;
    name: string;
    imageUrl: string | null;
    isActive: boolean;
  };
};

const COLUMNS: {
  status: ReviewStatus;
  title: string;
  hint: string;
  accent: string;
  empty: string;
}[] = [
  {
    status: "pending",
    title: "Chờ duyệt",
    hint: "Đọc rồi quyết định hiện hay ẩn",
    accent: "bg-ochre",
    empty: "Không còn đánh giá nào chờ duyệt 🎉",
  },
  {
    status: "approved",
    title: "Đang hiển thị",
    hint: "Khách xem được ở trang sản phẩm",
    accent: "bg-emerald-600",
    empty: "Chưa có đánh giá nào đang hiển thị.",
  },
  {
    status: "hidden",
    title: "Đã ẩn",
    hint: "Không hiện với khách",
    accent: "bg-ink/40",
    empty: "Chưa ẩn đánh giá nào.",
  },
];

// Nút theo cột hiện tại (API vẫn là nơi chốt luật: chỉ approved/hidden)
const ACTIONS: Record<
  ReviewStatus,
  { to: "approved" | "hidden"; label: string; danger?: boolean }[]
> = {
  pending: [
    { to: "approved", label: "Duyệt" },
    { to: "hidden", label: "Ẩn", danger: true },
  ],
  approved: [{ to: "hidden", label: "Ẩn đánh giá", danger: true }],
  hidden: [{ to: "approved", label: "Hiện lại" }],
};

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= value ? "text-ochre" : "text-ink/20"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/admin/reviews");
        const json = await res.json();
        if (cancelled) return;

        if (res.ok && json.success) {
          setReviews(json.data);
          return;
        }
        if (res.status === 401) setNeedLogin(true);
        setError(json.message ?? "Có lỗi xảy ra, vui lòng thử lại");
      } catch {
        if (!cancelled)
          setError("Không kết nối được máy chủ, vui lòng thử lại");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function changeStatus(review: Review, to: "approved" | "hidden") {
    setBusyId(review.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        const updated: Review = json.data;
        setReviews((prev) =>
          prev === null
            ? prev
            : prev.map((r) => (r.id === updated.id ? updated : r)),
        );
        return;
      }

      if (res.status === 401) setNeedLogin(true);
      setActionError(json.message ?? "Có lỗi xảy ra, vui lòng thử lại");
    } catch {
      setActionError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setBusyId(null);
    }
  }

  // Lọc theo ô tìm kiếm: tên sản phẩm, tên/email khách, nội dung đánh giá
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews ?? [];
    return (reviews ?? []).filter(
      (r) =>
        r.product.name.toLowerCase().includes(q) ||
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.email.toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q),
    );
  }, [reviews, search]);

  if (needLogin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="font-heading text-3xl">Duyệt đánh giá</h1>
        <p className="mt-3 opacity-70">{error}</p>
        <Link
          href="/admin/login?next=/admin/reviews"
          className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-paper"
        >
          Đăng nhập quản trị
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">Duyệt đánh giá</h1>
          <p className="mt-1 text-sm text-ink/60">
            Đánh giá mới của khách nằm ở cột Chờ duyệt cho đến khi bạn quyết
            định
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Sản phẩm, khách, nội dung..."
            className="w-64 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-ochre/30"
          />
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:bg-ink hover:text-paper"
          >
            ↻ Tải lại
          </button>
        </div>
      </motion.div>

      {actionError && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {error && <p className="mt-8 text-center text-red-700">{error}</p>}

      {!error && reviews === null && (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-ink/10 bg-card"
            />
          ))}
        </div>
      )}

      {reviews !== null && (
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = visible.filter((r) => r.status === col.status);
            return (
              <section
                key={col.status}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-sm"
              >
                <div className={`h-1.5 ${col.accent}`} />
                <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
                  <div>
                    <h2 className="font-heading text-xl font-semibold">
                      {col.title}
                    </h2>
                    <p className="text-xs text-ink/55">{col.hint}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                      col.status === "pending" && items.length > 0
                        ? "bg-ochre text-ink"
                        : "bg-ink/10 text-ink/70"
                    }`}
                  >
                    {items.length}
                  </span>
                </header>

                <ul className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((r) => (
                      <motion.li
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl border border-ink/10 bg-paper p-4"
                      >
                        {/* Sản phẩm được đánh giá */}
                        <Link
                          href={`/products/${r.product.id}`}
                          target="_blank"
                          className="flex items-center gap-3"
                        >
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-card">
                            {r.product.imageUrl && (
                              <Image
                                src={r.product.imageUrl}
                                alt={r.product.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-sm font-medium leading-snug hover:underline">
                              {r.product.name}
                            </span>
                            {!r.product.isActive && (
                              <span className="mt-0.5 inline-block rounded bg-ink/10 px-1.5 text-[11px] text-ink/60">
                                Sản phẩm đang ẩn
                              </span>
                            )}
                          </span>
                        </Link>

                        {/* Sao + ngày */}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <Stars value={r.rating} />
                          <span className="text-xs text-ink/50">
                            {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>

                        {/* Nội dung */}
                        {r.comment ? (
                          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink/80">
                            {r.comment}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm italic text-ink/45">
                            Khách chỉ chấm sao, không viết nhận xét.
                          </p>
                        )}

                        {/* Người viết */}
                        <p className="mt-3 truncate text-xs text-ink/55">
                          {r.customer.name} · {r.customer.email}
                        </p>

                        {/* Nút xử lý */}
                        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
                          {ACTIONS[r.status].map((a) => (
                            <motion.button
                              key={a.to}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              disabled={busyId === r.id}
                              onClick={() => changeStatus(r, a.to)}
                              className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                                a.danger
                                  ? "border border-red-700 text-red-700 hover:bg-red-700 hover:text-white"
                                  : "bg-ink text-paper hover:bg-moss-dark"
                              }`}
                            >
                              {busyId === r.id ? "Đang xử lý..." : a.label}
                            </motion.button>
                          ))}
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>

                  {items.length === 0 && (
                    <li className="rounded-xl border border-dashed border-ink/20 px-4 py-10 text-center text-sm text-ink/55">
                      {search ? "Không có đánh giá nào khớp." : col.empty}
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
