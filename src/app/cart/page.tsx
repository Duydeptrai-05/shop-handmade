"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../../lib/cart-context";
import { formatVND } from "../../../lib/format";

// Ô nhập số lượng: cho gõ tự do, áp dụng khi bấm Enter hoặc rời ô.
// Số vượt tồn kho tự cắt xuống bằng tồn kho; ô trống hoặc 0 thì trả về số cũ.
function QuantityInput({
  value,
  max,
  onCommit,
}: {
  value: number;
  max?: number;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  // Đồng bộ lại khi số lượng đổi từ nơi khác (nút − / +)
  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const n = parseInt(text, 10);
    if (!n || n < 1) {
      setText(String(value));
      return;
    }
    const next = max !== undefined ? Math.min(n, max) : n;
    setText(String(next));
    if (next !== value) onCommit(next);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onFocus={(e) => e.currentTarget.select()}
      aria-label="Số lượng"
      className="h-9 w-10 bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus:bg-blush"
    />
  );
}

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  } = useCart();

  // Giỏ hàng đọc từ localStorage sau khi mount, chờ mount xong để tránh
  // nháy "Giỏ hàng trống" trong tích tắc đầu.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <main className="mx-auto max-w-4xl px-4 py-12" />;
  }

  const isEmpty = items.length === 0;

  return (
    <>
      {/* Dải tiêu đề trải hết chiều ngang */}
      <section className="bg-moss-dark text-white">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:pb-28 sm:pt-14">
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
            Giỏ hàng của bạn
          </h1>
          <p className="mt-3 text-base text-white/90 sm:text-lg">
            {isEmpty
              ? "Chưa có món nào được chọn."
              : `${totalItems} món handmade đang chờ bạn mang về.`}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 pb-24">
        {isEmpty ? (
          <div className="relative z-10 -mt-14 rounded-2xl bg-white px-6 py-16 text-center shadow-warm-lg">
            <p className="font-heading text-2xl font-semibold">
              Giỏ hàng đang trống
            </p>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink/65">
              Mỗi mẻ handmade chỉ làm số lượng nhỏ, ghé xem các món mới trước
              khi hết nhé.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-block rounded-xl bg-moss px-8 py-4 font-semibold text-white transition hover:bg-moss-dark"
            >
              Xem sản phẩm
            </Link>
          </div>
        ) : (
          <>
            {/* Tờ danh sách đè lên mép dưới của dải tiêu đề */}
            <div className="relative z-10 -mt-14 overflow-hidden rounded-2xl bg-white shadow-warm-lg">
              <ul className="divide-y divide-ink/10">
                {items.map((item) => {
                  // Giỏ cũ chưa có stock thì coi như chưa giới hạn ở giao diện
                  // (API đặt hàng vẫn chặn khi vượt kho).
                  const atMax =
                    item.stock !== undefined && item.quantity >= item.stock;

                  return (
                    <li
                      key={item.id}
                      className="flex gap-4 p-5 sm:gap-6 sm:p-6"
                    >
                      <Link
                        href={`/products/${item.id}`}
                        className="group relative block h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-blush sm:h-36 sm:w-36"
                      >
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="144px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/products/${item.id}`}
                          className="line-clamp-2 text-lg font-semibold leading-snug transition-colors hover:text-moss-dark"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-sm text-ink/55">
                          {formatVND(item.price)} / món
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
                          <div className="inline-flex items-center overflow-hidden rounded-full border border-ink/15">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="h-9 w-9 text-lg leading-none transition-colors hover:bg-blush hover:text-moss-dark"
                              aria-label="Giảm số lượng"
                            >
                              −
                            </button>
                            <QuantityInput
                              value={item.quantity}
                              max={item.stock}
                              onCommit={(next) => updateQuantity(item.id, next)}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={atMax}
                              className="h-9 w-9 text-lg leading-none transition-colors hover:bg-blush hover:text-moss-dark disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Tăng số lượng"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex items-center gap-1 text-sm text-ink/45 transition-colors hover:text-moss-dark"
                            aria-label={`Xóa ${item.name} khỏi giỏ`}
                          >
                            <svg
                              aria-hidden
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5h6V7" />
                            </svg>
                            Xóa
                          </button>
                        </div>

                        {atMax && (
                          <p className="mt-2 text-xs font-medium text-moss-dark">
                            Đã hết hàng trong kho ({item.stock})
                          </p>
                        )}

                        {/* Thành tiền trên điện thoại */}
                        <p className="mt-3 text-lg font-semibold tabular-nums text-moss-dark sm:hidden">
                          {formatVND(item.price * item.quantity)}
                        </p>
                      </div>

                      {/* Thành tiền từ màn hình sm trở lên */}
                      <p className="hidden shrink-0 self-center text-2xl font-semibold tabular-nums text-moss-dark sm:block">
                        {formatVND(item.price * item.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between border-t border-ink/10 bg-paper/70 px-5 py-4 text-sm sm:px-6">
                <Link
                  href="/products"
                  className="font-semibold transition-colors hover:text-moss-dark"
                >
                  ← Tiếp tục mua sắm
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-ink/50 transition-colors hover:text-moss-dark"
                >
                  Xóa giỏ hàng
                </button>
              </div>
            </div>

            {/* Thanh đặt hàng nổi: dính ở đáy màn hình khi cuộn */}
            <div className="sticky bottom-4 z-20 mt-8 flex items-center justify-between gap-4 rounded-2xl bg-ink px-5 py-4 text-paper shadow-warm-lg sm:px-7">
              <div>
                <p className="text-xs text-paper/65">
                  Tổng cộng · {totalItems} món
                </p>
                <p className="font-heading text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  {formatVND(totalPrice)}
                </p>
              </div>

              <div className="flex items-center gap-6">
                {/* Khi có thêm chuyển khoản, đổi câu này thành: "Chọn cách thanh toán ở bước tiếp theo." */}
                <p className="hidden max-w-[15rem] text-xs leading-snug text-paper/65 md:block">
                  Thanh toán khi nhận hàng hoặc chuyển khoản. Thông tin giao
                  hàng điền ở bước sau.
                </p>
                <Link
                  href="/checkout"
                  className="shrink-0 rounded-xl bg-moss px-6 py-3.5 font-semibold text-white transition hover:bg-paper hover:text-ink sm:px-8"
                >
                  Đặt hàng →
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
