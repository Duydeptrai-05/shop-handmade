import { NextResponse } from "next/server";
import { getAuthPayload } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  try {
    const payload = await getAuthPayload();

    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài khoản" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("ME_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
