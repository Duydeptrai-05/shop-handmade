import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { cancelExpiredBankOrders } from "../../../../../lib/expire-orders"; // MỚI

// Lọc theo trạng thái là tùy chọn: /api/admin/orders?status=pending
const querySchema = z.object({
  status: z
    .enum(["pending", "confirmed", "shipped", "completed", "cancelled"])
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Chỉ Admin được xem toàn bộ đơn hàng
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    const parsed = querySchema.safeParse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Trạng thái lọc không hợp lệ" },
        { status: 400 },
      );
    }

    // MỚI: hủy đơn chuyển khoản quá hạn trước khi trả danh sách,
    // để Admin thấy đúng trạng thái và kho đã được hoàn
    await cancelExpiredBankOrders().catch((e) =>
      console.error("cancelExpiredBankOrders (GET /api/admin/orders):", e),
    );

    const orders = await prisma.order.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      orderBy: { id: "desc" }, // đơn mới nhất lên đầu
      include: {
        orderItems: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
