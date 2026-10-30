import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { customerRespondSchema } from "../../../../../lib/validation/custom-request";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Luật chuyển trạng thái phía khách
const RULES = {
  accept: {
    from: ["quoted"],
    to: "accepted",
    error: "Chỉ đồng ý được khi shop đã báo giá",
  },
  decline: {
    from: ["quoted"],
    to: "rejected",
    error: "Chỉ từ chối được khi shop đã báo giá",
  },
  cancel: {
    from: ["pending", "quoted"],
    to: "cancelled",
    error: "Yêu cầu này không thể hủy ở trạng thái hiện tại",
  },
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "customer")
      return fail("Bạn cần đăng nhập", 401);
    const customerId = Number(payload.id);

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0)
      return fail("Mã yêu cầu không hợp lệ", 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const parsed = customerRespondSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400,
      );
    }
    const rule = RULES[parsed.data.action];

    // Yêu cầu của người khác cũng trả 404 để không lộ sự tồn tại
    const current = await prisma.customRequest.findFirst({
      where: { id, customerId },
      select: { id: true, status: true },
    });
    if (!current) return fail("Không tìm thấy yêu cầu", 404);

    if (!(rule.from as readonly string[]).includes(current.status)) {
      return fail(rule.error, 400);
    }

    // updateMany kèm điều kiện status: nếu Admin vừa đổi trạng thái giữa chừng thì không ghi đè
    const result = await prisma.customRequest.updateMany({
      where: { id, customerId, status: current.status },
      data: { status: rule.to },
    });
    if (result.count === 0) {
      return fail("Yêu cầu vừa được cập nhật, vui lòng tải lại trang", 409);
    }

    return NextResponse.json({ success: true, data: { id, status: rule.to } });
  } catch (e) {
    console.error("[custom-requests/id]", e);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}
