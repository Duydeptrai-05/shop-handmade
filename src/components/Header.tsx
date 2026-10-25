import Link from "next/link";
import { getAuthPayload } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import CartLink from "./CartLink";
import LogoutButton from "./LogoutButton";
import GuestNav from "./GuestNav";
import CategoryMenu from "./CategoryMenu";
import NavShell from "./NavShell";
import OrdersLink from "./OrdersLink";

// Link dạng viên thuốc: hover nền hồng nhạt, chữ san hô đậm
const linkClass =
  "rounded-full px-3.5 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:bg-blush hover:text-moss-dark";

export default async function Header() {
  const payload = await getAuthPayload();
  const role = payload?.role;

  // Admin không dùng menu danh mục nên không cần truy vấn
  const categories =
    role === "admin"
      ? []
      : await prisma.category.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });

  return (
    <header className="sticky top-0 z-40 border-b border-peach/40 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href={role === "admin" ? "/admin" : "/"}
          className="group flex items-center gap-2.5"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-moss font-heading text-lg font-semibold text-white shadow-warm transition-transform duration-300 group-hover:-rotate-12"
          >
            C
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-xl font-semibold text-ink">
              Cỏ May
            </span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-moss-dark">
              {role === "admin" ? "Quản trị" : "Handmade"}
            </span>
          </span>
        </Link>

        <NavShell>
          {role === "admin" ? (
            <>
              <Link href="/admin" className={linkClass}>
                Tổng quan
              </Link>
              <Link href="/admin/orders" className={linkClass}>
                Quản lý đơn hàng
              </Link>
              <Link href="/admin/products" className={linkClass}>
                Quản lý sản phẩm
              </Link>
              <Link href="/admin/customers" className={linkClass}>
                Khách hàng
              </Link>
              <LogoutButton redirectTo="/admin/login" className={linkClass} />
            </>
          ) : role === "customer" ? (
            <>
              <Link href="/" className={linkClass}>
                Trang chủ
              </Link>
              <CategoryMenu categories={categories} />
              <CartLink className={linkClass} />
              <OrdersLink className={linkClass} />
              <LogoutButton redirectTo="/" className={linkClass} />
            </>
          ) : (
            <GuestNav
              linkClass={linkClass}
              menu={<CategoryMenu categories={categories} />}
            />
          )}
        </NavShell>
      </nav>
    </header>
  );
}
