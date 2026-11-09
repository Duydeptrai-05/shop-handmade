import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { logStockMovement } from "../../../../../../lib/stock"; // STOCK
import { logAudit } from "../../../../../../lib/audit"; // AUDIT

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "completed", "cancelled"]),
});

// Trạng thái hiện tại -> các trạng thái được phép chuyển tới.
// completed và cancelled là trạng thái cuối, không đổi được nữa.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

// AUDIT: nhãn tiếng Việt để câu mô tả trong nhật ký dễ đọc
const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

class AdminOrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Chỉ Admin được đổi trạng thái
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    // AUDIT: lấy username Admin để ghi nhật ký
    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true },
    });
    if (!admin) {
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

    // 3. Kiểm tra body
    const body = await request.json().catch(() => null);
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Trạng thái không hợp lệ" },
        { status: 400 },
      );
    }
    const newStatus = parsed.data.status;

    // 4. Đổi trạng thái (và hoàn kho nếu hủy) trong CÙNG một transaction
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order) {
        throw new AdminOrderError("Không tìm thấy đơn hàng", 404);
      }

      const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new AdminOrderError(
          `Không thể chuyển đơn từ "${order.status}" sang "${newStatus}"`,
        );
      }
      if (
        order.paymentMethod === "bank_transfer" &&
        !order.isPaid &&
        newStatus !== "cancelled"
      ) {
        throw new AdminOrderError(
          "Đơn chuyển khoản chưa nhận được tiền, hãy xác nhận đã nhận tiền trước khi xử lý đơn",
        );
      }

      // Điều kiện status = trạng thái vừa đọc: nếu có Admin khác vừa đổi đơn
      // này trước, count = 0 và ta dừng lại, tránh hoàn kho 2 lần
      const result = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status: newStatus },
      });
      if (result.count === 0) {
        throw new AdminOrderError(
          "Đơn hàng vừa được cập nhật bởi người khác, vui lòng tải lại",
          409,
        );
      }

      // Hủy đơn -> trả hàng về kho
      if (newStatus === "cancelled") {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          // STOCK: ghi lịch sử hoàn kho, cùng transaction
          await logStockMovement(tx, {
            productId: item.productId,
            change: item.quantity,
            reason: "cancel_restore",
            orderId,
            note: "Admin hủy đơn",
          });
        }
      }

      // AUDIT: ghi nhật ký cùng transaction, đổi trạng thái thành công thì mới có log
      await logAudit(tx, admin, {
        action: newStatus === "cancelled" ? "order.cancel" : "order.status",
        entityType: "order",
        entityId: orderId,
        summary: `Đổi đơn #${orderId} từ "${STATUS_LABEL[order.status]}" sang "${STATUS_LABEL[newStatus]}"`,
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { product: true } } },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AdminOrderError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
