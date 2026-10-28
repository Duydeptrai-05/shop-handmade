"use client";

import { useEffect, useRef, useState } from "react";

type Reason = "import" | "sale" | "cancel_restore" | "adjustment";

type Movement = {
  id: number;
  productId: number;
  productName: string;
  orderId: number | null;
  change: number;
  stockAfter: number;
  reason: Reason;
  note: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

const REASON_META: Record<Reason, { label: string; tone: string }> = {
  import: {
    label: "Nhập hàng",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  sale: {
    label: "Bán ra",
    tone: "border-stone-300 bg-stone-50 text-stone-700",
  },
  cancel_restore: {
    label: "Hoàn kho",
    tone: "border-sky-300 bg-sky-50 text-sky-800",
  },
  adjustment: {
    label: "Điều chỉnh",
    tone: "border-amber-300 bg-amber-50 text-amber-800",
  },
};

const FILTERS: { value: Reason | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "import", label: "Nhập hàng" },
  { value: "sale", label: "Bán ra" },
  { value: "cancel_restore", label: "Hoàn kho" },
  { value: "adjustment", label: "Điều chỉnh" },
];

async function fetchPage(page: number, reason: Reason | "", q: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (reason) params.set("reason", reason);
  if (q) params.set("q", q);

  const res = await fetch(`/api/admin/stock-movements?${params.toString()}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? "Không thể tải lịch sử tồn kho");
  }
  return json as { data: Movement[]; total: number };
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminStockPage() {
  const [items, setItems] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState<Reason | "">("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Bỏ qua kết quả của request cũ nếu người dùng đã đổi bộ lọc
  const reqId = useRef(0);

  // Gõ xong 0,4 giây mới tìm
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Đổi bộ lọc thì tải lại từ trang 1
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    fetchPage(1, reason, debouncedQ)
      .then((r) => {
        if (id !== reqId.current) return;
        setItems(r.data);
        setTotal(r.total);
        setPage(1);
      })
      .catch((e: Error) => {
        if (id !== reqId.current) return;
        setError(e.message);
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [reason, debouncedQ]);

  function loadMore() {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    fetchPage(page + 1, reason, debouncedQ)
      .then((r) => {
        if (id !== reqId.current) return;
        setItems((prev) => [...prev, ...r.data]);
        setTotal(r.total);
        setPage((p) => p + 1);
      })
      .catch((e: Error) => {
        if (id !== reqId.current) return;
        setError(e.message);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }

  // Gom các dòng theo ngày, giữ nguyên thứ tự mới nhất lên đầu
  const groups: { label: string; rows: Movement[] }[] = [];
  for (const m of items) {
    const label = dayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(m);
    else groups.push({ label, rows: [m] });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss-dark">
          Quản trị
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold text-ink">
          Sổ kho
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Mọi lần tồn kho tăng hoặc giảm đều được ghi lại ở đây, kèm số tồn sau
          mỗi lần thay đổi.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setReason(f.value)}
              className={
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                (reason === f.value
                  ? "bg-ink text-white"
                  : "bg-blush text-ink/75 hover:text-moss-dark")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên sản phẩm"
          className="w-full rounded-full border border-peach/60 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-moss focus:outline-none sm:w-64"
        />
      </div>

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-peach/60 px-4 py-10 text-center text-sm text-ink/60">
          Chưa có biến động nào khớp bộ lọc.
        </p>
      )}

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-3 text-sm font-semibold capitalize text-ink/70">
              {g.label}
            </h2>
            <ol className="ml-2 border-l border-peach/60">
              {g.rows.map((m) => {
                const meta = REASON_META[m.reason];
                const up = m.change > 0;
                return (
                  <li key={m.id} className="relative pb-4 pl-6 last:pb-0">
                    <span
                      aria-hidden
                      className={
                        "absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full " +
                        (up ? "bg-emerald-600" : "bg-red-500")
                      }
                    />
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-peach/40 bg-white px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-ink/50">
                          {timeLabel(m.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setQ(m.productName)}
                          title="Lọc theo sản phẩm này"
                          className="mt-0.5 text-left font-medium text-ink hover:text-moss-dark"
                        >
                          {m.productName}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={
                              "rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                              meta.tone
                            }
                          >
                            {meta.label}
                          </span>
                          {m.orderId && (
                            <span className="text-xs text-ink/50">
                              Đơn #{m.orderId}
                            </span>
                          )}
                        </div>
                        {m.note && (
                          <p className="mt-1.5 text-xs text-ink/60">{m.note}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={
                            "font-heading text-2xl font-semibold tabular-nums " +
                            (up ? "text-emerald-700" : "text-red-600")
                          }
                        >
                          {up ? "+" : ""}
                          {m.change}
                        </p>
                        <p className="text-xs text-ink/50">
                          Tồn: {m.stockAfter}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {loading && (
        <p className="mt-6 text-center text-sm text-ink/50">Đang tải...</p>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-xs text-ink/50">
            Đang hiển thị {items.length} / {total} dòng
          </p>
          {items.length < total && (
            <button
              type="button"
              onClick={loadMore}
              className="mt-3 rounded-full border border-peach/60 bg-white px-5 py-2 text-sm font-medium text-ink hover:bg-blush"
            >
              Xem thêm
            </button>
          )}
        </div>
      )}
    </main>
  );
}
