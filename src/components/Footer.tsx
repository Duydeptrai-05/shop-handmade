import Link from "next/link";
import { getAuthPayload } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

const linkClass =
  "inline-block text-ink/70 transition-all hover:translate-x-0.5 hover:text-moss-dark";

const headingClass =
  "text-xs font-semibold uppercase tracking-[0.2em] text-moss-dark";

export default async function Footer() {
  const payload = await getAuthPayload();
  const role = payload?.role;

  // Admin không dùng footer
  if (role === "admin") return null;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <footer className="mt-24 rounded-t-[2rem] border-t border-peach/50 bg-blush/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Giới thiệu */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-moss font-heading text-lg font-semibold text-white shadow-warm"
            >
              C
            </span>
            <span className="font-heading text-xl font-semibold text-ink">
              Cỏ May Handmade
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">
            Đồ handmade làm thủ công từng món một, số lượng có hạn.
          </p>
        </div>

        {/* Khám phá */}
        <div>
          <h3 className={headingClass}>Khám phá</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <Link href="/" className={linkClass}>
                Trang chủ
              </Link>
            </li>
            <li>
              <Link href="/products" className={linkClass}>
                Tất cả sản phẩm
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.id}`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Tài khoản */}
        <div>
          <h3 className={headingClass}>Tài khoản</h3>
          <ul className="mt-5 space-y-2.5 text-sm">
            <li>
              <Link href="/cart" className={linkClass}>
                Giỏ hàng
              </Link>
            </li>
            {role === "customer" ? (
              <li>
                <Link href="/orders" className={linkClass}>
                  Đơn hàng của tôi
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link href="/login" className={linkClass}>
                    Đăng nhập
                  </Link>
                </li>
                <li>
                  <Link href="/register" className={linkClass}>
                    Đăng ký
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Liên hệ */}
        <div>
          <h3 className={headingClass}>Liên hệ</h3>
          <ul className="mt-5 space-y-2.5 text-sm text-ink/70">
            <li>Email: chaungocduy58@gmail.com</li>
            <li>Điện thoại: 0819 554 379</li>
            <li className="pt-1">
              <span className="inline-block rounded-full border border-peach bg-card px-3 py-1 text-xs font-medium text-moss-dark">
                Thanh toán khi nhận hàng hoặc chuyển khoản
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-dashed border-peach/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-ink/55">
          <p>© 2026 Cỏ May Handmade.</p>
          <Link
            href="/admin/login"
            className="text-ink/40 transition-colors hover:text-moss-dark"
          >
            Quản trị
          </Link>
        </div>
      </div>
    </footer>
  );
}
