"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Status =
  | "pending"
  | "quoted"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

type Req = {
  id: number;
  title: string;
  description: string;
  quantity: number;
  budget: number | null;
  referenceImageUrl: string | null;
  quotedPrice: number | null;
  adminNote: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
};

const COLUMNS: {
  key: string;
  title: string;
  hint: string;
  statuses: Status[];
  dot: string;
}[] = [
  {
    key: "pending",
    title: "Chờ báo giá",
    hint: "Khách vừa gửi, chờ bạn báo giá",
    statuses: ["pending"],
    dot: "bg-moss",
  },
  {
    key: "quoted",
    title: "Chờ khách trả lời",
    hint: "Đã báo giá, chờ khách đồng ý",
    statuses: ["quoted"],
    dot: "bg-ochre",
  },
  {
    key: "doing",
    title: "Đang thực hiện",
    hint: "Khách đã đồng ý giá",
    statuses: ["accepted", "in_progress"],
    dot: "bg-ink",
  },
  {
    key: "closed",
    title: "Đã đóng",
    hint: "Hoàn thành, từ chối hoặc hủy",
    statuses: ["completed", "rejected", "cancelled"],
    dot: "bg-ink/30",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  pending: "Chờ báo giá",
  quoted: "Đã báo giá",
  accepted: "Khách đã đồng ý",
  rejected: "Đã từ chối",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  cancelled: "Khách đã hủy",
};

const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-moss/15 text-moss-dark",
  quoted: "bg-ochre/25 text-ink",
  accepted: "bg-ink/10 text-ink",
  rejected: "bg-ink/10 text-ink/70",
  in_progress: "bg-ink text-white",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-ink/10 text-ink/70",
};

function money(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function shortDate(s: string) {
  return new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Khối thao tác của một yêu cầu ---------- */
function RequestActions({ req, onDone }: { req: Req; onDone: () => void }) {
  const [price, setPrice] = useState(
    req.quotedPrice != null ? String(req.quotedPrice) : "",
  );
  const [note, setNote] = useState(req.adminNote ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/custom-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.message ?? "Có lỗi xảy ra, vui lòng thử lại");
        if (res.status === 409) onDone();
        return;
      }
      onDone();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  function submitQuote() {
    if (!price || Number(price) <= 0) {
      setError("Nhập giá báo lớn hơn 0");
      return;
    }
    const body: Record<string, unknown> = {
      action: "quote",
      quotedPrice: Number(price),
    };
    if (note.trim()) body.adminNote = note.trim();
    send(body);
  }

  function submitReject() {
    if (!rejectNote.trim()) {
      setError("Nhập lý do từ chối để khách biết");
      return;
    }
    send({ action: "reject", adminNote: rejectNote.trim() });
  }

  const status = req.status;

  // Trạng thái đã đóng: không còn thao tác
  if (
    status === "rejected" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return (
      <p className="text-xs text-ink/60">
        Yêu cầu này đã đóng, không còn thao tác nào.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {(status === "pending" || status === "quoted") && !rejecting && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-ink/70">
            {status === "quoted" ? "Báo lại giá (đ)" : "Giá báo cho khách (đ)"}
          </label>
          <input
            inputMode="numeric"
            value={price ? Number(price).toLocaleString("vi-VN") : ""}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            placeholder="Ví dụ 350.000"
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ghi chú cho khách (thời gian làm, chất liệu...) - không bắt buộc"
            className="w-full resize-none rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitQuote}
              disabled={busy}
              className="rounded-full bg-moss px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-50"
            >
              {busy
                ? "Đang gửi..."
                : status === "quoted"
                  ? "Gửi giá mới"
                  : "Gửi báo giá"}
            </button>
            {status === "pending" && (
              <button
                type="button"
                onClick={() => {
                  setRejecting(true);
                  setError("");
                }}
                disabled={busy}
                className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink/80 transition-colors hover:bg-blush disabled:opacity-50"
              >
                Từ chối
              </button>
            )}
          </div>
        </div>
      )}

      {status === "pending" && rejecting && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-ink/70">
            Lý do từ chối (khách sẽ thấy)
          </label>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            placeholder="Ví dụ: Shop chưa làm được loại này..."
            className="w-full resize-none rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitReject}
              disabled={busy}
              className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {busy ? "Đang gửi..." : "Xác nhận từ chối"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError("");
              }}
              disabled={busy}
              className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink/80 transition-colors hover:bg-blush disabled:opacity-50"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {status === "accepted" && (
        <button
          type="button"
          onClick={() => send({ action: "start" })}
          disabled={busy}
          className="rounded-full bg-moss px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-50"
        >
          {busy ? "Đang xử lý..." : "Bắt đầu làm"}
        </button>
      )}

      {status === "in_progress" && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Đánh dấu yêu cầu này đã làm xong?"))
              send({ action: "complete" });
          }}
          disabled={busy}
          className="rounded-full bg-moss px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moss-dark disabled:opacity-50"
        >
          {busy ? "Đang xử lý..." : "Đánh dấu hoàn thành"}
        </button>
      )}

      {status === "quoted" && (
        <p className="text-xs text-ink/60">
          Đang chờ khách trả lời. Bạn có thể báo lại giá nếu cần.
        </p>
      )}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/* ---------- Trang ---------- */
