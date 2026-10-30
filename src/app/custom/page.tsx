"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Status =
  | "pending"
  | "quoted"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

type CustomRequest = {
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
};

type Action = "accept" | "decline" | "cancel";

const STATUS_LABEL: Record<Status, string> = {
  pending: "Chờ báo giá",
  quoted: "Đã báo giá",
  accepted: "Đã đồng ý",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  rejected: "Không thực hiện",
  cancelled: "Đã hủy",
};

const STATUS_DOT: Record<Status, string> = {
  pending: "bg-ochre",
  quoted: "bg-moss",
  accepted: "bg-moss-dark",
  in_progress: "bg-moss-dark",
  completed: "bg-ink",
  rejected: "bg-ink/30",
  cancelled: "bg-ink/30",
};

const PROGRESS: Record<Status, number> = {
  pending: 0,
  quoted: 1,
  accepted: 2,
  in_progress: 3,
  completed: 4,
  rejected: -1,
  cancelled: -1,
};

const STEPS = [
  { label: "Đã gửi yêu cầu", hint: "Shop đã nhận được yêu cầu của bạn." },
  { label: "Shop báo giá", hint: "Shop đã gửi giá, đang chờ bạn quyết định." },
  { label: "Bạn đồng ý", hint: "Bạn đã đồng ý, shop chuẩn bị làm." },
  { label: "Đang làm", hint: "Shop đang làm món của bạn." },
  { label: "Hoàn thành", hint: "Món của bạn đã làm xong." },
];

const PRIORITY: Record<Status, number> = {
  quoted: 0,
  pending: 1,
  accepted: 2,
  in_progress: 2,
  completed: 3,
  rejected: 3,
  cancelled: 3,
};

const FILTERS: { key: string; label: string; statuses: Status[] | null }[] = [
  { key: "all", label: "Tất cả", statuses: null },
  { key: "reply", label: "Chờ bạn trả lời", statuses: ["quoted"] },
  { key: "wait", label: "Chờ báo giá", statuses: ["pending"] },
  { key: "making", label: "Đang làm", statuses: ["accepted", "in_progress"] },
  {
    key: "done",
    label: "Đã đóng",
    statuses: ["completed", "rejected", "cancelled"],
  },
];

const ACTION_TEXT: Record<Action, string> = {
  accept: "Đồng ý với giá shop báo?",
  decline: "Từ chối báo giá này?",
  cancel: "Hủy yêu cầu này?",
};

