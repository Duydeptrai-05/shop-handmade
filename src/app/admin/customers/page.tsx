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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-moss-dark">
            Quản trị
          </p>
          <h1 className="font-heading text-3xl text-ink">Sổ khách hàng</h1>
        </div>
        <p className="text-sm text-ink/60">
          {counts.all} khách, trong đó {counts.locked} tài khoản đang bị khóa
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại"
          className="w-full rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm text-ink outline-none focus:border-moss md:max-w-md"
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
                  ? "bg-ink text-paper"
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

      <div className="mt-6 overflow-hidden rounded-3xl bg-card shadow-warm">
        <div className="hidden grid-cols-[2.5fr_0.8fr_1.2fr_1fr_1.3fr] gap-4 border-b border-ink/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ink/50 md:grid">
          <span>Khách hàng</span>
          <span>Số đơn</span>
          <span>Tổng đã mua</span>
          <span>Trạng thái</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">
            Đang tải danh sách...
          </p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">
            Không có khách hàng nào phù hợp.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {visible.map((c) => (
              <li
                key={c.id}
                className="grid gap-3 px-6 py-4 md:grid-cols-[2.5fr_0.8fr_1.2fr_1fr_1.3fr] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-lg " +
                      (c.isActive
                        ? "bg-blush text-moss-dark"
                        : "bg-ink/10 text-ink/40")
                    }
                  >
                    {c.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{c.name}</p>
                    <p className="truncate text-sm text-ink/60">{c.email}</p>
                    <p className="text-sm text-ink/60">
                      {c.phone ?? "Chưa có số điện thoại"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-ink">
                  <span className="text-ink/50 md:hidden">Số đơn: </span>
                  {c.orderCount}
                </p>

                <p className="text-sm font-medium text-ink">
                  <span className="font-normal text-ink/50 md:hidden">
                    Tổng đã mua:{" "}
                  </span>
                  {money(c.totalSpent)}
                </p>

                <div>
                  <span
                    className={
                      "inline-block rounded-full px-3 py-1 text-xs font-medium " +
                      (c.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-ochre/30 text-ink")
                    }
                  >
                    {c.isActive ? "Hoạt động" : "Đã khóa"}
                  </span>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <Link
                    href={"/admin/customers/" + c.id}
                    className="rounded-full border border-ink/20 px-4 py-1.5 text-sm text-ink transition hover:border-ink"
                  >
                    Chi tiết
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => toggleLock(c)}
                    className={
                      "rounded-full px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 " +
                      (c.isActive
                        ? "bg-ink text-paper hover:bg-ink/80"
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
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
