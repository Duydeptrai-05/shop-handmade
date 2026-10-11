"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Nền trắng cố định, kể cả khi trình duyệt tự điền (autofill hay tô xanh nhạt)
const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-2 focus:ring-moss/20 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-ink)]";

const labelClass = "text-sm font-medium text-ink/75";

const MIN_LENGTH = 6;

// Chấm độ mạnh mật khẩu để gợi ý cho khách (không thay đổi quy tắc hợp lệ)
function strengthOf(password: string) {
  if (password.length === 0) return { score: 0, label: "" };
  if (password.length < MIN_LENGTH) {
    return { score: 0, label: `Cần tối thiểu ${MIN_LENGTH} ký tự` };
  }
  let score = 1;
  if (password.length >= 8) score++;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
  if (
    /[^a-zA-Z0-9]/.test(password) ||
    (/[A-Z]/.test(password) && /[a-z]/.test(password))
  ) {
    score++;
  }
  return { score, label: ["", "Yếu", "Tạm được", "Khá", "Mạnh"][score] };
}

const barColor = [
  "bg-ink/10",
  "bg-ochre",
  "bg-ochre",
  "bg-emerald-500",
  "bg-emerald-600",
];

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

const PERKS = [
  {
    title: "Đặt hàng nhanh",
    icon: (
      <svg {...iconProps}>
        <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2" />
        <circle cx="9.5" cy="19.5" r="1.2" />
        <circle cx="17" cy="19.5" r="1.2" />
      </svg>
    ),
  },
  {
    title: "Theo dõi đơn hàng",
    icon: (
      <svg {...iconProps}>
        <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </svg>
    ),
  },
  {
    title: "Đánh giá sản phẩm",
    icon: (
      <svg {...iconProps}>
        <path d="M12 3.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9z" />
      </svg>
    ),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = strengthOf(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối tới server, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-12 sm:pt-16">
      {/* Đầu trang */}
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss font-heading text-xl font-semibold text-white"
        >
          C
        </span>
        <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
          Tạo tài khoản
        </h1>
        <p className="mt-3 text-ink/65">
          Chỉ cần vài thông tin để bắt đầu mua sắm tại Cỏ May.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-5 rounded-3xl bg-white p-7 sm:p-9"
      >
        <div>
          <label htmlFor="name" className={labelClass}>
            Họ tên
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Nguyễn Văn A"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ban@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_LENGTH}
              placeholder={`Tối thiểu ${MIN_LENGTH} ký tự`}
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-moss-dark transition-colors hover:bg-blush"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>

          {/* Thanh độ mạnh mật khẩu */}
          <div aria-live="polite" className="mt-3 min-h-9">
            {password && (
              <>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        n <= strength.score
                          ? barColor[strength.score]
                          : "bg-ink/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-ink/60">{strength.label}</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-moss py-3.5 font-semibold text-white transition hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>

        <p className="pt-1 text-center text-sm text-ink/65">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-ink underline decoration-moss decoration-2 underline-offset-4 transition-colors hover:text-moss-dark"
          >
            Đăng nhập
          </Link>
        </p>
      </form>

      {/* Lợi ích khi có tài khoản */}
      <ul className="mt-10 grid grid-cols-3 gap-3 text-center">
        {PERKS.map((perk) => (
          <li key={perk.title} className="flex flex-col items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full bg-blush text-moss-dark"
            >
              {perk.icon}
            </span>
            <span className="text-xs font-medium leading-snug text-ink/70 sm:text-sm">
              {perk.title}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
