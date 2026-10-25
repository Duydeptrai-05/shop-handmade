"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "../../../lib/cart-context";
import { formatVND } from "../../../lib/format";
import { SHIPPING_FEE } from "../../../lib/shipping"; // VOUCHER
import {
  createOrderSchema,
  type PaymentMethodValue,
} from "../../../lib/validation/order";

type FieldName =
  | "customerName"
  | "phone"
  | "address"
  | "paymentMethod"
  | "items"
  | "discountCode" // VOUCHER
  | "shippingCode"; // VOUCHER
type FieldErrors = Partial<Record<FieldName, string[]>>;

// VOUCHER: kết quả xem trước tiền từ /api/orders/preview
type Preview = {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  shippingDiscount: number;
  total: number;
  discountVoucher: { code: string; description: string | null } | null;
  shippingVoucher: { code: string; description: string | null } | null;
  errors: { discountCode?: string; shippingCode?: string };
};

// Thông tin tài khoản nhận tiền, đọc từ .env (NEXT_PUBLIC_ để dùng được ở client)
const BANK = {
  id: process.env.NEXT_PUBLIC_BANK_ID ?? "",
  name: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "",
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "",
};

// Ô nhập nền trắng bo nhẹ; có lỗi thì viền đỏ
function fieldClass(hasError: boolean) {
  return `mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 ${
    hasError
      ? "border-red-600 ring-2 ring-red-600/15"
      : "border-ink/15 focus:border-moss focus:ring-2 focus:ring-moss/20"
  }`;
}

const labelClass = "text-sm font-medium text-ink/75";

// Một chặng của form: vòng tròn đánh số + đường dọc nối xuống chặng sau
function Step({
  no,
  title,
  last = false,
  children,
}: {
  no: number;
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[2.5rem_1fr] gap-x-4">
      <div className="flex flex-col items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-heading text-lg font-semibold text-paper">
          {no}
        </span>
        {!last && <span aria-hidden className="mt-2 w-px flex-1 bg-peach" />}
      </div>
      <div className={last ? "pb-2" : "pb-10"}>
        <h2 className="pt-1.5 font-heading text-2xl font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

// VOUCHER: một ô nhập mã dạng "vé" viền đứt
function VoucherField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  appliedCode,
  amount,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  appliedCode?: string;
  amount: number;
}) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed bg-white px-4 py-3.5 transition ${
        error ? "border-red-400" : appliedCode ? "border-moss" : "border-peach"
      }`}
    >
      <label htmlFor={id} className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-ink/50">{hint}</span>
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="Nhập mã (không bắt buộc)"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 w-full bg-transparent font-mono text-base tracking-wider text-ink outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-ink/35"
      />
      {error ? (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      ) : appliedCode ? (
        <p className="mt-2 text-xs font-medium text-moss-dark">
          Đã áp dụng {appliedCode}: giảm {formatVND(amount)}
        </p>
      ) : null}
    </div>
  );
}

// VOUCHER: một dòng trong khối tổng tiền
function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={accent ? "text-moss-dark" : "text-ink/65"}>{label}</dt>
      <dd
        className={`tabular-nums ${accent ? "font-medium text-moss-dark" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// Một lựa chọn phương thức thanh toán (dạng radio)
function PaymentOption({
  selected,
  title,
  desc,
  onSelect,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-xl border-2 bg-white px-4 py-4 text-left transition ${
        selected ? "border-moss" : "border-ink/15 hover:border-peach"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-moss" : "border-ink/30"
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-moss" />}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink/60">{desc}</span>
      </span>
    </button>
  );
}

// Nút sao chép nhanh một giá trị
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Trình duyệt không cho sao chép thì bỏ qua, khách vẫn tự chép tay được
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Sao chép ${label}`}
      className="shrink-0 rounded-md bg-paper/10 px-2.5 py-1 text-xs font-medium text-paper transition hover:bg-paper/20"
    >
      {copied ? "Đã chép" : "Chép"}
    </button>
  );
}

// Một dòng thông tin trong khối chuyển khoản
function TransferRow({
  label,
  value,
  copyText,
  strong = false,
}: {
  label: string;
  value: string;
  copyText?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-paper/10 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs text-paper/55">{label}</p>
        <p
          className={`mt-0.5 break-words tabular-nums ${
            strong ? "font-heading text-2xl font-semibold" : "font-medium"
          }`}
        >
          {value}
        </p>
      </div>
      {copyText && <CopyButton text={copyText} label={label} />}
    </div>
  );
}

// Khối hướng dẫn chuyển khoản ở màn đặt hàng thành công
function TransferPanel({
  orderId,
  amount,
}: {
  orderId: number;
  amount: number;
}) {
  const [qrFailed, setQrFailed] = useState(false);

  const content = `COMAY ${orderId}`;
  const total = Math.round(amount);
  const configured = BANK.id && BANK.account && BANK.holder;

  const qrUrl = configured
    ? `https://img.vietqr.io/image/${BANK.id}-${BANK.account}-compact2.png` +
      `?amount=${total}&addInfo=${encodeURIComponent(content)}` +
      `&accountName=${encodeURIComponent(BANK.holder)}`
    : "";

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-ink text-paper">
      <div className="border-b border-paper/10 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-peach">
          Chuyển khoản để hoàn tất
        </p>
        <p className="mt-1 text-sm text-paper/70">
          Quét mã hoặc chuyển theo thông tin bên dưới, nhớ ghi đúng nội dung để
          shop đối soát được đơn.
        </p>
      </div>

      {configured ? (
        <div className="grid gap-6 p-6 sm:grid-cols-[13rem_1fr]">
          <div className="mx-auto w-full max-w-[13rem]">
            {qrUrl && !qrFailed ? (
              <div className="rounded-xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`Mã QR chuyển khoản cho đơn #${orderId}`}
                  className="h-auto w-full"
                  onError={() => setQrFailed(true)}
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-paper/25 p-4 text-center text-xs text-paper/60">
                Không tải được mã QR, bạn chuyển theo thông tin bên cạnh nhé.
              </div>
            )}
          </div>

          <div>
            <TransferRow label="Ngân hàng" value={BANK.name || BANK.id} />
            <TransferRow
              label="Số tài khoản"
              value={BANK.account}
              copyText={BANK.account}
            />
            <TransferRow label="Chủ tài khoản" value={BANK.holder} />
            <TransferRow
              label="Số tiền"
              value={formatVND(total)}
              copyText={String(total)}
              strong
            />
            <TransferRow
              label="Nội dung chuyển khoản"
              value={content}
              copyText={content}
              strong
            />
          </div>
        </div>
      ) : (
        <p className="p-6 text-sm text-paper/70">
          Shop chưa cấu hình thông tin tài khoản. Bạn vui lòng liên hệ shop để
          được hướng dẫn chuyển khoản cho đơn #{orderId}.
        </p>
      )}
    </section>
  );
}

