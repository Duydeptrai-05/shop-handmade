import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentCustomer } from "../../../../../lib/auth";

// Luôn đọc cookie mới, không cache
export const dynamic = "force-dynamic";

// GET /api/orders/shipping-count
// Trả số đơn đang giao (shipped) của khách đang đăng nhập.
// Chưa đăng nhập hoặc không phải Customer thì trả count = 0 (không báo lỗi,
// vì Header gọi API này ở mọi trang).
export async function GET() {
  try {
    const customer = await getCurrentCustomer();

    if (!customer) {
      return NextResponse.json({ success: true, data: { count: 0 } });
    }

    const count = await prisma.order.count({
      where: { customerId: customer.id, status: "shipped" },
    });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error("[shipping-count]", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