function money(n: number) {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function Timeline({ status }: { status: Status }) {
  const p = PROGRESS[status];

  if (p < 0) {
    return (
      <p className="text-sm text-ink/85">
        {status === "rejected"
          ? "Yêu cầu này không được thực hiện."
          : "Yêu cầu này đã được hủy."}
      </p>
    );
  }

  return (
    <ol>
      {STEPS.map((s, i) => {
        const done = i <= p;
        return (
          <li key={s.label} className="relative pb-5 pl-7 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                className={`absolute left-[7px] top-4 h-full w-0.5 ${
                  i < p ? "bg-moss" : "bg-ink/25"
                }`}
              />
            )}
            <span
              className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 ${
                done ? "border-moss bg-moss" : "border-ink/40 bg-paper"
              }`}
            />
            <p
              className={`text-sm ${done ? "font-medium text-ink" : "text-ink/60"}`}
            >
              {s.label}
            </p>
            {i === p && <p className="text-xs text-ink/75">{s.hint}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function Thumb({ r, size }: { r: CustomRequest; size: string }) {
  return r.referenceImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={r.referenceImageUrl}
      alt=""
      className={`${size} shrink-0 rounded-lg object-cover`}
    />
  ) : (
    <div
      className={`${size} font-heading flex shrink-0 items-center justify-center rounded-lg bg-blush text-moss-dark`}
    >
      {r.title.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default function CustomRequestsPage() {
  const router = useRouter();
  const detailRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ id: number; action: Action } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/custom-requests");
      if (res.status === 401) {
        router.replace("/login?next=/custom");
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Không tải được danh sách yêu cầu");
        return;
      }
      setItems(json.data);
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: number, action: Action) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/custom-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Không thực hiện được, vui lòng thử lại");
      }
      await load();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  function select(id: number) {
    setSelectedId(id);
    setConfirm(null);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of FILTERS) {
      c[f.key] = f.statuses
        ? items.filter((r) => f.statuses!.includes(r.status)).length
        : items.length;
    }
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter);
    const list = f?.statuses
      ? items.filter((r) => f.statuses!.includes(r.status))
      : items;
    return [...list].sort(
      (a, b) => PRIORITY[a.status] - PRIORITY[b.status] || b.id - a.id,
    );
  }, [items, filter]);

  const current =
    visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;
  const needReplyCount = counts.reply ?? 0;
  const confirming =
    current && confirm?.id === current.id ? confirm.action : null;
  const canAct =
    current && (current.status === "quoted" || current.status === "pending");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/20 pb-6">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">
            Món riêng của bạn
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink/80">
            Mô tả món bạn muốn, shop sẽ báo giá. Bạn đồng ý thì shop mới bắt đầu
            làm.
          </p>
          {needReplyCount > 0 && (
            <p className="mt-3 text-sm text-ink">
              <span className="font-semibold text-moss-dark">
                {needReplyCount} yêu cầu
              </span>{" "}
              đang chờ bạn trả lời.{" "}
              <button
                type="button"
                onClick={() => setFilter("reply")}
                className="underline underline-offset-2 hover:text-moss-dark"
              >
                Xem ngay
              </button>
            </p>
          )}
        </div>
        <Link
          href="/custom/new"
          className="rounded-md bg-moss px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-moss-dark"
        >
          Gửi yêu cầu mới
        </Link>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-blush px-4 py-3 text-sm text-moss-dark"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-ink/5" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-lg bg-ink/5" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-heading text-2xl">Bạn chưa gửi yêu cầu nào</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/75">
            Muốn khắc tên, đổi màu hay đổi hương cho một món? Cứ mô tả, shop sẽ
            trả lời bạn.
          </p>
          <Link
            href="/custom/new"
            className="mt-6 inline-block rounded-md bg-moss px-6 py-3 text-sm font-semibold text-white transition hover:bg-moss-dark"
          >
            Gửi yêu cầu đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <nav
            aria-label="Lọc yêu cầu"
            className="mt-6 flex gap-6 overflow-x-auto border-b border-ink/20"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`-mb-px shrink-0 border-b-2 pb-3 text-sm transition ${
                    active
                      ? "border-ink font-semibold text-ink"
                      : "border-transparent text-ink/75 hover:text-ink"
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs text-ink/60">
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </nav>

          {!current ? (
            <p className="mt-12 text-center text-sm text-ink/70">
              Không có yêu cầu nào trong mục này.
            </p>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
              <ul className="space-y-1.5 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1">
                {visible.map((r) => {
                  const active = r.id === current.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => select(r.id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                          active
                            ? "border-ink bg-card"
                            : "border-transparent hover:bg-card"
                        }`}
                      >
                        <Thumb r={r} size="h-12 w-12 text-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {r.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/75">
                            <span
                              className={`h-2 w-2 rounded-full ${STATUS_DOT[r.status]}`}
                            />
                            {STATUS_LABEL[r.status]}
                            <span className="text-ink/50">·</span>
                            {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <section ref={detailRef} className="scroll-mt-4 min-w-0">
                <div className="flex items-start gap-4">
                  <Thumb
                    r={current}
                    size="h-20 w-20 text-3xl sm:h-28 sm:w-28"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs text-ink/75">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[current.status]}`}
                      />
                      {STATUS_LABEL[current.status]} · Mã #{current.id}
                    </p>
                    <h2 className="font-heading mt-1 text-2xl leading-snug text-ink sm:text-3xl">
                      {current.title}
                    </h2>
                  </div>
                </div>

                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {current.description}
                </p>

                <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-ink/20 py-4 text-sm">
                  <div>
                    <dt className="text-xs text-ink/70">Số lượng</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {current.quantity}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink/70">Ngân sách</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {current.budget !== null ? money(current.budget) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink/70">Ngày gửi</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {new Date(current.createdAt).toLocaleDateString("vi-VN")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-ink/90">
                    Phản hồi từ shop
                  </h3>
                  {current.quotedPrice !== null ? (
                    <p className="font-heading mt-1 text-3xl text-moss-dark">
                      {money(current.quotedPrice)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-ink/85">
                      {current.status === "pending"
                        ? "Shop chưa báo giá, bạn chờ một chút nhé."
                        : "Không có báo giá."}
                    </p>
                  )}
                  {current.adminNote && (
                    <blockquote className="mt-3 border-l-4 border-moss pl-4 text-sm italic text-ink">
                      {current.adminNote}
                    </blockquote>
                  )}
                </div>

                {canAct && (
                  <div className="mt-6 rounded-lg bg-card p-4">
                    {confirming ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-medium text-ink">
                          {ACTION_TEXT[confirming]}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(current.id, confirming)}
                          className="rounded-md bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-50"
                        >
                          {busy ? "Đang xử lý..." : "Xác nhận"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirm(null)}
                          className="rounded-md border border-ink/30 px-4 py-2 text-xs font-medium text-ink"
                        >
                          Không
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {current.status === "quoted" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({ id: current.id, action: "accept" })
                              }
                              className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss-dark"
                            >
                              Đồng ý báo giá
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({
                                  id: current.id,
                                  action: "decline",
                                })
                              }
                              className="rounded-md border border-ink/30 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({ id: current.id, action: "cancel" })
                          }
                          className="text-sm text-ink/75 underline underline-offset-2 hover:text-moss-dark"
                        >
                          Hủy yêu cầu
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="mb-3 text-xs font-semibold text-ink/100">
                    Tiến độ
                  </h3>
                  <Timeline status={current.status} />
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}
