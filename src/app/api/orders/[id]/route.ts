import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { updateOrderSchema } from "../../../../../lib/validation/order";
import { cancelExpiredBankOrders } from "../../../../../lib/expire-orders";
import { logStockMovement } from "../../../../../lib/stock";

class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Khách hủy đơn hoặc đổi thông tin nhận hàng (chỉ khi đơn còn "pending")
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Xác thực: customerId lấy từ token
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 },
      );
    }

    // 2. Mã đơn trên URL
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { success: false, message: "Mã đơn không hợp lệ" },
        { status: 400 },
      );
    }

    // Hủy trước các đơn chuyển khoản quá hạn để trạng thái luôn đúng
    await cancelExpiredBankOrders().catch((e) =>
      console.error("cancelExpiredBankOrders (PATCH /api/orders/[id]):", e),
    );

    // 3. Validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
      );
    }
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // 4. Tìm đơn CỦA CHÍNH khách này (đơn người khác -> 404, không lộ là có tồn tại)
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: payload.id },
      include: { orderItems: true },
    });
    if (!order) {
      throw new OrderError("Không tìm thấy đơn hàng", 404);
    }

    // 5. Chỉ sửa được khi shop chưa xác nhận
    if (order.status !== "pending") {
      throw new OrderError(
        order.status === "cancelled"
          ? "Đơn này đã được hủy trước đó"
          : "Shop đã xác nhận đơn này nên không thể tự thay đổi, vui lòng liên hệ shop",
      );
    }

    if (input.action === "cancel") {
      // Đã chuyển khoản xong thì hoàn tiền là việc thủ công -> không cho tự hủy
      if (order.paymentMethod === "bank_transfer" && order.isPaid) {
        throw new OrderError(
          "Đơn này đã thanh toán chuyển khoản, vui lòng liên hệ shop để được hỗ trợ hủy và hoàn tiền",
        );
      }

      await prisma.$transaction(async (tx) => {
        // Điều kiện status = pending ngay trong câu update:
        // nếu Admin vừa xác nhận cùng lúc thì count = 0, không hủy nhầm
        const result = await tx.order.updateMany({
          where: { id: orderId, customerId: payload.id, status: "pending" },
          data: { status: "cancelled" },
        });
        if (result.count === 0) {
          throw new OrderError(
            "Trạng thái đơn vừa thay đổi, vui lòng tải lại trang",
            409,
          );
        }

        // Hoàn kho cho từng món và ghi lịch sử
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await logStockMovement(tx, {
            productId: item.productId,
            change: item.quantity,
            reason: "cancel_restore",
            orderId,
            note: "Khách tự hủy đơn",
          });
        }
      });
    } else {
      // update_address
      const result = await prisma.order.updateMany({
        where: { id: orderId, customerId: payload.id, status: "pending" },
        data: {
          customerName: input.customerName,
          phone: input.phone,
          address: input.address,
        },
      });
      if (result.count === 0) {
        throw new OrderError(
          "Trạng thái đơn vừa thay đổi, vui lòng tải lại trang",
          409,
        );
      }
    }

    // 6. Trả đơn mới nhất, cùng dạng với GET /api/orders
    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { include: { product: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
