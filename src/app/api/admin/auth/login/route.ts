import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { setAuthCookie, signToken } from "../../../../../../lib/auth";
import {
  lockMinutesLeft,
  lockedMessage,
  registerFailedLogin,
  clearFailedLogin,
} from "../../../../../../lib/login-limit";

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { username, password } = parsed.data;

    const admin = await prisma.admin.findUnique({ where: { username } });

    // Đang bị khóa tạm do nhập sai nhiều lần: chặn luôn, không so mật khẩu
    if (admin) {
      const minutesLeft = lockMinutesLeft(admin.lockedUntil);
      if (minutesLeft > 0) {
        return NextResponse.json(
          { success: false, message: lockedMessage(minutesLeft) },
          { status: 429 },
        );
      }
    }

    const isValid = admin
      ? await bcrypt.compare(password, admin.passwordHash)
      : false;

    // Cùng một thông báo cho "sai tên" và "sai mật khẩu",
    // để người ngoài không dò được tên đăng nhập nào tồn tại
    if (!admin || !isValid) {
      // Chỉ ghi nhận lần sai khi tên đăng nhập có thật
      if (admin) {
        const result = await registerFailedLogin(prisma, "admin", admin.id);

        if (result.locked) {
          return NextResponse.json(
            { success: false, message: lockedMessage(result.minutes) },
            { status: 429 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: `Sai tên đăng nhập hoặc mật khẩu. Bạn còn ${result.remaining} lần thử.`,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { success: false, message: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 },
      );
    }

    // Đăng nhập đúng: xóa bộ đếm sai (chỉ ghi DB khi thật sự có gì để xóa)
    if (admin.failedLoginCount > 0 || admin.lockedUntil) {
      await clearFailedLogin(prisma, "admin", admin.id);
    }

    const token = signToken({ id: admin.id, role: "admin" });
    const response = NextResponse.json({
      success: true,
      data: { id: admin.id, username: admin.username },
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("POST /api/admin/auth/login error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
