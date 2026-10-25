"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface OrderLine {
  name: string;
  quantity: number;
  price: number;
}

interface CustomerOrder {
  id: number;
  status: string;
  paymentMethod: string;
  isPaid: boolean;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  items: OrderLine[];
}

interface CustomerDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  reviewCount: number;
  orderCount: number;
  totalSpent: number;
  orders: CustomerOrder[];
}

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-ochre",
  confirmed: "bg-peach",
  shipped: "bg-moss",
  completed: "bg-emerald-500",
  cancelled: "bg-ink/30",
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers/" + id);
      if (res.status === 401) {
        window.location.href = "/admin/login?next=/admin/customers/" + id;
        return;
      }
      if (res.status === 404 || res.status === 400) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Không tải được thông tin khách hàng");
        return;
      }
      setCustomer(json.data);
      setError("");
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: "lock" | "unlock" | "reset_password") {
    if (!customer) return;

    const ask =
      action === "lock"
        ? `Khóa tài khoản của ${customer.name}? Khách sẽ không đăng nhập và đặt hàng được nữa.`
        : action === "unlock"
          ? `Mở khóa tài khoản của ${customer.name}?`
          : `Đặt lại mật khẩu cho ${customer.name}? Mật khẩu cũ sẽ không dùng được nữa.`;
    if (!window.confirm(ask)) return;

    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const res = await fetch("/api/admin/customers/" + customer.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "Không thực hiện được");
        return;
      }
      if (action === "reset_password") {
        setTempPassword(json.data.tempPassword);
      } else {
        setTempPassword("");
        setCustomer({ ...customer, isActive: json.data.isActive });
      }
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink/50">
        Đang tải thông tin khách hàng...
      </main>
    );
  }

  if (notFound || !customer) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="font-heading text-2xl text-ink">
          {notFound ? "Không tìm thấy khách hàng" : "Có lỗi xảy ra"}
        </p>
        {error && <p className="mt-2 text-sm text-moss-dark">{error}</p>}
        <Link
          href="/admin/customers"
          className="mt-6 inline-block rounded-full bg-ink px-5 py-2 text-sm text-paper"
        >
          Về sổ khách hàng
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/admin/customers"
        className="text-sm text-ink/60 transition hover:text-ink"
      >
        ← Sổ khách hàng
      </Link>

      {/* Dải hồ sơ */}
      <section className="mt-4 overflow-hidden rounded-3xl bg-ink text-paper shadow-warm-lg">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-peach font-heading text-3xl text-ink">
              {customer.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-2xl sm:text-3xl">
                {customer.name}
              </h1>
              <p className="truncate text-sm text-paper/70">{customer.email}</p>
              <p className="text-sm text-paper/70">
                {customer.phone ?? "Chưa có số điện thoại"}
              </p>
            </div>
          </div>
          <span
            className={
              "w-fit -rotate-2 rounded-md border-2 border-dashed px-3 py-1 text-xs font-semibold uppercase tracking-widest " +
              (customer.isActive
                ? "border-emerald-300 text-emerald-300"
                : "border-ochre text-ochre")
            }
          >
            {customer.isActive ? "Đang hoạt động" : "Đã bị khóa"}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-paper/15 bg-paper/5 px-6 py-4 sm:px-8">
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(customer.isActive ? "lock" : "unlock")}
            className={
              "rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-50 " +
              (customer.isActive
                ? "bg-ochre text-ink hover:bg-ochre/80"
                : "bg-moss text-white hover:bg-moss-dark")
            }
          >
            {customer.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction("reset_password")}
            className="rounded-full border border-paper/40 px-5 py-2 text-sm text-paper transition hover:border-paper disabled:opacity-50"
          >
            Đặt lại mật khẩu
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm text-moss-dark">
          {error}
        </p>
      )}

      {tempPassword && (
        <section className="mt-4 rounded-3xl border-2 border-dashed border-ochre bg-ochre/15 p-5">
          <p className="text-sm font-medium text-ink">
            Mật khẩu tạm của {customer.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded-xl bg-white px-4 py-2 text-lg tracking-widest text-ink">
              {tempPassword}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="rounded-full bg-ink px-4 py-2 text-sm text-paper"
            >
              {copied ? "Đã chép" : "Chép"}
            </button>
          </div>
          <p className="mt-3 text-xs text-ink/70">
            Mật khẩu này chỉ hiện một lần, tải lại trang là mất. Hãy gửi cho
            khách ngay và nhắc khách đổi lại sau khi đăng nhập.
          </p>
        </section>
      )}

      {/* Dải số liệu */}
      <section className="mt-6 grid grid-cols-3 divide-x divide-ink/10 rounded-3xl bg-card py-5 shadow-warm">
        <div className="px-4 text-center">
          <p className="font-heading text-2xl text-ink">
            {customer.orderCount}
          </p>
          <p className="text-xs text-ink/60">Đơn (chưa hủy)</p>
        </div>
        <div className="px-4 text-center">
          <p className="font-heading text-2xl text-ink">
            {money(customer.totalSpent)}
          </p>
          <p className="text-xs text-ink/60">Tổng đã mua</p>
        </div>
        <div className="px-4 text-center">
          <p className="font-heading text-2xl text-ink">
            {customer.reviewCount}
          </p>
          <p className="text-xs text-ink/60">Đánh giá đã viết</p>
        </div>
      </section>

      {/* Lịch sử đơn */}
      <section className="mt-8">
        <h2 className="font-heading text-xl text-ink">Lịch sử đơn hàng</h2>

        {customer.orders.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-blush px-4 py-6 text-center text-sm text-ink/60">
            Khách này chưa đặt đơn nào.
          </p>
        ) : (
          <ol className="mt-5 ml-2 border-l-2 border-dashed border-ink/20">
            {customer.orders.map((o) => (
              <li key={o.id} className="relative pb-5 pl-6">
                <span
                  className={
                    "absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 border-paper " +
                    (STATUS_DOT[o.status] ?? "bg-ink/30")
                  }
                />
                <details className="group rounded-2xl bg-card shadow-warm">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <div>
                      <p className="font-medium text-ink">Mã đơn #{o.id}</p>
                      <p className="text-xs text-ink/60">
                        {new Date(o.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-blush px-3 py-1 text-xs text-ink">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      <span className="font-medium text-ink">
                        {money(o.total)}
                      </span>
                      <span className="text-ink/40 transition group-open:rotate-180">
                        ▾
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-ink/10 px-5 py-4 text-sm">
                    <ul className="space-y-1">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="text-ink">
                            {it.name}{" "}
                            <span className="text-ink/50">× {it.quantity}</span>
                          </span>
                          <span className="text-ink/70">
                            {money(it.price * it.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-0.5 text-ink/70">
                      <p>
                        Giao tới: {o.customerName}, {o.phone}
                      </p>
                      <p>{o.address}</p>
                      <p>
                        Thanh toán:{" "}
                        {o.paymentMethod === "bank_transfer"
                          ? "Chuyển khoản"
                          : "Khi nhận hàng (COD)"}
                        {o.paymentMethod === "bank_transfer" &&
                          (o.isPaid ? " - đã nhận tiền" : " - chưa nhận tiền")}
                      </p>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
