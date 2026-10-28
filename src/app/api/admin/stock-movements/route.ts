import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

const REASONS = ["import", "sale", "cancel_restore", "adjustment"] as const;
type Reason = (typeof REASONS)[number];

// GET /api/admin/stock-movements?productId=2&reason=import&q=nến&page=1&pageSize=20
export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập quản trị" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const productId = Number(searchParams.get("productId"));
    const reasonParam = searchParams.get("reason");
    const q = searchParams.get("q")?.trim();
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Math.floor(Number(searchParams.get("pageSize"))) || 20),
    );

    if (reasonParam && !REASONS.includes(reasonParam as Reason)) {
      return NextResponse.json(
        { success: false, message: "Lý do không hợp lệ" },
        { status: 400 },
      );
    }

    const where = {
      ...(Number.isInteger(productId) && productId > 0 ? { productId } : {}),
      ...(reasonParam ? { reason: reasonParam as Reason } : {}),
      ...(q ? { product: { name: { contains: q } } } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { id: "desc" }, // mới nhất lên đầu
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: { select: { id: true, name: true } } },
      }),
    ]);

    const data = rows.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      orderId: m.orderId,
      change: m.change,
      stockAfter: m.stockAfter,
      reason: m.reason,
      note: m.note,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ success: true, data, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/admin/stock-movements lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải lịch sử tồn kho" },
      { status: 500 },
    );
  }
}
