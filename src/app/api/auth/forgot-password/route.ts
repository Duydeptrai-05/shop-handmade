import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { forgotPasswordSchema } from "../../../../../lib/validation/auth";
import {
  buildResetLink,
  createResetToken,
  sendResetEmail,
} from "../../../../../lib/passwordReset";

// Luôn trả cùng một câu, dù email có tồn tại hay không (tránh dò email)
const GENERIC_MESSAGE =
  "Nếu email này đã đăng ký, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực 30 phút.";
const COOLDOWN_SECONDS = 60; // yêu cầu liên tiếp trong 60 giây thì không tạo link mới

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: parsed.data.email },
    });

    // Tài khoản không tồn tại hoặc đã bị khóa: không làm gì, vẫn trả câu chung
    if (customer && customer.isActive) {
      const recent = await prisma.passwordResetToken.findFirst({
        where: {
          customerId: customer.id,
          createdAt: { gte: new Date(Date.now() - COOLDOWN_SECONDS * 1000) },
        },
      });

      if (!recent) {
        const { token, tokenHash, expiresAt } = createResetToken();

        // Xóa các link cũ chưa dùng, chỉ giữ link mới nhất
        await prisma.$transaction([
          prisma.passwordResetToken.deleteMany({
            where: { customerId: customer.id, usedAt: null },
          }),
          prisma.passwordResetToken.create({
            data: { customerId: customer.id, tokenHash, expiresAt },
          }),
        ]);

        try {
          await sendResetEmail(
            customer.email,
            customer.name,
            buildResetLink(token),
          );
        } catch (mailError) {
          // Gửi mail lỗi chỉ ghi log, không báo cho người gọi biết email có tồn tại
          console.error("[forgot-password] Gửi mail thất bại:", mailError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { message: GENERIC_MESSAGE },
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại sau" },
      { status: 500 },
    );
  }
}