export default function CheckoutPage() {
  const { items, clearCart, totalItems, totalPrice } = useCart();

  const [mounted, setMounted] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>("cod");
  const [discountCode, setDiscountCode] = useState(""); // VOUCHER
  const [shippingCode, setShippingCode] = useState(""); // VOUCHER
  const [preview, setPreview] = useState<Preview | null>(null); // VOUCHER
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  // Số tiền khách phải trả của đơn vừa đặt (lấy từ server), vì giỏ đã bị xóa sau khi đặt
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // VOUCHER: xem trước tiền mỗi khi giỏ hoặc mã thay đổi (chờ 0,4 giây sau khi ngừng gõ)
  const itemsKey = items.map((i) => `${i.id}:${i.quantity}`).join(",");
  useEffect(() => {
    if (!mounted || items.length === 0 || orderId !== null) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/orders/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.id,
              quantity: i.quantity,
            })),
            discountCode: discountCode.trim() || null,
            shippingCode: shippingCode.trim() || null,
          }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setPreview(json.data as Preview);
        } else {
          setPreview(null); // chưa đăng nhập hoặc lỗi: dùng số tạm tính ở client
        }
      } catch {
        // Bị hủy do gõ tiếp hoặc mất kết nối: bỏ qua
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, itemsKey, discountCode, shippingCode, orderId]);

  // VOUCHER: số tiền hiển thị (ưu tiên số server tính, chưa có thì tạm tính)
  const subtotal = preview?.subtotal ?? totalPrice;
  const shippingFee = preview?.shippingFee ?? SHIPPING_FEE;
  const discountAmount = preview?.discountAmount ?? 0;
  const shippingDiscount = preview?.shippingDiscount ?? 0;
  const payable =
    preview?.total ??
    totalPrice - discountAmount + shippingFee - shippingDiscount;

  const discountError = discountCode.trim()
    ? (preview?.errors?.discountCode ?? fieldErrors.discountCode?.[0])
    : undefined;
  const shippingError = shippingCode.trim()
    ? (preview?.errors?.shippingCode ?? fieldErrors.shippingCode?.[0])
    : undefined;

  function changeDiscountCode(v: string) {
    setDiscountCode(v);
    setFieldErrors((prev) => ({ ...prev, discountCode: undefined }));
  }

  function changeShippingCode(v: string) {
    setShippingCode(v);
    setFieldErrors((prev) => ({ ...prev, shippingCode: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setNeedLogin(false);

    // Chỉ gửi productId + quantity + mã, KHÔNG gửi giá/tên (server tự tính lại từ DB)
    const payload = {
      customerName,
      phone,
      address,
      paymentMethod,
      discountCode: discountCode.trim() || null, // VOUCHER
      shippingCode: shippingCode.trim() || null, // VOUCHER
      items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
    };

    // Validate phía client bằng đúng schema mà API dùng
    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as FieldErrors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        // Số tiền phải trả tính từ các khoản đã đóng băng trong đơn, không dùng giá ở client
        const orderItems = (json.data.orderItems ?? []) as {
          priceAtOrder: string | number;
          quantity: number;
        }[];
        const itemsTotal = orderItems.reduce(
          (sum, it) => sum + Number(it.priceAtOrder) * it.quantity,
          0,
        );
        setOrderTotal(
          itemsTotal -
            Number(json.data.discountAmount ?? 0) +
            Number(json.data.shippingFee ?? 0) -
            Number(json.data.shippingDiscount ?? 0),
        );
        setOrderId(json.data.id);
        clearCart();
        return;
      }

      if (res.status === 401) {
        setNeedLogin(true);
      }
      // VOUCHER: lỗi mã gắn đúng ô, các lỗi khác như cũ
      if (json.field) {
        setFieldErrors({ [json.field]: [json.message] } as FieldErrors);
      } else if (json.errors) {
        setFieldErrors(json.errors as FieldErrors);
      }
      setFormError(json.message ?? "Có lỗi xảy ra, vui lòng thử lại");
    } catch {
      setFormError("Không kết nối được máy chủ, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return <main className="mx-auto max-w-2xl px-4 py-12" />;
  }

  // Phải kiểm tra thành công TRƯỚC khi kiểm tra giỏ trống,
  // vì sau khi đặt hàng xong giỏ đã bị xóa.
  if (orderId !== null) {
    const steps = ["Đã nhận đơn", "Xác nhận", "Đang giao", "Hoàn tất"];
    const isTransfer = paymentMethod === "bank_transfer";

    return (
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12">
        {/* Đầu trang: dấu tick + tiêu đề bên trái, mã đơn cỡ lớn bên phải */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-moss text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Đặt hàng thành công!
            </h1>
            <p className="mt-2 text-ink/65">
              Cỏ May đã nhận được đơn hàng của bạn.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink/55">Mã đơn hàng</p>
            <p className="font-heading text-7xl font-semibold leading-none text-moss-dark sm:text-8xl">
              #{orderId}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-[1.4fr_1fr]">
          {/* Thông tin nhận hàng */}
          <dl className="space-y-5 rounded-2xl bg-white p-6">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                Người nhận
              </dt>
              <dd className="mt-1 font-medium">{customerName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                Điện thoại
              </dt>
              <dd className="mt-1 font-medium tabular-nums">{phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                Giao tới
              </dt>
              <dd className="mt-1 break-words font-medium">{address}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                Thanh toán
              </dt>
              <dd className="mt-1 font-medium">
                {isTransfer
                  ? "Chuyển khoản ngân hàng (chờ thanh toán)"
                  : "Khi nhận hàng (COD)"}
              </dd>
            </div>
          </dl>

          {/* Các chặng của đơn: đường dọc */}
          <div className="rounded-2xl bg-blush p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-moss-dark">
              Đơn của bạn sẽ đi qua
            </p>
            <ol className="relative mt-5 space-y-5">
              <span
                aria-hidden
                className="absolute bottom-2 left-[7px] top-2 w-px bg-peach"
              />
              {steps.map((label, i) => (
                <li key={label} className="relative flex items-center gap-4">
                  <span
                    className={`relative z-10 h-4 w-4 rounded-full border-2 ${
                      i === 0 ? "border-moss bg-moss" : "border-peach bg-blush"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      i === 0 ? "font-semibold text-ink" : "text-ink/50"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {isTransfer && <TransferPanel orderId={orderId} amount={orderTotal} />}

        <p className="mt-6 leading-relaxed text-ink/65">
          {isTransfer
            ? "Sau khi nhận được tiền, shop sẽ xác nhận đơn và liên hệ qua số điện thoại trên. Bạn có thể theo dõi trạng thái trong mục đơn hàng."
            : "Shop sẽ liên hệ qua số điện thoại trên để xác nhận đơn. Bạn có thể theo dõi trạng thái trong mục đơn hàng."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/orders"
            className="rounded-xl bg-moss px-7 py-3.5 text-center font-semibold text-white transition hover:bg-moss-dark"
          >
            Xem đơn hàng của tôi
          </Link>
          <Link
            href="/products"
            className="rounded-xl border border-ink/20 px-7 py-3.5 text-center font-medium transition hover:border-moss hover:text-moss-dark"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 text-center">
        <h1 className="text-4xl font-semibold sm:text-5xl">
          Chưa có gì để đặt
        </h1>
        <p className="mt-4 text-ink/65">
          Hãy thêm sản phẩm vào giỏ trước khi đặt hàng.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-xl bg-moss px-8 py-4 font-semibold text-white transition hover:bg-moss-dark"
        >
          Xem sản phẩm
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-8">
      {/* Các bước mua hàng */}
      <ol className="flex items-center gap-3 text-sm">
        <li>
          <Link
            href="/cart"
            className="flex items-center gap-2 text-ink/55 transition-colors hover:text-moss-dark"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-moss text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            Giỏ hàng
          </Link>
        </li>
        <li aria-hidden className="h-px w-8 bg-ink/25" />
        <li className="flex items-center gap-2 font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper">
            2
          </span>
          Đặt hàng
        </li>
        <li aria-hidden className="h-px w-8 bg-ink/25" />
        <li className="flex items-center gap-2 text-ink/40">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/25 text-xs">
            3
          </span>
          Hoàn tất
        </li>
      </ol>

      <h1 className="mt-8 text-4xl font-semibold leading-tight sm:text-5xl">
        Đặt hàng
      </h1>
      <p className="mt-2 text-ink/65">
        Điền thông tin giao hàng, shop sẽ liên hệ xác nhận đơn.
      </p>

      {/* Tóm tắt đơn: bấm để xổ ra / thu lại */}
      <details className="group mt-8 overflow-hidden rounded-2xl bg-blush">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-medium text-moss-dark">
            Xem đơn hàng ({totalItems} món)
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          <span className="font-heading text-2xl font-semibold">
            {formatVND(totalPrice)}
          </span>
        </summary>

        <ul className="space-y-4 border-t border-peach/60 px-5 py-5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-ink px-1 text-[11px] font-semibold text-paper">
                  {item.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                {item.name}
              </span>
              <span className="shrink-0 text-sm tabular-nums">
                {formatVND(item.price * item.quantity)}
              </span>
            </li>
          ))}
          <li>
            <Link
              href="/cart"
              className="text-sm text-ink/60 underline underline-offset-4 transition-colors hover:text-moss-dark"
            >
              ← Sửa giỏ hàng
            </Link>
          </li>
        </ul>
      </details>

      <form onSubmit={handleSubmit} noValidate className="mt-10">
        <Step no={1} title="Người nhận">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customerName" className={labelClass}>
                Tên người nhận
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={fieldClass(!!fieldErrors.customerName)}
              />
              {fieldErrors.customerName && (
                <p className="mt-1.5 text-xs text-red-700">
                  {fieldErrors.customerName[0]}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Số điện thoại
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901 234 567"
                className={fieldClass(!!fieldErrors.phone)}
              />
              {fieldErrors.phone && (
                <p className="mt-1.5 text-xs text-red-700">
                  {fieldErrors.phone[0]}
                </p>
              )}
            </div>
          </div>
        </Step>

        <Step no={2} title="Giao hàng tới">
          <label htmlFor="address" className={labelClass}>
            Địa chỉ giao hàng
          </label>
          <textarea
            id="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            className={`${fieldClass(!!fieldErrors.address)} resize-none`}
          />
          {fieldErrors.address && (
            <p className="mt-1.5 text-xs text-red-700">
              {fieldErrors.address[0]}
            </p>
          )}
        </Step>

        {/* VOUCHER: bước nhập mã giảm giá */}
        <Step no={3} title="Mã giảm giá">
          <p className="mb-4 text-sm text-ink/60">
            Mỗi đơn dùng được 1 mã giảm tiền hàng và 1 mã giảm phí ship cùng
            lúc.
          </p>
          <div className="space-y-3">
            <VoucherField
              id="discountCode"
              label="Mã giảm tiền hàng"
              hint="Trừ vào tiền hàng"
              value={discountCode}
              onChange={changeDiscountCode}
              error={discountError}
              appliedCode={
                discountCode.trim() && !discountError
                  ? preview?.discountVoucher?.code
                  : undefined
              }
              amount={discountAmount}
            />
            <VoucherField
              id="shippingCode"
              label="Mã giảm phí ship"
              hint="Trừ vào phí vận chuyển"
              value={shippingCode}
              onChange={changeShippingCode}
              error={shippingError}
              appliedCode={
                shippingCode.trim() && !shippingError
                  ? preview?.shippingVoucher?.code
                  : undefined
              }
              amount={shippingDiscount}
            />
          </div>
        </Step>

        <Step no={4} title="Thanh toán" last>
          <div
            role="radiogroup"
            aria-label="Phương thức thanh toán"
            className="space-y-3"
          >
            <PaymentOption
              selected={paymentMethod === "cod"}
              title="Thanh toán khi nhận hàng (COD)"
              desc="Bạn trả tiền mặt cho người giao hàng."
              onSelect={() => setPaymentMethod("cod")}
            />
            <PaymentOption
              selected={paymentMethod === "bank_transfer"}
              title="Chuyển khoản ngân hàng"
              desc="Quét mã QR để thanh toán ngay sau khi đặt hàng."
              onSelect={() => setPaymentMethod("bank_transfer")}
            />
          </div>
          {paymentMethod === "bank_transfer" && (
            <p className="mt-3 rounded-xl bg-blush px-4 py-3 text-sm text-moss-dark">
              Sau khi bấm đặt hàng, bạn sẽ nhận mã QR cùng nội dung chuyển khoản
              có mã đơn.
            </p>
          )}
        </Step>

        {/* VOUCHER: khối tổng tiền */}
        <dl className="mt-8 space-y-2.5 rounded-2xl bg-blush px-5 py-5 text-sm">
          <SummaryRow label="Tiền hàng" value={formatVND(subtotal)} />
          {discountAmount > 0 && (
            <SummaryRow
              label={`Giảm giá${preview?.discountVoucher ? ` (${preview.discountVoucher.code})` : ""}`}
              value={`- ${formatVND(discountAmount)}`}
              accent
            />
          )}
          <SummaryRow label="Phí vận chuyển" value={formatVND(shippingFee)} />
          {shippingDiscount > 0 && (
            <SummaryRow
              label={`Giảm phí ship${preview?.shippingVoucher ? ` (${preview.shippingVoucher.code})` : ""}`}
              value={`- ${formatVND(shippingDiscount)}`}
              accent
            />
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-peach/60 pt-3">
            <dt className="font-semibold">Tổng cộng</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">
              {formatVND(payable)}
            </dd>
          </div>
        </dl>

        {formError && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
            {needLogin && (
              <>
                {" "}
                <Link
                  href="/login?next=/checkout"
                  className="font-semibold underline underline-offset-2"
                >
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 w-full rounded-xl bg-moss py-4 text-base font-semibold text-white transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Đang xử lý..."
            : `Xác nhận đặt hàng · ${formatVND(payable)}`}
        </button>
        <p className="mt-3 text-center text-sm text-ink/55">
          Shop sẽ gọi điện xác nhận trước khi giao hàng.
        </p>
      </form>
    </main>
  );
}
