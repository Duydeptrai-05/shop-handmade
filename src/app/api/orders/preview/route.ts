import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { createOrderSchema } from "../../../../../lib/validation/order";
import { calcOrderTotals, toVoucherRule } from "../../../../../lib/shipping";
import { findUsableVoucher } from "../../../../../lib/vouchers";

// Chỉ cần giỏ hàng và hai ô mã, lấy lại từ schema đặt đơn để quy tắc luôn khớp nhau
const previewSchema = createOrderSchema.pick({
  items: true,
  discountCode: true,
  shippingCode: true,
});

// Xem trước tiền đơn hàng: KHÔNG tạo đơn, KHÔNG trừ kho.
// Mã nào lỗi thì báo riêng ở ô đó và tính tiền như chưa nhập mã ấy.
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // Giá lấy từ DB, không tin client
    const products = await prisma.product.findMany({
      where: {
        id: { in: input.items.map((item) => item.productId) },
        isActive: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `Sản phẩm id=${item.productId} không tồn tại hoặc đã ngừng bán`,
          },
          { status: 400 },
        );
      }
      subtotal += Number(product.price) * item.quantity;
    }

    const errors: { discountCode?: string; shippingCode?: string } = {};
    let discountVoucher = null;
    let shippingVoucher = null;

    if (input.discountCode && input.discountCode.trim()) {
      const r = await findUsableVoucher(prisma, {
        code: input.discountCode,
        slot: "discount",
        customerId: payload.id,
        subtotal,
      });
      if (r.ok === false) errors.discountCode = r.message;
      else discountVoucher = r.voucher;
    }

    if (input.shippingCode && input.shippingCode.trim()) {
      const r = await findUsableVoucher(prisma, {
        code: input.shippingCode,
        slot: "shipping",
        customerId: payload.id,
        subtotal,
      });
      if (r.ok === false) errors.shippingCode = r.message;
      else shippingVoucher = r.voucher;
    }

    const totals = calcOrderTotals({
      subtotal,
      discountVoucher: discountVoucher ? toVoucherRule(discountVoucher) : null,
      shippingVoucher: shippingVoucher ? toVoucherRule(shippingVoucher) : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...totals,
        discountVoucher: discountVoucher
          ? {
              code: discountVoucher.code,
              description: discountVoucher.description,
            }
          : null,
        shippingVoucher: shippingVoucher
          ? {
              code: shippingVoucher.code,
              description: shippingVoucher.description,
            }
          : null,
        errors,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/preview error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
