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
  const [quantity, setQuantity] = useState(1);
  const [draft, setDraft] = useState<string | null>(null); // đang gõ tay
  const [message, setMessage] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  // Số lượng sản phẩm này đang có trong giỏ
  const inCart = items.find((i) => i.id === productId)?.quantity ?? 0;
  // Số còn có thể thêm được nữa
  const remaining = Math.max(stock - inCart, 0);
  const reachedMax = stock > 0 && remaining === 0;

  // Số lượng đang chọn, luôn nằm trong khoảng 1..remaining
  const qty = remaining > 0 ? Math.min(Math.max(quantity, 1), remaining) : 0;

  function commitDraft() {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n) && n >= 1) {
      setQuantity(Math.min(n, Math.max(remaining, 1)));
    }
    setDraft(null);
  }

  function requireLogin() {
    if (!isLoggedIn) {
      router.push(`/login?next=/products/${productId}`);
      return true;
    }
    return false;
  }

  function handleAdd() {
    if (requireLogin()) return;

    const { added, limited } = addItem(
      { id: productId, name, price, imageUrl, stock },
      qty,
    );

    if (added === 0) {
      setIsWarning(true);
      setMessage(`Trong giỏ đã có tối đa ${stock} sản phẩm (hết tồn kho)`);
    } else if (limited) {
      setIsWarning(true);
      setMessage(`Chỉ còn ${stock} sản phẩm, đã thêm tối đa vào giỏ`);
    } else {
      setIsWarning(false);
      setMessage(`Đã thêm ${added} sản phẩm vào giỏ hàng`);
    }
    setQuantity(1);
  }

  function handleBuyNow() {
    if (requireLogin()) return;

    // Giỏ đã đầy sản phẩm này thì không thêm nữa, đi thẳng sang đặt hàng
    if (qty > 0) {
      addItem({ id: productId, name, price, imageUrl, stock }, qty);
    }
    router.push("/checkout");
  }

  const addLabel =
    stock === 0 ? "Hết hàng" : reachedMax ? "Đã thêm tối đa" : "Thêm vào giỏ";

  return (
    <div className="mt-8">
      {/* Chọn số lượng */}
      {stock > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-sm font-semibold text-ink">Số lượng</span>

          <div className="inline-flex items-center overflow-hidden rounded-lg border border-ink/15 bg-white">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={() => setQuantity(Math.max(qty - 1, 1))}
              disabled={qty <= 1}
              className="h-11 w-11 text-lg text-ink transition hover:bg-blush disabled:cursor-not-allowed disabled:text-ink/30 disabled:hover:bg-transparent"
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Số lượng"
              value={draft ?? String(qty)}
              disabled={remaining === 0}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                }
              }}
              className="h-11 w-14 border-x border-ink/15 bg-transparent text-center text-base font-semibold text-ink outline-none focus:bg-blush/50 disabled:text-ink/30"
            />
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => setQuantity(Math.min(qty + 1, remaining))}
              disabled={qty >= remaining}
              className="h-11 w-11 text-lg text-ink transition hover:bg-blush disabled:cursor-not-allowed disabled:text-ink/30 disabled:hover:bg-transparent"
            >
              +
            </button>
          </div>

          <span className="text-sm text-ink/55">
            {reachedMax
              ? `Giỏ của bạn đã có đủ ${stock} sản phẩm`
              : inCart > 0
                ? `Còn thêm được ${remaining} (đã có ${inCart} trong giỏ)`
                : `Còn ${stock} sản phẩm`}
          </span>
        </div>
      )}

      {/* Hai nút hành động */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={stock === 0 || reachedMax}
          className="flex items-center justify-center gap-2.5 rounded-lg border-2 border-moss bg-white py-3.5 text-base font-semibold text-moss-dark transition hover:-translate-y-0.5 hover:bg-blush active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-ink/15 disabled:bg-ink/10 disabled:text-ink/45 disabled:hover:bg-ink/10"
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
          {addLabel}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={stock === 0}
          className="flex items-center justify-center gap-2.5 rounded-lg bg-moss py-3.5 text-base font-semibold text-white shadow-warm transition hover:-translate-y-0.5 hover:bg-moss-dark hover:shadow-warm-lg active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/45 disabled:shadow-none"
        >
          Đặt hàng ngay
          <span aria-hidden>→</span>
        </button>
      </div>

      {/* Thông báo sau khi thêm vào giỏ */}
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
          Bạn cần đăng nhập để đặt hàng hoặc thêm vào giỏ.
        </p>
      )}
    </div>
  );
}
