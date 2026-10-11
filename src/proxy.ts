import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "session";
// Trang đăng nhập của Admin, sửa lại nếu đường dẫn thật của bạn khác
const ADMIN_LOGIN_PATH = "/admin/login";

type Role = "customer" | "admin";

// Đọc role từ cookie. Trả về null nếu chưa đăng nhập / token sai / hết hạn.
// Tự verify bằng jsonwebtoken thay vì import lib/auth.ts để proxy không
// phải kéo theo Prisma (lib/auth.ts import prisma).
function getRole(request: NextRequest): Role | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;

  try {
    const payload = jwt.verify(token, secret) as { role?: Role };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, loginPath: string) {
  const { pathname, search } = request.nextUrl;
  const url = new URL(loginPath, request.url);
  // Sau khi đăng nhập xong sẽ quay lại đúng trang đang định vào
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getRole(request);

  // Khu Admin: chỉ role "admin" được vào (trừ chính trang đăng nhập Admin)
  if (pathname.startsWith("/admin")) {
    if (pathname === ADMIN_LOGIN_PATH || role === "admin") {
      return NextResponse.next();
    }
    return redirectToLogin(request, ADMIN_LOGIN_PATH);
  }

  // /checkout, /orders: chỉ role "customer"
  if (role !== "customer") {
    return redirectToLogin(request, "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*", "/orders/:path*", "/admin/:path*"],
};
