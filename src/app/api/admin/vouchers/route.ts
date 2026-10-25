import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { createVoucherSchema } from "../../../../../lib/validation/voucher";

// Đơn đã hủy không tính vào số lượt đã dùng
const activeOrderFilter = { where: { status: { not: "cancelled" as const } } };

// Gắn thêm usedCount (số lượt đã dùng) vào voucher
function withUsedCount<
  T extends {
    type: string;
    _count: { discountOrders: number; shippingOrders: number };
  },
>(voucher: T) {
  const { _count, ...rest } = voucher;
  return {
    ...rest,
    usedCount:
      voucher.type === "discount"
        ? _count.discountOrders
        : _count.shippingOrders,
  };
}

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    const vouchers = await prisma.voucher.findMany({
      orderBy: { id: "desc" }, // voucher mới nhất lên đầu
      include: {
        _count: {
          select: {
            discountOrders: activeOrderFilter,
            shippingOrders: activeOrderFilter,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: vouchers.map(withUsedCount),
    });
  } catch (error) {
    console.error("GET /api/admin/vouchers error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createVoucherSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Mã đã tồn tại thì báo rõ thay vì để lỗi cơ sở dữ liệu
    const existing = await prisma.voucher.findUnique({
      where: { code: data.code },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Mã ${data.code} đã tồn tại` },
        { status: 409 },
      );
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: data.code,
        description: data.description || null,
        type: data.type,
        discountKind: data.discountKind,
        value: data.value,
        // Mức giảm tối đa chỉ có ý nghĩa khi giảm theo %
        maxDiscount:
          data.discountKind === "percent" ? (data.maxDiscount ?? null) : null,
        minOrderValue: data.minOrderValue ?? 0,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        usageLimit: data.usageLimit ?? null,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, data: { ...voucher, usedCount: 0 } },
      { status: 201 },
    );
  } catch (error) {
    // Hai người cùng tạo một mã cùng lúc: cơ sở dữ liệu báo trùng khóa
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Mã voucher đã tồn tại" },
        { status: 409 },
      );
    }
    console.error("POST /api/admin/vouchers error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
