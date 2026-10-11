import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { registerSchema } from "../../../../../lib/validation/auth";
import { signToken, setAuthCookie } from "../../../../../lib/auth";

const BCRYPT_COST = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email này đã được đăng ký" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const customer = await prisma.customer.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    const token = signToken({ id: customer.id, role: "customer" });

    const response = NextResponse.json({ success: true, data: customer });
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
