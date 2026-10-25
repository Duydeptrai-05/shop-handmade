import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

// Chuẩn hóa để tìm không phân biệt hoa thường (giữ nguyên dấu tiếng Việt,
// vì collation của MariaDB bỏ qua dấu nên lọc bằng JS cho chính xác)
function normalize(text: string) {
  return text.normalize("NFC").toLowerCase();
}

// GET /api/admin/customers?q=...&status=active|locked
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập bằng tài khoản Admin" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = normalize((searchParams.get("q") ?? "").trim());
    const status = searchParams.get("status");

    const customers = await prisma.customer.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        // chỉ tính đơn chưa hủy
        orders: {
          where: { status: { not: "cancelled" } },
          select: {
            orderItems: { select: { quantity: true, priceAtOrder: true } },
          },
        },
      },
    });

    let rows = customers.map((c) => {
      const totalSpent = c.orders.reduce(
        (sum, order) =>
          sum +
          order.orderItems.reduce(
            (s, item) => s + Number(item.priceAtOrder) * item.quantity,
            0,
          ),
        0,
      );
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        isActive: c.isActive,
        orderCount: c.orders.length,
        totalSpent,
      };
    });

    if (status === "active") rows = rows.filter((r) => r.isActive);
    if (status === "locked") rows = rows.filter((r) => !r.isActive);

    if (q) {
      rows = rows.filter(
        (r) =>
          normalize(r.name).includes(q) ||
          normalize(r.email).includes(q) ||
          (r.phone ?? "").includes(q),
      );
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("ADMIN_CUSTOMERS_LIST_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
