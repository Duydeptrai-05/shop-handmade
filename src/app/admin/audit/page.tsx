"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Log = {
  id: number;
  adminUsername: string;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
};

const CHANNELS = [
  { key: "", label: "tất-cả" },
  { key: "order", label: "đơn-hàng" },
  { key: "product", label: "sản-phẩm" },
  { key: "customer", label: "khách-hàng" },
  { key: "voucher", label: "voucher" },
  { key: "review", label: "đánh-giá" },
];

type Tone = "ok" | "bad" | "info";

const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  "order.cancel": { label: "HỦY ĐƠN", tone: "bad" },
  "order.status": { label: "ĐỔI TRẠNG THÁI", tone: "info" },
  "order.payment": { label: "XÁC NHẬN TIỀN", tone: "ok" },
  "product.create": { label: "THÊM SP", tone: "ok" },
  "product.update": { label: "SỬA SP", tone: "info" },
  "product.hide": { label: "ẨN SP", tone: "bad" },
  "customer.lock": { label: "KHÓA", tone: "bad" },
  "customer.unlock": { label: "MỞ KHÓA", tone: "ok" },
  "customer.reset_password": { label: "ĐẶT LẠI MK", tone: "info" },
  "voucher.create": { label: "TẠO VOUCHER", tone: "ok" },
  "voucher.update": { label: "SỬA VOUCHER", tone: "info" },
  "voucher.toggle": { label: "BẬT/TẮT", tone: "info" },
  "voucher.delete": { label: "XÓA VOUCHER", tone: "bad" },
  "review.approve": { label: "DUYỆT", tone: "ok" },
  "review.hide": { label: "ẨN ĐÁNH GIÁ", tone: "bad" },
};

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-emerald-400/15 text-emerald-300",
  bad: "bg-moss/25 text-peach",
  info: "bg-ochre/15 text-ochre",
};

const TZ = "Asia/Ho_Chi_Minh";

function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ });
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: TZ,
    hour12: false,
  });
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entityType, setEntityType] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const reqId = useRef(0);

  // gõ xong 0,3 giây mới tìm
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchPage = useCallback(
    async (p: number, reset: boolean) => {
      const id = ++reqId.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: "30",
        });
        if (entityType) params.set("entityType", entityType);
        if (q) params.set("q", q);

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
        const json = await res.json();
        if (id !== reqId.current) return;

        if (!json.success) {
          setError(json.message ?? "Không tải được nhật ký");
          return;
        }
        setLogs((prev) =>
          reset ? json.data.logs : [...prev, ...json.data.logs],
        );
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
        setPage(p);
      } catch {
        if (id === reqId.current) setError("Không kết nối được máy chủ");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [entityType, q],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  // gom dòng theo ngày
  const groups: { day: string; items: Log[] }[] = [];
  for (const log of logs) {
    const day = dayOf(log.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(log);
    else groups.push({ day, items: [log] });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-moss-dark">
          Quản trị
        </p>
        <h1 className="font-heading text-3xl text-ink">Nhật ký thao tác</h1>
        <p className="mt-1 text-sm text-ink/60">
          Mọi thay đổi của Admin được ghi lại tại đây, không sửa hay xóa được.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        {/* Thanh kênh */}
        <nav
          aria-label="Lọc theo đối tượng"
          className="flex gap-2 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:self-start lg:overflow-visible lg:pb-0"
        >
          {CHANNELS.map((c) => {
            const active = entityType === c.key;
            return (
              <button
                key={c.key || "all"}
                type="button"
                onClick={() => setEntityType(c.key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left font-mono text-sm transition ${
                  active ? "bg-ink text-paper" : "text-ink/70 hover:bg-blush"
                }`}
              >
                <span className={active ? "text-peach" : "text-moss-dark"}>
                  #
                </span>{" "}
                {c.label}
              </button>
            );
          })}
        </nav>

        {/* Khung console */}
        <section className="overflow-hidden rounded-xl bg-ink font-mono text-paper shadow-warm-lg">
          <div className="flex items-center gap-3 border-b border-paper/10 px-4 py-3">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="h-2.5 w-2.5 rounded-full bg-moss" />
              <i className="h-2.5 w-2.5 rounded-full bg-ochre" />
              <i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <label className="flex flex-1 items-center gap-2 text-sm">
              <span className="text-peach">grep ›</span>
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="tên Admin hoặc từ khóa trong nội dung…"
                className="w-full bg-transparent text-paper placeholder:text-paper/30 focus:outline-none"
              />
            </label>
            <span className="hidden text-xs text-paper/40 sm:inline">
              {total} dòng
            </span>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-3 text-sm">
            {error && (
              <p className="py-6 text-center text-peach">
                {error}{" "}
                <button
                  type="button"
                  onClick={() => fetchPage(1, true)}
                  className="underline"
                >
                  thử lại
                </button>
              </p>
            )}

            {!error && loading && logs.length === 0 && (
              <div className="space-y-3 py-2" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-paper/10"
                    style={{ width: `${95 - i * 9}%` }}
                  />
                ))}
              </div>
            )}

            {!error && !loading && logs.length === 0 && (
              <p className="py-10 text-center text-paper/40">
                — không có dòng nhật ký nào khớp —
              </p>
            )}

            {groups.map((g) => (
              <div key={g.day} className="mb-4">
                <p className="mb-2 text-xs text-paper/35">
                  ── {g.day} ──────────────
                </p>
                <ul className="space-y-2">
                  {g.items.map((log) => {
                    const meta = ACTION_META[log.action] ?? {
                      label: log.action,
                      tone: "info" as Tone,
                    };
                    return (
                      <li
                        key={log.id}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 leading-relaxed"
                      >
                        <span className="text-paper/40">
                          {timeOf(log.createdAt)}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${TONE_CLASS[meta.tone]}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-paper/90">{log.summary}</span>
                        <span className="text-xs text-paper/35">
                          — {log.adminUsername}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {hasMore && (
              <div className="py-3 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fetchPage(page + 1, false)}
                  className="rounded-md border border-paper/20 px-4 py-1.5 text-xs text-paper/80 transition hover:bg-paper/10 disabled:opacity-50"
                >
                  {loading ? "đang tải…" : "↓ xem thêm"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
