"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatVND } from "../../../lib/format";

type OrderItem = {
  id: number;
  quantity: number;
  priceAtOrder: string; // Prisma Decimal -> chuỗi
  product: {
    id: number;
    name: string;
    imageUrl: string | null;
  };
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

// Thông tin tài khoản nhận tiền, đọc từ .env (giống trang checkout)
const BANK = {
  name: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "",
};

// Nếu enum status trong schema của bạn dùng giá trị khác thì sửa/thêm ở đây.
// Giá trị lạ sẽ hiện nguyên chữ gốc, không bị lỗi.
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

// Thứ tự các chặng của một đơn bình thường
const FLOW = ["pending", "confirmed", "shipped", "completed"];

// Màu chấm trạng thái
const statusDot: Record<string, string> = {
  pending: "bg-ochre",
  confirmed: "bg-moss",
  shipped: "bg-ink",
  completed: "bg-emerald-600",
  cancelled: "bg-ink/30",
};

function orderTotal(order: Order) {
  return order.orderItems.reduce(
    (sum, item) => sum + Number(item.priceAtOrder) * item.quantity,
    0,
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Đơn chuyển khoản còn chờ khách chuyển tiền
function needsPayment(order: Order) {
  return (
    order.paymentMethod === "bank_transfer" &&
    !order.isPaid &&
    order.status !== "cancelled"
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${statusDot[status] ?? "bg-ink/30"}`}
      />
      {statusLabels[status] ?? status}
    </span>
  );
}

// Nhãn thanh toán: chỉ hiện khi đã trả tiền hoặc đang chờ chuyển khoản
function PaymentBadge({ order }: { order: Order }) {
  if (order.isPaid) {
    return (
      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Đã thanh toán
      </span>
    );
  }
  if (needsPayment(order)) {
    return (
      <span className="inline-block rounded-full bg-ochre/40 px-2.5 py-0.5 text-xs font-semibold text-ink">
        Chờ thanh toán
      </span>
    );
  }
  return null;
}

// Một dòng "nhãn: giá trị" trong khối hướng dẫn chuyển khoản
function PayRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-ink/55">{label}</dt>
      <dd className="break-words text-right font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

// Chi tiết một đơn: dùng cho khung bên phải (máy tính) và phần mở rộng (điện thoại)
function OrderDetail({ order }: { order: Order }) {
  const stepIndex = FLOW.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  const total = orderTotal(order);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
            Đơn hàng
          </p>
          <p className="font-heading text-5xl font-semibold leading-none text-moss-dark">
            #{order.id}
          </p>
          <p className="mt-2 text-sm text-ink/55">
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="rounded-full bg-paper px-3.5 py-1.5">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Các chặng của đơn */}
      {stepIndex >= 0 && (
        <ol className="mt-8 grid grid-cols-4">
          {FLOW.map((step, i) => (
            <li key={step} className="relative flex flex-col items-center">
              {i < FLOW.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-[7px] h-0.5 w-full ${
                    i < stepIndex ? "bg-moss" : "bg-peach/70"
                  }`}
                />
              )}
              <span
                className={`relative z-10 h-4 w-4 rounded-full border-2 ${
                  i <= stepIndex
                    ? "border-moss bg-moss"
                    : "border-peach bg-white"
                }`}
              />
              <span
                className={`mt-2 text-center text-xs ${
                  i === stepIndex ? "font-semibold text-ink" : "text-ink/45"
                }`}
              >
                {statusLabels[step]}
              </span>
            </li>
          ))}
        </ol>
      )}
      {cancelled && (
        <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm text-ink/70">
          Đơn hàng này đã bị hủy.
        </p>
      )}

      {/* Thanh toán */}
      <div className="mt-8 rounded-xl bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
              Thanh toán
            </p>
            <p className="mt-1 text-sm font-medium">
              {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
            </p>
          </div>
          <PaymentBadge order={order} />
        </div>

        {order.isPaid && order.paidAt && (
          <p className="mt-2 text-xs text-ink/55">
            Shop đã nhận tiền lúc{" "}
            {new Date(order.paidAt).toLocaleString("vi-VN")}
          </p>
        )}

        {needsPayment(order) && (
          <div className="mt-3 border-t border-ink/10 pt-3">
            {BANK.account ? (
              <>
                <p className="text-sm text-ink/65">
                  Bạn chuyển khoản theo thông tin dưới đây, nhớ ghi đúng nội
                  dung để shop đối soát được đơn.
                </p>
                <dl className="mt-2">
                  <PayRow label="Ngân hàng" value={BANK.name} />
                  <PayRow label="Số tài khoản" value={BANK.account} />
                  <PayRow label="Chủ tài khoản" value={BANK.holder} />
                  <PayRow label="Số tiền" value={formatVND(total)} />
                  <PayRow label="Nội dung" value={`COMAY ${order.id}`} />
                </dl>
              </>
            ) : (
              <p className="text-sm text-ink/65">
                Vui lòng liên hệ shop để được hướng dẫn chuyển khoản cho đơn
                này.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sản phẩm */}
      <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <Link
              href={`/products/${item.product.id}`}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-blush"
            >
              {item.product.imageUrl && (
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.product.id}`}
                className="line-clamp-2 text-sm font-semibold leading-snug transition-colors hover:text-moss-dark"
              >
                {item.product.name}
              </Link>
              <p className="mt-0.5 text-sm text-ink/55">
                {formatVND(Number(item.priceAtOrder))} × {item.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatVND(Number(item.priceAtOrder) * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {/* Nơi nhận + tổng tiền */}
      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">
            Giao tới
          </p>
          <p className="mt-1 font-medium">
            {order.customerName} · {order.phone}
          </p>
          <p className="whitespace-pre-line text-ink/65">{order.address}</p>
        </div>
        <div className="rounded-2xl bg-ink px-6 py-4 text-paper sm:text-right">
          <p className="text-xs text-paper/65">Tổng cộng</p>
          <p className="font-heading text-3xl font-semibold leading-tight text-white">
            {formatVND(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLg, setIsLg] = useState(false);

  // Màn hình rộng: hiện 2 khung. Màn hình hẹp: mở rộng ngay trong danh sách.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/orders");
        const json = await res.json();

        if (res.ok && json.success) {
          setOrders(json.data);
          return;
        }
        if (res.status === 401) {
          setNeedLogin(true);
        }
        setError(json.message ?? "Có lỗi xảy ra, vui lòng thử lại");
      } catch {
        setError("Không kết nối được máy chủ, vui lòng thử lại");
      }
    }
    load();
  }, []);

  if (needLogin) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-center">
        <h1 className="text-4xl font-semibold">Đơn hàng của tôi</h1>
        <p className="mt-4 text-ink/65">{error}</p>
        <Link
          href="/login?next=/orders"
          className="mt-8 inline-block rounded-xl bg-moss px-8 py-4 font-semibold text-white transition hover:bg-moss-dark"
        >
          Đăng nhập
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-center">
        <p className="text-red-700">{error}</p>
      </main>
    );
  }

  // Đang tải: khung xương thay cho dòng chữ
  if (orders === null) {
    return (
      <main
        className="mx-auto max-w-6xl px-4 pb-24 pt-10"
        aria-busy="true"
        aria-label="Đang tải đơn hàng"
      >
        <div className="h-10 w-72 animate-pulse rounded-lg bg-ink/10" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-ink/10"
              />
            ))}
          </div>
          <div className="hidden h-96 animate-pulse rounded-2xl bg-ink/10 lg:block" />
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-center">
        <h1 className="text-4xl font-semibold">Chưa có đơn nào</h1>
        <p className="mt-4 text-ink/65">
          Khi bạn đặt hàng, đơn sẽ xuất hiện ở đây để theo dõi.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-xl bg-moss px-8 py-4 font-semibold text-white transition hover:bg-moss-dark"
        >
          Bắt đầu mua sắm
        </Link>
      </main>
    );
  }

  // Các tab lọc: chỉ hiện trạng thái đang có đơn
  const presentStatuses = [...FLOW, "cancelled"].filter((s) =>
    orders.some((o) => o.status === s),
  );
  // Trạng thái lạ (không nằm trong danh sách trên) vẫn có tab
  const otherStatuses = Array.from(new Set(orders.map((o) => o.status))).filter(
    (s) => !presentStatuses.includes(s),
  );
  const tabs = [
    { key: "all", label: "Tất cả", count: orders.length },
    ...[...presentStatuses, ...otherStatuses].map((s) => ({
      key: s,
      label: statusLabels[s] ?? s,
      count: orders.filter((o) => o.status === s).length,
    })),
  ];

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // Đơn đang hiện ở khung bên phải (máy tính): đơn được chọn, mặc định là đơn đầu
  const activeOrder =
    filtered.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  function handleSelect(id: number) {
    // Máy tính: luôn chọn. Điện thoại: bấm lần nữa thì thu lại.
    setSelectedId((prev) => (!isLg && prev === id ? null : id));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Đơn hàng của tôi
        </h1>
        <p className="pb-1 text-sm text-ink/55">
          <span className="font-semibold text-ink">{orders.length}</span> đơn
        </p>
      </header>

      {/* Tab lọc theo trạng thái */}
      <nav
        aria-label="Lọc theo trạng thái"
        className="mt-8 flex gap-6 overflow-x-auto border-b border-ink/15"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setFilter(tab.key);
              setSelectedId(null);
            }}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm transition-colors ${
              filter === tab.key
                ? "border-moss font-semibold text-ink"
                : "border-transparent text-ink/55 hover:text-ink"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-ink/45">{tab.count}</span>
          </button>
        ))}
      </nav>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[340px_1fr]">
        {/* Danh sách đơn */}
        <ul className="space-y-3">
          {filtered.map((order) => {
            const isActive = isLg
              ? activeOrder?.id === order.id
              : selectedId === order.id;
            const photos = order.orderItems
              .filter((i) => i.product.imageUrl)
              .slice(0, 3);
            const extra = order.orderItems.length - photos.length;

            return (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(order.id)}
                  aria-expanded={isActive}
                  className={`relative w-full rounded-xl p-4 text-left transition ${
                    isActive ? "bg-white shadow-warm" : "hover:bg-white/60"
                  }`}
                >
                  {/* Vạch nhấn bên trái khi được chọn */}
                  <span
                    aria-hidden
                    className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-moss transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">Đơn #{order.id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm text-ink/55">
                      {shortDate(order.createdAt)} · {order.orderItems.length}{" "}
                      món
                    </p>
                    <PaymentBadge order={order} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center">
                      {photos.map((item, i) => (
                        <span
                          key={item.id}
                          className={`relative h-9 w-9 overflow-hidden rounded-full border-2 border-paper bg-blush ${
                            i > 0 ? "-ml-2.5" : ""
                          }`}
                        >
                          <Image
                            src={item.product.imageUrl as string}
                            alt={item.product.name}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-paper bg-ink text-xs font-semibold text-paper">
                          +{extra}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold tabular-nums text-moss-dark">
                      {formatVND(orderTotal(order))}
                    </p>
                  </div>
                </button>

                {/* Điện thoại: chi tiết mở rộng ngay dưới đơn đang chọn */}
                {!isLg && selectedId === order.id && (
                  <div className="mt-2 rounded-2xl bg-white p-5">
                    <OrderDetail order={order} />
                  </div>
                )}
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="rounded-xl bg-white px-4 py-8 text-center text-sm text-ink/60">
              Không có đơn nào ở trạng thái này.
            </li>
          )}
        </ul>

        {/* Máy tính: khung chi tiết bên phải, dính theo màn hình */}
        {isLg && activeOrder && (
          <section className="sticky top-24 rounded-2xl bg-white p-8">
            <OrderDetail order={activeOrder} />
          </section>
        )}
      </div>
    </main>
  );
}
