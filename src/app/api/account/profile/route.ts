import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ tên")
    .max(255, "Họ tên quá dài"),
  // Cho phép để trống (lưu null); nếu có nhập thì phải đúng dạng SĐT Việt Nam
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ")
    .or(z.literal(""))
    .optional(),
});

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// GET /api/account/profile: xem hồ sơ của khách đang đăng nhập
export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!customer) return fail("Không tìm thấy tài khoản", 404);

    return NextResponse.json({ success: true, data: customer });
  } catch {
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}

// PATCH /api/account/profile: sửa tên, số điện thoại (email giữ nguyên)
export async function PATCH(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message, 400);
    }

    const { name, phone } = parsed.data;

    const updated = await prisma.customer.update({
      where: { id: payload.id },
      data: { name, phone: phone ? phone : null },
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}
