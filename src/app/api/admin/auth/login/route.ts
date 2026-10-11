import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { setAuthCookie, signToken } from "../../../../../../lib/auth";

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
    const isValid = admin
      ? await bcrypt.compare(password, admin.passwordHash)
      : false;

    // Cùng một thông báo cho "sai tên" và "sai mật khẩu",
    // để người ngoài không dò được tên đăng nhập nào tồn tại
    if (!admin || !isValid) {
      return NextResponse.json(
        { success: false, message: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 },
      );
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
