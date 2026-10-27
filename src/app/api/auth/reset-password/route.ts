import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { resetPasswordSchema } from "../../../../../lib/validation/auth";
import { hashToken } from "../../../../../lib/passwordReset";

const INVALID_LINK =
  "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { customer: true },
    });

    // Không có, đã dùng, hết hạn hoặc tài khoản bị khóa: cùng một câu lỗi
    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt < new Date() ||
      !record.customer.isActive
    ) {
      return NextResponse.json(
        { success: false, message: INVALID_LINK },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const ok = await prisma.$transaction(async (tx) => {
      // Đánh dấu đã dùng trước; nếu hai yêu cầu cùng lúc thì chỉ một cái thắng
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) return false;

      await tx.customer.update({
        where: { id: record.customerId },
        data: { passwordHash },
      });
      // Các link khác của khách này (nếu còn) cũng vô hiệu
      await tx.passwordResetToken.deleteMany({
        where: { customerId: record.customerId, usedAt: null },
      });
      return true;
    });

    if (!ok) {
      return NextResponse.json(
        { success: false, message: INVALID_LINK },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message:
          "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
      },
    });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại sau" },
      { status: 500 },
    );
  }
}
