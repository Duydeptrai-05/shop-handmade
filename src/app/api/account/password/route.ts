import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  // Độ dài tối thiểu 6 giống trang đăng ký
  newPassword: z
    .string()
    .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
    .max(100, "Mật khẩu mới quá dài"),
});

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// POST /api/account/password: đổi mật khẩu
export async function POST(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return fail("Vui lòng đăng nhập", 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message, 400);
    }

    const { currentPassword, newPassword } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: { passwordHash: true },
    });
    if (!customer) return fail("Không tìm thấy tài khoản", 404);

    const isMatch = await bcrypt.compare(
      currentPassword,
      customer.passwordHash,
    );
    if (!isMatch) return fail("Mật khẩu hiện tại không đúng", 400);

    if (currentPassword === newPassword) {
      return fail("Mật khẩu mới phải khác mật khẩu hiện tại", 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: payload.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      data: { message: "Đổi mật khẩu thành công" },
    });
  } catch {
    return fail("Có lỗi xảy ra, vui lòng thử lại sau", 500);
  }
}
