"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "../../lib/cart-context";

interface AddToCartButtonProps {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  isLoggedIn: boolean;
}

export default function AddToCartButton({
  productId,
  name,
  price,
  imageUrl,
  stock,
  isLoggedIn,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { items, addItem } = useCart();
  const [message, setMessage] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  // Số lượng sản phẩm này đang có trong giỏ
  const inCart = items.find((i) => i.id === productId)?.quantity ?? 0;
  const reachedMax = stock > 0 && inCart >= stock;

  function handleClick() {
    if (!isLoggedIn) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }

    const { added, limited } = addItem(
      { id: productId, name, price, imageUrl, stock },
      1,
    );

    if (added === 0) {
      setIsWarning(true);
      setMessage(`Trong giỏ đã có tối đa ${stock} sản phẩm (hết tồn kho)`);
    } else if (limited) {
      setIsWarning(true);
      setMessage(`Chỉ còn ${stock} sản phẩm, đã thêm tối đa vào giỏ`);
    } else {
      setIsWarning(false);
      setMessage("Đã thêm vào giỏ hàng");
    }
  }

  let label = "Thêm vào giỏ hàng";
  if (stock === 0) label = "Hết hàng";
  else if (reachedMax) label = "Đã thêm tối đa";

  const disabled = stock === 0 || reachedMax;

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-moss py-4 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-moss-dark hover:shadow-warm-lg active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/45 disabled:shadow-none"
      >
        {/* Biểu tượng giỏ hàng */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" />
          <circle cx="9.5" cy="19.5" r="1.2" />
          <circle cx="17" cy="19.5" r="1.2" />
        </svg>
        {label}
      </button>

      {/* Thông báo sau khi bấm */}
      <div role="status" aria-live="polite">
        {message && (
          <p
            className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-2.5 text-sm ${
              isWarning
                ? "border border-ochre bg-ochre/20 text-ink"
                : "border border-peach bg-blush/60 text-moss-dark"
            }`}
          >
            <span className="font-medium">
              {isWarning ? "⚠ " : "✓ "}
              {message}
            </span>
            {isLoggedIn && (
              <Link
                href="/cart"
                className="font-semibold underline decoration-2 underline-offset-4 hover:text-moss"
              >
                Xem giỏ hàng →
              </Link>
            )}
          </p>
        )}
      </div>

      {/* Nhắc khách chưa đăng nhập */}
      {!isLoggedIn && stock > 0 && (
        <p className="mt-3 text-center text-sm text-ink/55">
          Bạn cần đăng nhập để thêm sản phẩm vào giỏ.
        </p>
      )}
    </div>
  );
}
