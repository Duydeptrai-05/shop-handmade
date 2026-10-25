import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET as string;
const COOKIE_NAME = "session";
const TOKEN_EXPIRES_IN = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 ngày, tính bằng giây

if (!JWT_SECRET) {
  throw new Error("Thiếu biến môi trường JWT_SECRET trong .env");
}

export type Role = "customer" | "admin";

export interface TokenPayload {
  id: number;
  role: Role;
}

// Tạo JWT token, dùng chung cho cả Customer và Admin, phân biệt qua field "role"
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

// Giải mã + xác thực token, trả về null nếu token sai hoặc hết hạn
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Gắn cookie httpOnly chứa token vào response (dùng trong API route register/login)
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

// Xóa cookie (dùng trong API route logout)
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Đọc + xác thực token từ cookie hiện tại (dùng ở API route "me" và Server Component)
// Với khách (customer): kiểm tra lại trong DB, tài khoản bị khóa hoặc không còn tồn tại
// thì coi như chưa đăng nhập, dù token vẫn còn hạn
export async function getAuthPayload(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  if (payload.role === "customer") {
    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: { isActive: true },
    });
    if (!customer || !customer.isActive) return null;
  }

  return payload;
}

// Lấy thông tin Customer đang đăng nhập, dùng ở Server Component
// (ví dụ trang chi tiết sản phẩm, để quyết định hiện nút "Thêm giỏ hàng" hay bắt đăng nhập)
// Trả về null nếu chưa đăng nhập hoặc token đó là của Admin
export async function getCurrentCustomer() {
  const payload = await getAuthPayload();
  if (!payload || payload.role !== "customer") return null;

  const customer = await prisma.customer.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Khách đã bị Admin khóa thì coi như chưa đăng nhập
  if (!customer || !customer.isActive) return null;

  return { id: customer.id, name: customer.name, email: customer.email };
}
