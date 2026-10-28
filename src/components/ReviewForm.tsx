"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createReviewSchema } from "../../lib/validation/review";

type Status = {
  loggedIn: boolean;
  canReview: boolean;
  hasReviewed: boolean;
  reviewStatus?: "pending" | "approved" | "hidden" | null;
};

// Chữ hiện bên dưới hàng sao, theo số sao đang chọn hoặc đang rê chuột
const RATING_LABELS = [
  "Chạm vào sao để chấm điểm",
  "Chưa hài lòng",
  "Tạm được",
  "Ổn",
  "Hài lòng",
  "Tuyệt vời",
];

// Thanh thông báo một dòng, dùng cho các trường hợp không có form
function Notice({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center gap-4 rounded-2xl bg-blush px-5 py-4 text-ink">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-moss-dark"
      >
        {icon}
      </span>
      <p className="text-sm leading-relaxed sm:text-base">{children}</p>
    </div>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

export default function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${productId}/reviews`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStatus(json.data);
      })
      .catch(() => {});
  }, [productId]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");

    const parsed = createReviewSchema.safeParse({ rating, comment });
    if (!parsed.success) {
      setError(
        rating === 0 ? "Vui lòng chọn số sao" : parsed.error.issues[0].message,
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message);
        return;
      }
      setStatus({
        loggedIn: true,
        canReview: false,
        hasReviewed: true,
        reviewStatus: "pending",
      });
      router.refresh(); // tải lại danh sách review và sao trung bình
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  }

  // Đang kiểm tra: chưa hiện gì để tránh nhấp nháy
  if (!status) return null;

  if (!status.loggedIn) {
    return (
      <Notice
        icon={
          <svg {...iconProps}>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        }
      >
        <Link
          href={`/login?next=/products/${productId}`}
          className="font-semibold text-moss-dark underline decoration-2 underline-offset-4 hover:text-moss"
        >
          Đăng nhập
        </Link>{" "}
        để đánh giá sản phẩm đã mua.
      </Notice>
    );
  }

  if (status.hasReviewed) {
    // Đánh giá đang chờ Admin duyệt: báo rõ để khách không tưởng gửi lỗi
    if (status.reviewStatus === "pending") {
      return (
        <Notice
          icon={
            <svg {...iconProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        >
          <span className="font-semibold">Cảm ơn bạn!</span> Đánh giá của bạn
          đang chờ cửa hàng duyệt, duyệt xong sẽ hiện ở trang này.
        </Notice>
      );
    }

    // Admin đã ẩn đánh giá này
    if (status.reviewStatus === "hidden") {
      return (
        <Notice
          icon={
            <svg {...iconProps}>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          }
        >
          Đánh giá của bạn hiện không được hiển thị công khai.
        </Notice>
      );
    }

    return (
      <Notice
        icon={
          <svg {...iconProps} strokeWidth={2.4}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        }
      >
        <span className="font-semibold">Cảm ơn bạn!</span> Bạn đã đánh giá sản
        phẩm này.
      </Notice>
    );
  }

  if (!status.canReview) {
    return (
      <Notice
        icon={
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        }
      >
        Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng chứa sản phẩm này đã
        hoàn thành.
      </Notice>
    );
  }

  const shown = hover || rating;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8 grid overflow-hidden rounded-2xl bg-white md:grid-cols-[2fr_3fr]"
    >
      {/* Trái: chấm sao */}
      <div className="bg-moss p-7 text-white sm:p-8">
        <h3 className="font-heading text-2xl font-semibold leading-snug">
          Bạn thấy món này thế nào?
        </h3>

        <div
          className="mt-6 flex gap-1"
          onMouseLeave={() => setHover(0)}
          role="radiogroup"
          aria-label="Chấm điểm sản phẩm"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} sao`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(0)}
              className={`text-5xl leading-none transition duration-150 hover:scale-110 focus:outline-none focus-visible:scale-110 ${
                n <= shown ? "text-white" : "text-white/30"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <p
          aria-live="polite"
          className={`mt-4 min-h-7 text-lg font-semibold ${
            shown ? "text-white" : "text-white/70"
          }`}
        >
          {RATING_LABELS[shown]}
        </p>
      </div>

      {/* Phải: viết cảm nhận */}
      <div className="flex flex-col p-7 sm:p-8">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-ink/75"
        >
          Chia sẻ cảm nhận của bạn{" "}
          <span className="font-normal text-ink/45">(không bắt buộc)</span>
        </label>
        <textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chất lượng, đóng gói, mùi hương, độ tinh xảo..."
          className="mt-2 w-full flex-1 resize-none rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-2 focus:ring-moss/20"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <button
          disabled={saving}
          className="mt-4 self-end rounded-xl bg-ink px-7 py-3 font-semibold text-paper transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Đang gửi..." : "Gửi đánh giá"}
        </button>
      </div>
    </form>
  );
}
