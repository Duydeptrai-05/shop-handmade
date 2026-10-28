import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

// Lọc theo trạng thái là tùy chọn: /api/admin/reviews?status=pending
const querySchema = z.object({
  status: z.enum(["pending", "approved", "hidden"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Chỉ Admin được xem toàn bộ đánh giá
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

    const reviews = await prisma.review.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      orderBy: { createdAt: "desc" }, // mới nhất lên đầu
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        createdAt: true,
        customer: { select: { id: true, name: true, email: true } },
        product: {
          select: { id: true, name: true, imageUrl: true, isActive: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
