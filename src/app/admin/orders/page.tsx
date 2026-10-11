"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { formatVND } from "../../../../lib/format";

type OrderItem = {
  id: number;
  quantity: number;
  priceAtOrder: string; // Prisma Decimal -> chuỗi
  product: { id: number; name: string; imageUrl: string | null };
};

type Order = {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  paymentMethod: string; // "cod" | "bank_transfer"
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
  orderItems: OrderItem[];
};

const statusLabels: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const paymentLabels: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
};

// "unpaid" không phải trạng thái đơn mà là nhãn lọc theo thanh toán
const filters = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chờ nhận tiền" },
  { value: "pending", label: statusLabels.pending },
  { value: "confirmed", label: statusLabels.confirmed },
  { value: "shipped", label: statusLabels.shipped },
  { value: "completed", label: statusLabels.completed },
  { value: "cancelled", label: statusLabels.cancelled },
];

// Màu con dấu theo trạng thái
const stampStyles: Record<string, string> = {
  pending: "border-ochre text-ochre",
  confirmed: "border-sky-700 text-sky-700",
  shipped: "border-indigo-700 text-indigo-700",
  completed: "border-moss text-moss",
  cancelled: "border-red-700 text-red-700",
};

// Các chặng của đường chỉ khâu
const STEPS = ["pending", "confirmed", "shipped", "completed"];
const STEP_LABELS = ["Chờ", "Xác nhận", "Giao hàng", "Hoàn tất"];

// Nút hiển thị theo trạng thái hiện tại. Phải khớp ALLOWED_TRANSITIONS ở API
// (API vẫn là nơi chốt luật, đây chỉ để giao diện không hiện nút vô ích).
const actions: Record<
  string,
  { to: string; label: string; danger?: boolean }[]
> = {
  pending: [
    { to: "confirmed", label: "Xác nhận đơn" },
    { to: "cancelled", label: "Hủy đơn", danger: true },
  ],
  confirmed: [
    { to: "shipped", label: "Giao hàng" },
    { to: "cancelled", label: "Hủy đơn", danger: true },
  ],
  shipped: [{ to: "completed", label: "Hoàn thành" }],
  completed: [],
  cancelled: [],
};

function orderTotal(order: Order) {
  return order.orderItems.reduce(
    (sum, item) => sum + Number(item.priceAtOrder) * item.quantity,
    0,
  );
}

// Đơn chuyển khoản còn chờ Admin xác nhận đã nhận tiền
function needsPayment(order: Order) {
  return (
    order.paymentMethod === "bank_transfer" &&
    !order.isPaid &&
    order.status !== "cancelled"
  );
}

