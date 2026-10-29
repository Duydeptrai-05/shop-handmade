"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWishlist } from "../../lib/wishlist-context";

const HEART =
  "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";

export default function WishlistButton({
  productId,
  variant = "icon",
}: {
  productId: number;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const { isLiked, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const liked = isLiked(productId);

  async function handleClick(e: React.MouseEvent) {
    // Nút nằm trong thẻ có link: bấm tim thì không được chuyển sang trang chi tiết
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    setBusy(true);
    const result = await toggle(productId);
    setBusy(false);

    if (result === "login") {
      const here = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(here)}`);
    }
  }

  const heart = (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
        liked
          ? "scale-110 fill-moss stroke-moss-dark"
          : "fill-none stroke-current"
      }`}
    >
      <path d={HEART} />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
          liked
            ? "border-moss bg-blush text-moss-dark"
            : "border-peach bg-white text-ink/75 hover:border-moss hover:text-moss-dark"
        }`}
      >
        {heart}
        {liked ? "Đã yêu thích" : "Yêu thích"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      disabled={busy}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-warm transition active:scale-90 disabled:opacity-60 ${
        liked ? "text-moss-dark" : "text-ink/60 hover:text-moss-dark"
      }`}
    >
      {heart}
    </button>
  );
}