export default function AdminCustomRequestsPage() {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async (silent: boolean) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/custom-requests", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.message ?? "Không tải được danh sách yêu cầu");
        return;
      }
      setItems(json.data as Req[]);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return items;
    return items.filter(
      (r) =>
        `#${r.id}` === key ||
        r.title.toLowerCase().includes(key) ||
        r.customer.name.toLowerCase().includes(key) ||
        r.customer.email.toLowerCase().includes(key),
    );
  }, [items, q]);

  const waiting = items.filter((r) => r.status === "pending").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Đầu trang */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss-dark">
            Đặt làm theo yêu cầu
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold text-ink">
            Yêu cầu của khách
          </h1>
          <p className="mt-1 text-sm text-ink/65">
            {loading
              ? "Đang tải..."
              : waiting > 0
                ? `${waiting} yêu cầu đang chờ bạn báo giá`
                : "Không có yêu cầu nào đang chờ báo giá"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên món, khách, #mã"
            className="w-56 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm text-ink outline-none focus:border-moss"
          />
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/80 transition-colors hover:bg-blush disabled:opacity-50"
          >
            {refreshing ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <Link href="/admin/login" className="font-medium underline">
            Đăng nhập Admin
          </Link>
        </div>
      )}

      {/* Bảng 4 cột */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const rows = filtered.filter((r) => col.statuses.includes(r.status));
          return (
            <section
              key={col.key}
              className="flex min-h-[200px] flex-col rounded-2xl bg-blush/40 p-3"
            >
              <header className="mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h2 className="font-heading text-base font-semibold text-ink">
                    {col.title}
                  </h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink/70">
                    {rows.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink/60">{col.hint}</p>
              </header>

              <div className="space-y-3">
                {loading && (
                  <div className="h-20 animate-pulse rounded-xl bg-white/70" />
                )}

                {!loading && rows.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink/15 px-3 py-6 text-center text-xs text-ink/60">
                    Không có yêu cầu
                  </p>
                )}

                {rows.map((r) => {
                  const open = openId === r.id;
                  return (
                    <article
                      key={r.id}
                      className={`overflow-hidden rounded-xl border bg-card transition-shadow ${
                        open
                          ? "border-moss shadow-warm"
                          : "border-ink/10 hover:shadow-warm"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        className="block w-full px-3.5 py-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold leading-snug text-ink">
                            {r.title}
                          </h3>
                          <span className="shrink-0 text-xs text-ink/60">
                            #{r.id}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink/70">
                          {r.customer.name} · {r.quantity} món
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[r.status]}`}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                          {r.quotedPrice != null ? (
                            <span className="text-xs font-semibold text-moss-dark">
                              {money(r.quotedPrice)}
                            </span>
                          ) : r.budget != null ? (
                            <span className="text-xs text-ink/65">
                              Ngân sách {money(r.budget)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[11px] text-ink/55">
                          Gửi lúc {shortDate(r.createdAt)}
                        </p>
                      </button>

                      {open && (
                        <div className="space-y-4 border-t border-dashed border-ink/15 bg-paper/60 px-3.5 py-3.5">
                          <div>
                            <p className="text-xs font-medium text-ink/70">
                              Mô tả của khách
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm text-ink">
                              {r.description}
                            </p>
                          </div>

                          {r.referenceImageUrl && (
                            <a
                              href={r.referenceImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={r.referenceImageUrl}
                                alt={`Ảnh tham khảo của yêu cầu #${r.id}`}
                                className="h-40 w-full rounded-lg object-cover"
                              />
                            </a>
                          )}

                          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                            <dt className="text-ink/60">Khách</dt>
                            <dd className="text-ink">{r.customer.name}</dd>
                            <dt className="text-ink/60">Email</dt>
                            <dd className="break-all text-ink">
                              {r.customer.email}
                            </dd>
                            {r.customer.phone && (
                              <>
                                <dt className="text-ink/60">SĐT</dt>
                                <dd className="text-ink">{r.customer.phone}</dd>
                              </>
                            )}
                            <dt className="text-ink/60">Ngân sách</dt>
                            <dd className="text-ink">
                              {r.budget != null ? money(r.budget) : "Không nêu"}
                            </dd>
                            {r.quotedPrice != null && (
                              <>
                                <dt className="text-ink/60">Giá đã báo</dt>
                                <dd className="font-semibold text-moss-dark">
                                  {money(r.quotedPrice)}
                                </dd>
                              </>
                            )}
                          </dl>

                          {r.adminNote && (
                            <div className="rounded-lg bg-ochre/20 px-3 py-2 text-xs text-ink">
                              <span className="font-medium">
                                Ghi chú của shop:{" "}
                              </span>
                              {r.adminNote}
                            </div>
                          )}

                          <RequestActions
                            key={`${r.id}-${r.status}`}
                            req={r}
                            onDone={() => load(true)}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
