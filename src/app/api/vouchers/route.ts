// src/app/api/vouchers/route.ts
// GET: danh sách voucher đang dùng được, cho khách đã đăng nhập xem ở trang thanh toán.
// Voucher nào cũng công khai. Admin tạo, bật, tắt thì danh sách đổi theo ngay.
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthPayload } from "../../../../lib/auth";

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập" },
        { status: 401 },
      );
    }
    const customerId = payload.id;
    const now = new Date();

    // Voucher đang bật, đã đến ngày bắt đầu và chưa hết hạn
    const vouchers = await prisma.voucher.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });

    const data = await Promise.all(
      vouchers.map(async (v) => {
        // Mã nằm ở cột nào của đơn phụ thuộc loại voucher (giống lib/vouchers.ts)
        const filter =
          v.type === "discount"
            ? { discountVoucherId: v.id }
            : { shippingVoucherId: v.id };

        const used =
          v.usageLimit !== null
            ? await prisma.order.count({
                where: { status: { not: "cancelled" }, ...filter },
              })
            : 0;
        const usedByMe =
          (await prisma.order.count({
            where: { customerId, status: { not: "cancelled" }, ...filter },
          })) > 0;

        return {
          id: v.id,
          code: v.code,
          description: v.description,
          type: v.type, // "discount" | "shipping"
          discountKind: v.discountKind, // "percent" | "fixed"
          value: Number(v.value),
          maxDiscount: v.maxDiscount === null ? null : Number(v.maxDiscount),
          minOrderValue: Number(v.minOrderValue),
          expiresAt: v.expiresAt,
          remaining:
            v.usageLimit === null ? null : Math.max(v.usageLimit - used, 0),
          soldOut: v.usageLimit !== null && used >= v.usageLimit,
          usedByMe,
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[vouchers] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Không tải được danh sách voucher" },
      { status: 500 },
    );
  }
}
