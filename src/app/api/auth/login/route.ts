import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { loginSchema } from "../../../../../lib/validation/auth";
import { signToken, setAuthCookie } from "../../../../../lib/auth";
import {
  lockMinutesLeft,
  lockedMessage,
  registerFailedLogin,
  clearFailedLogin,
} from "../../../../../lib/login-limit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Email hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    // Đang bị khóa tạm do nhập sai nhiều lần: chặn luôn, không so mật khẩu
    const minutesLeft = lockMinutesLeft(customer.lockedUntil);
    if (minutesLeft > 0) {
      return NextResponse.json(
        { success: false, message: lockedMessage(minutesLeft) },
        { status: 429 },
      );
    }

    const isValidPassword = await bcrypt.compare(
      password,
      customer.passwordHash,
    );

    if (!isValidPassword) {
      const result = await registerFailedLogin(prisma, "customer", customer.id);

      if (result.locked) {
        return NextResponse.json(
          { success: false, message: lockedMessage(result.minutes) },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: `Email hoặc mật khẩu không đúng. Bạn còn ${result.remaining} lần thử.`,
        },
        { status: 401 },
      );
    }

    // Kiểm tra khóa SAU khi mật khẩu đúng, để người lạ đoán email
    // không biết được tài khoản nào đang bị khóa
    if (!customer.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ shop để được hỗ trợ.",
        },
        { status: 403 },
      );
    }

    // Đăng nhập đúng: xóa bộ đếm sai (chỉ ghi DB khi thật sự có gì để xóa)
    if (customer.failedLoginCount > 0 || customer.lockedUntil) {
      await clearFailedLogin(prisma, "customer", customer.id);
    }

    const token = signToken({ id: customer.id, role: "customer" });

    const response = NextResponse.json({
      success: true,
      data: { id: customer.id, name: customer.name, email: customer.email },
    });
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
