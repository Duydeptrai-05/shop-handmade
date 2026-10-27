"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-moss focus:ring-2 focus:ring-moss/20 [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-ink)]";

const labelClass = "text-sm font-medium text-ink/75";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  // Chỉ chấp nhận đường dẫn nội bộ; chặn "//..." và "/\..." (trình duyệt hiểu là link ngoài)
  const next =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Không thể kết nối tới server, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:pt-14">
      <div className="grid overflow-hidden rounded-3xl bg-white md:grid-cols-[5fr_6fr]">
        {/* Trái: lời chào */}
        <aside className="flex flex-col justify-between gap-10 bg-blush p-8 sm:p-10">
          <Link href="/" className="flex w-fit items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-moss font-heading text-lg font-semibold text-white"
            >
              C
            </span>
            <span className="font-heading text-xl font-semibold text-ink">
              Cỏ May Handmade
            </span>
          </Link>

          <div>
            <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Chào mừng
              <br />
              <span className="text-moss-dark">bạn quay lại.</span>
            </h1>
            <p className="mt-4 max-w-xs leading-relaxed text-ink/70">
              Đăng nhập để tiếp tục chọn những món handmade làm từng chiếc một.
            </p>
          </div>

          <ul className="hidden space-y-3 text-sm text-ink/80 md:block">
            {[
              "Đặt hàng và theo dõi đơn của bạn",
              "Đánh giá những món đã mua",
            ].map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        {/* Phải: form */}
        <section className="p-8 sm:p-12">
          <h2 className="text-3xl font-semibold">Đăng nhập</h2>
          {next !== "/" ? (
            <p className="mt-2 text-ink/65">Bạn cần đăng nhập để tiếp tục.</p>
          ) : (
            <p className="mt-2 text-ink/65">Nhập email và mật khẩu của bạn.</p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu"
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
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-moss-dark underline decoration-moss/40 underline-offset-4 transition-colors hover:text-ink"
                >
                  Quên mật khẩu?
                </Link>
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
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-8 border-t border-ink/10 pt-6 text-sm text-ink/65">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="font-semibold text-ink underline decoration-moss decoration-2 underline-offset-4 transition-colors hover:text-moss-dark"
            >
              Đăng ký ngay
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 pt-14">
          <div className="h-[460px] animate-pulse rounded-3xl bg-ink/10" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
