import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../../lib/auth";

class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Admin xác nhận đã nhận được tiền chuyển khoản của một đơn
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Chỉ Admin được xác nhận thanh toán
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    // 2. Kiểm tra id trên URL
    const { id } = await params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { success: false, message: "Mã đơn hàng không hợp lệ" },
        { status: 400 },
      );
    }

    // 3. Kiểm tra điều kiện và ghi nhận trong cùng một transaction
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new PaymentError("Không tìm thấy đơn hàng", 404);
      }
      if (order.paymentMethod !== "bank_transfer") {
        throw new PaymentError("Đơn này không thanh toán bằng chuyển khoản");
      }
      if (order.status === "cancelled") {
        throw new PaymentError(
          "Đơn hàng đã bị hủy, không thể xác nhận thanh toán",
        );
      }
      if (order.isPaid) {
        throw new PaymentError("Đơn này đã được xác nhận thanh toán rồi", 409);
      }

      // Điều kiện isPaid = false ngay trong câu update: nếu có Admin khác vừa
      // xác nhận trước thì count = 0, tránh ghi đè giờ nhận tiền
      const result = await tx.order.updateMany({
        where: { id: orderId, isPaid: false },
        data: { isPaid: true, paidAt: new Date() },
      });
      if (result.count === 0) {
        throw new PaymentError(
          "Đơn hàng vừa được cập nhật bởi người khác, vui lòng tải lại",
          409,
        );
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { product: true } } },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("PATCH /api/admin/orders/[id]/payment error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
