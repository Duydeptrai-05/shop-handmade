"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatVND } from "../../../../../../lib/format";

type OrderItem = {
  id: number;
  quantity: number;
  priceAtOrder: string; // Prisma Decimal -> chuỗi
  product: { id: number; name: string };
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
  shippingFee?: string;
  discountAmount?: string;
  shippingDiscount?: string;
  createdAt: string;
  orderItems: OrderItem[];
};

const paymentLabels: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
};

// Quy tắc in: chỉ giữ lại tờ hóa đơn, ẩn Header/Footer và các nút
const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { height: auto !important; background: #fff !important; }
  body * { visibility: hidden !important; }
  #invoice-root { position: static !important; overflow: visible !important; background: #fff !important; }
  #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
  #invoice-sheet {
    position: absolute !important; left: 0; top: 0; width: 100%;
    margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important;
  }
}
`;

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "notfound" | "login" | "error"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/orders");
        const json = await res.json();
        if (cancelled) return;

        if (res.status === 401) {
          setState("login");
          return;
        }
        if (!res.ok || !json.success) {
          setState("error");
          return;
        }

        const found = (json.data as Order[]).find((o) => o.id === orderId);
        if (!found) {
          setState("notfound");
          return;
        }
        setOrder(found);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Che Header/Footer của web khi xem trên màn hình
  const shell = "fixed inset-0 z-[60] overflow-y-auto bg-neutral-100 px-4 py-8";

  if (state !== "ready" || !order) {
    return (
      <div id="invoice-root" className={shell}>
        <div className="mx-auto max-w-md pt-20 text-center">
          {state === "loading" && (
            <p className="text-neutral-600">Đang tải hóa đơn...</p>
          )}
          {state === "login" && (
            <>
              <p className="text-neutral-700">
                Bạn cần đăng nhập quản trị để xem hóa đơn.
              </p>
              <Link
                href={`/admin/login?next=/admin/orders/${params.id}/invoice`}
                className="mt-4 inline-block rounded-lg bg-black px-5 py-2.5 text-white"
              >
                Đăng nhập quản trị
              </Link>
            </>
          )}
          {state === "notfound" && (
            <>
              <p className="text-neutral-700">
                Không tìm thấy đơn hàng #{params.id}.
              </p>
              <Link
                href="/admin/orders"
                className="mt-4 inline-block rounded-lg bg-black px-5 py-2.5 text-white"
              >
                Về danh sách đơn
              </Link>
            </>
          )}
          {state === "error" && (
            <p className="text-red-700">
              Không tải được hóa đơn, vui lòng thử lại.
            </p>
          )}
        </div>
      </div>
    );
  }

  const itemsTotal = order.orderItems.reduce(
    (sum, it) => sum + Number(it.priceAtOrder) * it.quantity,
    0,
  );
  const shipping = Number(order.shippingFee ?? 0);
  const discount = Number(order.discountAmount ?? 0);
  const shippingDiscount = Number(order.shippingDiscount ?? 0);
  const total = Math.max(
    0,
    itemsTotal + shipping - discount - shippingDiscount,
  );
  const created = new Date(order.createdAt);
  const cancelled = order.status === "cancelled";

  return (
    <div id="invoice-root" className={shell}>
      <style>{PRINT_CSS}</style>

      {/* Thanh công cụ (không in) */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3">
        <Link
          href="/admin/orders"
          className="text-sm text-neutral-600 hover:text-black"
        >
          ← Về danh sách đơn
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-black px-6 py-2 text-sm font-medium text-white shadow transition hover:bg-neutral-800"
        >
          🖨 In hóa đơn
        </button>
      </div>

      {/* Tờ hóa đơn */}
      <div
        id="invoice-sheet"
        className="relative mx-auto max-w-[210mm] bg-white p-8 text-black shadow-md sm:p-12"
      >
        {cancelled && (
          <p
            aria-hidden
            className="pointer-events-none absolute right-10 top-40 -rotate-12 rounded-md border-4 border-double border-red-600 px-4 py-1 text-2xl font-bold uppercase tracking-widest text-red-600 opacity-70"
          >
            Đã hủy
          </p>
        )}

        {/* Đầu hóa đơn */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-5">
          <div>
            <p className="font-heading text-2xl font-semibold">
              Cỏ May Handmade
            </p>
            <p className="mt-0.5 text-sm text-neutral-600">
              Đồ thủ công làm tay từng món
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-3xl font-semibold uppercase tracking-wide">
              Hóa đơn
            </p>
            <p className="mt-0.5 text-sm">
              Số: <span className="font-semibold">#{order.id}</span>
            </p>
            <p className="text-sm text-neutral-600">
              {created.toLocaleDateString("vi-VN")}{" "}
              {created.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </header>

        {/* Người nhận + thanh toán */}
        <section className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Người nhận
            </p>
            <p className="mt-1 text-base font-medium">{order.customerName}</p>
            <p>{order.phone}</p>
            <p className="mt-1 whitespace-pre-line text-neutral-700">
              {order.address}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Thanh toán
            </p>
            <p className="mt-1">
              {paymentLabels[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <p className="mt-1 font-medium">
              {order.isPaid
                ? `Đã thanh toán${
                    order.paidAt
                      ? ` lúc ${new Date(order.paidAt).toLocaleString("vi-VN")}`
                      : ""
                  }`
                : "Chưa thanh toán"}
            </p>
          </div>
        </section>

        {/* Bảng sản phẩm */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-black text-left text-xs uppercase tracking-wider">
              <th className="w-10 py-2">STT</th>
              <th className="py-2">Sản phẩm</th>
              <th className="w-12 py-2 text-right">SL</th>
              <th className="w-28 py-2 text-right">Đơn giá</th>
              <th className="w-32 py-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.orderItems.map((it, i) => (
              <tr key={it.id} className="border-b border-neutral-300 align-top">
                <td className="py-2.5">{i + 1}</td>
                <td className="py-2.5 pr-3">{it.product.name}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {it.quantity}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatVND(Number(it.priceAtOrder))}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatVND(Number(it.priceAtOrder) * it.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tổng kết tiền */}
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-600">Tiền hàng</dt>
            <dd className="tabular-nums">{formatVND(itemsTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-600">Phí vận chuyển</dt>
            <dd className="tabular-nums">{formatVND(shipping)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Giảm giá đơn hàng</dt>
              <dd className="tabular-nums">-{formatVND(discount)}</dd>
            </div>
          )}
          {shippingDiscount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-600">Giảm phí vận chuyển</dt>
              <dd className="tabular-nums">-{formatVND(shippingDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t-2 border-black pt-2 text-base font-semibold">
            <dt>Tổng cộng</dt>
            <dd className="tabular-nums">{formatVND(total)}</dd>
          </div>
        </dl>

        {/* Chân hóa đơn */}
        <footer className="mt-10 flex items-end justify-between gap-6 border-t border-neutral-300 pt-5 text-sm">
          <p className="text-neutral-600">
            Cảm ơn bạn đã ủng hộ Cỏ May Handmade ♥
          </p>
          <div className="w-40 text-center text-neutral-600">
            <p>Người lập phiếu</p>
            <p className="mt-12 border-t border-neutral-400 pt-1 text-xs">
              (Ký, ghi rõ họ tên)
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
