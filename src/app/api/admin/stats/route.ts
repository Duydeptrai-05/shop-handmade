import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

// /api/admin/stats?range=today | 7d | 30d | month
const querySchema = z.object({
  range: z.enum(["today", "7d", "30d", "month"]).default("7d"),
});

// Kho dưới mức này thì cảnh báo sắp hết
const LOW_STOCK = 10;

// Việt Nam là UTC+7: nhóm theo ngày phải tính theo giờ VN, không theo UTC
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Chuỗi ngày dạng YYYY-MM-DD theo giờ VN
function vnDateKey(date: Date) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

// 00:00 giờ VN của ngày chứa `date` (trả về mốc thời gian UTC)
function startOfVnDay(date: Date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - VN_OFFSET_MS);
}

export async function GET(request: NextRequest) {
  try {
    // Chỉ Admin được xem thống kê
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    const parsed = querySchema.safeParse({
      range: request.nextUrl.searchParams.get("range") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Khoảng thời gian không hợp lệ" },
        { status: 400 },
      );
    }
    const { range } = parsed.data;

    // Xác định mốc bắt đầu của kỳ thống kê
    const now = new Date();
    const todayStart = startOfVnDay(now);
    let start: Date;
    if (range === "today") {
      start = todayStart;
    } else if (range === "7d") {
      start = new Date(todayStart.getTime() - 6 * DAY_MS);
    } else if (range === "30d") {
      start = new Date(todayStart.getTime() - 29 * DAY_MS);
    } else {
      // Từ ngày 1 của tháng hiện tại (giờ VN)
      const shifted = new Date(now.getTime() + VN_OFFSET_MS);
      shifted.setUTCDate(1);
      shifted.setUTCHours(0, 0, 0, 0);
      start = new Date(shifted.getTime() - VN_OFFSET_MS);
    }

    // Tất cả đơn tạo trong kỳ
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start } },
      include: { orderItems: { include: { product: true } } },
    });

    // Tạo sẵn từng ngày trong kỳ (kể cả ngày không có đơn) để biểu đồ liền mạch
    const dayCount =
      Math.round((todayStart.getTime() - start.getTime()) / DAY_MS) + 1;
    const daily = new Map<
      string,
      { date: string; revenue: number; orders: number; completed: number }
    >();
    for (let i = 0; i < dayCount; i++) {
      const key = vnDateKey(new Date(start.getTime() + i * DAY_MS));
      daily.set(key, { date: key, revenue: 0, orders: 0, completed: 0 });
    }

    let revenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let inProgressCount = 0;
    const productSales = new Map<
      number,
      { id: number; name: string; imageUrl: string | null; quantity: number }
    >();

    for (const order of orders) {
      // Giá trị đơn = tổng (giá lúc đặt x số lượng); Decimal của Prisma phải Number()
      const orderTotal = order.orderItems.reduce(
        (sum, item) => sum + Number(item.priceAtOrder) * item.quantity,
        0,
      );

      const day = daily.get(vnDateKey(order.createdAt));
      if (day) day.orders += 1;

      if (order.status === "cancelled") {
        cancelledCount += 1;
        continue; // đơn đã hủy không tính vào doanh thu hay bán chạy
      }

      if (order.status === "completed") {
        // Doanh thu chỉ tính đơn đã giao thành công
        revenue += orderTotal;
        completedCount += 1;
        if (day) {
          day.revenue += orderTotal;
          day.completed += 1;
        }
      } else {
        inProgressCount += 1;
      }

      // Sản phẩm bán chạy: gom số lượng từ mọi đơn chưa hủy
      for (const item of order.orderItems) {
        const current = productSales.get(item.productId);
        if (current) {
          current.quantity += item.quantity;
        } else {
          productSales.set(item.productId, {
            id: item.productId,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            quantity: item.quantity,
          });
        }
      }
    }

    const topProducts = [...productSales.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Cảnh báo sản phẩm đang bán nhưng sắp hết hàng
    const lowStock = await prisma.product.findMany({
      where: { isActive: true, stock: { lt: LOW_STOCK } },
      orderBy: { stock: "asc" },
      take: 5,
      select: { id: true, name: true, stock: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        range,
        summary: {
          revenue,
          totalOrders: orders.length,
          completedOrders: completedCount,
          cancelledOrders: cancelledCount,
          inProgressOrders: inProgressCount,
          averageOrderValue:
            completedCount > 0 ? Math.round(revenue / completedCount) : 0,
        },
        daily: [...daily.values()],
        topProducts,
        lowStock,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
