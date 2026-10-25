"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
}

type Filter = "all" | "active" | "locked";

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";
const normalize = (t: string) => t.normalize("NFC").toLowerCase();

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "locked", label: "Đã khóa" },
];

const LOYAL_ORDERS = 4;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers");
      if (res.status === 401) {
        window.location.href = "/admin/login?next=/admin/customers";
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Không tải được danh sách khách hàng");
        return;
      }
      setCustomers(json.data);
      setError("");
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.isActive).length,
      locked: customers.filter((c) => !c.isActive).length,
    }),
    [customers],
  );

  const totalRevenue = useMemo(
    () => customers.reduce((sum, c) => sum + c.totalSpent, 0),
    [customers],
  );

  const maxSpent = useMemo(
    () => Math.max(1, ...customers.map((c) => c.totalSpent)),
    [customers],
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return customers.filter((c) => {
      if (filter === "active" && !c.isActive) return false;
      if (filter === "locked" && c.isActive) return false;
      if (!q) return true;
      return (
        normalize(c.name).includes(q) ||
        normalize(c.email).includes(q) ||
        (c.phone ?? "").includes(q)
      );
    });
  }, [customers, query, filter]);

  async function toggleLock(c: CustomerRow) {
    const action = c.isActive ? "lock" : "unlock";
    const ask = c.isActive
      ? `Khóa tài khoản của ${c.name}? Khách sẽ không đăng nhập và đặt hàng được nữa.`
      : `Mở khóa tài khoản của ${c.name}?`;
    if (!window.confirm(ask)) return;

    setBusyId(c.id);
    try {
      const res = await fetch("/api/admin/customers/" + c.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Không thực hiện được");
        return;
      }
      setError("");
      setCustomers((list) =>
        list.map((x) =>
          x.id === c.id ? { ...x, isActive: json.data.isActive } : x,
        ),
      );
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-moss-dark">
        Quản trị
      </p>
      <h1 className="font-heading text-3xl text-ink sm:text-4xl">
        Sổ khách hàng
      </h1>

      <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-ink text-paper md:grid-cols-4">
        <div className="border-b border-r border-paper/10 px-5 py-4 md:border-b-0">
          <dt className="text-xs uppercase tracking-wider text-paper/60">
            Tổng khách
          </dt>
          <dd className="font-heading text-3xl">{counts.all}</dd>
        </div>
        <div className="border-b border-paper/10 px-5 py-4 md:border-b-0 md:border-r">
          <dt className="text-xs uppercase tracking-wider text-paper/60">
            Đang hoạt động
          </dt>
          <dd className="font-heading text-3xl">{counts.active}</dd>
        </div>
        <div className="border-r border-paper/10 px-5 py-4">
          <dt className="text-xs uppercase tracking-wider text-paper/60">
            Đã khóa
          </dt>
          <dd className="font-heading text-3xl text-ochre">{counts.locked}</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs uppercase tracking-wider text-paper/60">
            Tổng tiền khách đã mua
          </dt>
          <dd className="font-heading text-2xl sm:text-3xl">
            {money(totalRevenue)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại"
          className="w-full rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm text-ink outline-none focus:border-moss lg:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full px-4 py-2 text-sm transition " +
                (filter === f.key
                  ? "bg-moss text-white"
                  : "bg-blush text-ink hover:bg-peach/60")
              }
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm text-moss-dark">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-center text-sm text-ink/50">
          Đang tải danh sách...
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-sm text-ink/50">
          Không có khách hàng nào phù hợp.
        </p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => {
            const initial = c.name.trim().charAt(0).toUpperCase();
            const pct = Math.round((c.totalSpent / maxSpent) * 100);
            const isNew = c.orderCount === 0;
            const isLoyal = c.orderCount >= LOYAL_ORDERS;

            // Màu chỉ để báo trạng thái, không trang trí
            const avatarClass = !c.isActive
              ? "bg-ink/10 text-ink/40"
              : isLoyal
                ? "bg-moss text-white"
                : isNew
                  ? "bg-paper text-ink/50 ring-1 ring-ink/15"
                  : "bg-blush text-moss-dark";

            return (
              <li
                key={c.id}
                className={
                  "flex flex-col rounded-2xl bg-card p-5 ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:shadow-warm " +
                  (c.isActive ? "" : "opacity-60")
                }
              >
                <div className="flex items-start gap-4">
                  <span
                    className={
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-heading text-2xl " +
                      avatarClass
                    }
                  >
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-xl text-ink">
                      {c.name}
                    </p>
                    <p className="truncate text-sm text-ink/60">{c.email}</p>
                    <p className="text-sm text-ink/60">
                      {c.phone ?? "Chưa có số điện thoại"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 min-h-6">
                  {!c.isActive ? (
                    <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-paper">
                      Đã khóa
                    </span>
                  ) : isLoyal ? (
                    <span className="rounded-full bg-ochre/30 px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                      ★ Khách thân thiết
                    </span>
                  ) : isNew ? (
                    <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-semibold text-moss-dark">
                      Mới, chưa có đơn
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">
                      {money(c.totalSpent)}
                    </span>
                    <span className="text-xs text-ink/50">
                      {c.orderCount} đơn
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-moss"
                      style={{ width: pct + "%" }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={"/admin/customers/" + c.id}
                    className="flex-1 rounded-full bg-blush px-4 py-2 text-center text-sm text-ink transition hover:bg-peach/60"
                  >
                    Chi tiết
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => toggleLock(c)}
                    className={
                      "flex-1 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50 " +
                      (c.isActive
                        ? "border border-ink/20 text-ink hover:border-ink"
                        : "bg-moss text-white hover:bg-moss-dark")
                    }
                  >
                    {busyId === c.id
                      ? "Đang xử lý..."
                      : c.isActive
                        ? "Khóa"
                        : "Mở khóa"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