// Đường chỉ khâu thể hiện tiến trình đơn; đơn hủy thì "chỉ bị cắt"
function Stitches({ status }: { status: string }) {
  const current = STEPS.indexOf(status);
  const cancelled = status === "cancelled";

  return (
    <div className="mt-4">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done = !cancelled && i <= current;
          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <motion.span
                initial={false}
                animate={{ scale: done && i === current ? 1.3 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                  done ? "border-moss bg-moss" : "border-ink/25 bg-card"
                }`}
              />
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-1 h-0 flex-1 border-t-2 border-dashed ${
                    !cancelled && i < current ? "border-moss" : "border-ink/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-ink/45">
        {STEP_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  // Tải toàn bộ đơn một lần; lọc theo trạng thái và tìm kiếm làm ở phía client
  // để các nhãn có số đếm chính xác và đổi bộ lọc không phải chờ
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setOrders(null);
      setError(null);
      setActionError(null);
      try {
        const res = await fetch("/api/admin/orders");
        const json = await res.json();
        if (cancelled) return;

        if (res.ok && json.success) {
          setOrders(json.data);
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

  // Thay một đơn trong danh sách bằng bản mới từ server
  function replaceOrder(updated: Order) {
    setOrders((prev) =>
      prev === null
        ? prev
        : prev.map((o) => (o.id === updated.id ? updated : o)),
    );
  }

  async function changeStatus(order: Order, status: string) {
    if (
      status === "cancelled" &&
      !window.confirm(`Hủy đơn #${order.id}? Hàng sẽ được hoàn lại kho.`)
    ) {
      return;
    }

    setBusyId(order.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        replaceOrder(json.data);
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

  // Admin xác nhận đã nhận được tiền chuyển khoản của đơn
  async function confirmPayment(order: Order) {
    if (
      !window.confirm(
        `Xác nhận đã nhận đủ ${formatVND(orderTotal(order))} cho đơn #${order.id}? Thao tác này không hoàn tác được.`,
      )
    ) {
      return;
    }

    setBusyId(order.id);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payment`, {
        method: "PATCH",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        replaceOrder(json.data);
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

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Số đơn theo từng trạng thái (và số đơn chờ nhận tiền) cho các nhãn lọc
  const counts = useMemo(() => {
    const result: Record<string, number> = {
      all: orders?.length ?? 0,
      unpaid: 0,
    };
    for (const o of orders ?? []) {
      result[o.status] = (result[o.status] ?? 0) + 1;
      if (needsPayment(o)) result.unpaid += 1;
    }
    return result;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "");
    return (orders ?? []).filter((o) => {
      if (filter === "unpaid") {
        if (!needsPayment(o)) return false;
      } else if (filter !== "all" && o.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q)
      );
    });
  }, [orders, filter, search]);

  if (needLogin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="font-heading text-3xl">Quản lý đơn hàng</h1>
        <p className="mt-3 opacity-70">{error}</p>
        <Link
          href="/admin/login?next=/admin/orders"
          className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-paper"
        >
          Đăng nhập quản trị
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Tiêu đề + tìm kiếm */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Mỗi đơn là một phiếu, xử lý xong thì đóng dấu
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Mã đơn, tên, số điện thoại..."
            className="w-64 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-ochre/30"
          />
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm transition hover:bg-ink hover:text-paper"
            aria-label="Tải lại danh sách đơn"
          >
            ↻ Tải lại
          </button>
        </div>
      </motion.div>

      {/* Nhãn lọc kèm số đơn */}
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value] ?? 0;
          const needsAttention =
            (f.value === "pending" || f.value === "unpaid") && count > 0;
          return (
            <motion.button
              key={f.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
                active
                  ? "border-ink bg-ink text-paper shadow"
                  : "border-ink/20 hover:bg-card"
              }`}
            >
              {f.label}
              <span
                className={`relative flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  active
                    ? "bg-paper/20 text-paper"
                    : needsAttention
                      ? "bg-ochre text-paper"
                      : "bg-ink/10 text-ink/70"
                }`}
              >
                {needsAttention && !active && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-ochre/50" />
                )}
                <span className="relative">{orders ? count : "·"}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {error && <p className="mt-8 text-center text-red-700">{error}</p>}

      {/* Khung chờ khi đang tải */}
      {!error && orders === null && (
        <ul className="mt-6 space-y-5">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-ink/10 bg-card"
            />
          ))}
        </ul>
      )}

      {orders !== null && visible.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/20 py-16 text-center">
          <p className="text-4xl">🧵</p>
          <p className="mt-3 text-ink/70">
            {search
              ? "Không tìm thấy phiếu đơn nào khớp."
              : "Không có đơn hàng nào ở mục này."}
          </p>
        </div>
      )}

      {orders !== null && visible.length > 0 && (
        <ul className="mt-6 space-y-5">
          <AnimatePresence mode="popLayout" initial>
            {visible.map((order, index) => {
              const total = orderTotal(order);
              const unpaid = needsPayment(order);
              // Đơn chuyển khoản chưa nhận tiền: chỉ được hủy (khớp luật ở API)
              const baseActions = actions[order.status] ?? [];
              const orderActions = unpaid
                ? baseActions.filter((a) => a.to === "cancelled")
                : baseActions;
              const isOpen = expanded.has(order.id);
              const created = new Date(order.createdAt);

              return (
                <motion.li
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.45,
                    delay: Math.min(index, 6) * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative"
                >
                  <div
                    className={`flex flex-col rounded-2xl border border-ink/10 bg-card shadow-sm transition-shadow hover:shadow-md md:flex-row ${
                      order.status === "cancelled" ? "opacity-80" : ""
                    }`}
                  >
                    {/* Hai nửa vòng tròn khuyết ở đường xé phiếu */}
                    <span
                      aria-hidden
                      className="absolute -top-2.5 left-[calc(10rem-10px)] z-10 hidden h-5 w-5 rounded-full bg-paper md:block"
                    />
                    <span
                      aria-hidden
                      className="absolute -bottom-2.5 left-[calc(10rem-10px)] z-10 hidden h-5 w-5 rounded-full bg-paper md:block"
                    />

                    {/* Cuống phiếu */}
                    <div className="flex items-center justify-between gap-2 border-b border-dashed border-ink/25 px-5 py-3 md:w-40 md:shrink-0 md:flex-col md:items-start md:justify-center md:gap-1 md:border-b-0 md:border-r md:py-5">
                      <div>
                        <p className="text-xs text-ink/50">Mã đơn</p>
                        <p className="font-heading text-3xl font-semibold leading-tight">
                          #{order.id}
                        </p>
                      </div>
                      <div className="text-right text-xs text-ink/60 md:text-left">
                        <p>{created.toLocaleDateString("vi-VN")}</p>
                        <p>
                          {created.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Thân phiếu */}
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-medium">
                            {order.customerName}
                          </p>
                          <p className="text-sm text-ink/60">{order.phone}</p>
                        </div>

                        {/* Con dấu trạng thái: đóng xuống mỗi khi đổi trạng thái */}
                        <motion.span
                          key={order.status}
                          initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
                          animate={{ scale: 1, opacity: 0.92, rotate: -6 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 16,
                          }}
                          className={`inline-block shrink-0 select-none rounded-md border-4 border-double px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                            stampStyles[order.status] ?? "border-ink text-ink"
                          }`}
                        >
                          {statusLabels[order.status] ?? order.status}
                        </motion.span>
                      </div>

                      <Stitches status={order.status} />

                      {/* Thanh toán */}
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                        <span className="text-ink/60">
                          {paymentLabels[order.paymentMethod] ??
                            order.paymentMethod}
                        </span>
                        {order.isPaid && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            Đã nhận tiền
                            {order.paidAt &&
                              ` · ${new Date(order.paidAt).toLocaleString("vi-VN")}`}
                          </span>
                        )}
                        {unpaid && (
                          <span className="rounded-full bg-ochre/40 px-2.5 py-0.5 text-xs font-semibold text-ink">
                            Chờ nhận tiền
                          </span>
                        )}
                      </div>

                      {/* Tóm tắt sản phẩm + tổng tiền */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(order.id)}
                          aria-expanded={isOpen}
                          className="group flex items-center gap-3 text-left"
                        >
                          <span className="flex -space-x-2">
                            {order.orderItems.slice(0, 4).map((item) => (
                              <span
                                key={item.id}
                                className="relative h-9 w-9 overflow-hidden rounded-full bg-paper ring-2 ring-card"
                              >
                                {item.product.imageUrl && (
                                  <Image
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    fill
                                    sizes="36px"
                                    className="object-cover"
                                  />
                                )}
                              </span>
                            ))}
                            {order.orderItems.length > 4 && (
                              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-xs ring-2 ring-card">
                                +{order.orderItems.length - 4}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-ink/70 group-hover:text-ink">
                            {order.orderItems.length} sản phẩm{" "}
                            <span
                              className={`inline-block transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            >
                              ▾
                            </span>
                          </span>
                        </button>

                        <p className="text-lg font-semibold">
                          {formatVND(total)}
                        </p>
                      </div>

                      {/* Chi tiết: địa chỉ + danh sách sản phẩm */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 border-t border-dashed border-ink/20 pt-4">
                              <p className="whitespace-pre-line text-sm text-ink/70">
                                📍 {order.address}
                              </p>

                              <ul className="mt-4 space-y-3">
                                {order.orderItems.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-center gap-3"
                                  >
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper">
                                      {item.product.imageUrl && (
                                        <Image
                                          src={item.product.imageUrl}
                                          alt={item.product.name}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                        />
                                      )}
                                    </div>
                                    <p className="min-w-0 flex-1 truncate text-sm">
                                      {item.product.name}
                                      <span className="opacity-70">
                                        {" "}
                                        × {item.quantity}
                                      </span>
                                    </p>
                                    <p className="shrink-0 text-sm">
                                      {formatVND(
                                        Number(item.priceAtOrder) *
                                          item.quantity,
                                      )}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Nút xử lý */}
                      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 pt-4">
                        {unpaid ? (
                          <span className="mr-auto text-sm text-ink/55">
                            Chờ khách chuyển khoản, xác nhận khi tiền đã về tài
                            khoản
                          </span>
                        ) : (
                          orderActions.length === 0 && (
                            <span className="mr-auto text-sm text-ink/50">
                              ✓ Đơn đã kết thúc
                            </span>
                          )
                        )}

                        {unpaid && (
                          <motion.button
                            type="button"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={busyId === order.id}
                            onClick={() => confirmPayment(order)}
                            className="rounded-full bg-ochre px-5 py-2 text-sm font-semibold text-ink shadow transition hover:shadow-md disabled:opacity-50"
                          >
                            {busyId === order.id
                              ? "Đang xử lý..."
                              : "Xác nhận đã nhận tiền"}
                          </motion.button>
                        )}

                        {orderActions.map((a) => (
                          <motion.button
                            key={a.to}
                            type="button"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={busyId === order.id}
                            onClick={() => changeStatus(order, a.to)}
                            className={`rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-50 ${
                              a.danger
                                ? "border border-red-700 text-red-700 hover:bg-red-700 hover:text-white"
                                : "bg-ink text-paper shadow hover:shadow-md"
                            }`}
                          >
                            {busyId === order.id ? "Đang xử lý..." : a.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </main>
  );
}
