import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthPayload } from "../../../../lib/auth";
import { createOrderSchema } from "../../../../lib/validation/order";
import { cancelExpiredBankOrders } from "../../../../lib/expire-orders";
import { calcOrderTotals, toVoucherRule } from "../../../../lib/shipping"; // VOUCHER
import { resolveOrderVouchers } from "../../../../lib/vouchers"; // VOUCHER

// Lỗi nghiệp vụ có status HTTP riêng (khác lỗi hệ thống 500)
class OrderError extends Error {
  status: number;
  field?: "discountCode" | "shippingCode"; // VOUCHER: lỗi thuộc ô mã nào
  constructor(
    message: string,
    status = 400,
    field?: "discountCode" | "shippingCode",
  ) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Xác thực — customerId LẤY TỪ TOKEN, không nhận từ body client
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để đặt hàng" },
        { status: 401 },
      );
    }

    // Hủy các đơn chuyển khoản quá hạn trước để hoàn kho (và hoàn lượt dùng mã),
    // rồi mới kiểm tra cho đơn này. Lỗi ở bước này không được chặn việc đặt hàng.
    await cancelExpiredBankOrders().catch((e) =>
      console.error("cancelExpiredBankOrders (POST /api/orders):", e),
    );

    // 2. Validate body
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu đơn hàng không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // 3. Lấy thông tin sản phẩm thật từ DB (KHÔNG tin giá/tên client gửi lên)
    const productIds = input.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new OrderError(
          `Sản phẩm id=${item.productId} không tồn tại hoặc đã ngừng bán`,
        );
      }
      if (product.stock < item.quantity) {
        throw new OrderError(
          `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho`,
        );
      }
    }

    // VOUCHER: tiền hàng tính từ giá trong DB
    const subtotal = input.items.reduce(
      (sum, item) =>
        sum + Number(productMap.get(item.productId)!.price) * item.quantity,
      0,
    );

    // 4. Transaction: kiểm tra voucher, trừ tồn kho, tạo Order + OrderItem
    const order = await prisma.$transaction(async (tx) => {
      // VOUCHER: kiểm tra 2 ô mã ngay trong transaction
      const vouchers = await resolveOrderVouchers(tx, {
        discountCode: input.discountCode,
        shippingCode: input.shippingCode,
        customerId: payload.id,
        subtotal,
      });
      if (vouchers.ok === false) {
        throw new OrderError(vouchers.message, 400, vouchers.field);
      }

      const totals = calcOrderTotals({
        subtotal,
        discountVoucher: vouchers.discountVoucher
          ? toVoucherRule(vouchers.discountVoucher)
          : null,
        shippingVoucher: vouchers.shippingVoucher
          ? toVoucherRule(vouchers.shippingVoucher)
          : null,
      });

      // Trừ kho từng sản phẩm, điều kiện stock >= quantity ngay trong câu
      // update để tránh race condition (2 người đặt cùng lúc, hàng còn ít)
      for (const item of input.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          const product = productMap.get(item.productId);
          throw new OrderError(
            `Sản phẩm "${product?.name ?? item.productId}" vừa hết hàng, vui lòng thử lại`,
          );
        }
      }

      return tx.order.create({
        data: {
          customerId: payload.id,
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
          paymentMethod: input.paymentMethod,
          // VOUCHER: các khoản tiền "đóng băng" tại lúc đặt
          shippingFee: totals.shippingFee,
          discountAmount: totals.discountAmount,
          shippingDiscount: totals.shippingDiscount,
          discountVoucherId: vouchers.discountVoucher?.id ?? null,
          shippingVoucherId: vouchers.shippingVoucher?.id ?? null,
          orderItems: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              // Giá "đóng băng" tại thời điểm đặt hàng, lấy từ DB
              priceAtOrder: productMap.get(item.productId)!.price,
            })),
          },
        },
        include: {
          orderItems: { include: { product: true } },
        },
      });
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { success: false, message: error.message, field: error.field },
        { status: error.status },
      );
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}

// Lịch sử đơn hàng của CHÍNH khách đang đăng nhập
export async function GET() {
  try {
    // customerId lấy từ token, không nhận từ query/body
    // -> khách không thể xem đơn của người khác
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để xem đơn hàng" },
        { status: 401 },
      );
    }

    // Hủy đơn chuyển khoản quá hạn trước khi trả danh sách,
    // để khách thấy đúng trạng thái "Đã hủy"
    await cancelExpiredBankOrders().catch((e) =>
      console.error("cancelExpiredBankOrders (GET /api/orders):", e),
    );

    const orders = await prisma.order.findMany({
      where: { customerId: payload.id },
      orderBy: { id: "desc" }, // đơn mới nhất lên đầu
      include: {
        orderItems: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
