import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { loginSchema } from "../../../../../lib/validation/auth";
import { signToken, setAuthCookie } from "../../../../../lib/auth";

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
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Email hoặc mật khẩu không đúng" },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(
      password,
      customer.passwordHash,
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: "Email hoặc mật khẩu không đúng" },
        { status: 401 },
      );
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
