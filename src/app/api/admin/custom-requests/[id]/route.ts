import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { logAudit } from "../../../../../../lib/audit";
import { adminRequestSchema } from "../../../../../../lib/validation/custom-request";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

type NextStatus = "quoted" | "rejected" | "in_progress" | "completed";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin")
      return fail("Bạn cần đăng nhập Admin", 401);

    const admin = await prisma.admin.findUnique({
      where: { id: Number(payload.id) },
      select: { id: true, username: true },
    });
    if (!admin) return fail("Bạn cần đăng nhập Admin", 401);

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

    const parsed = adminRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400,
      );
    }
    const input = parsed.data;

    const current = await prisma.customRequest.findUnique({
      where: { id },
      select: { id: true, status: true, title: true },
    });
    if (!current) return fail("Không tìm thấy yêu cầu", 404);

    // Mỗi hành động: trạng thái được phép đi từ đâu, đi tới đâu, ghi gì vào DB và nhật ký
    let from: string[];
    let to: NextStatus;
    let extra: { quotedPrice?: number; adminNote?: string | null } = {};
    let summary: string;
    let errMsg: string;

    switch (input.action) {
      case "quote":
        from = ["pending", "quoted"]; // cho phép báo lại giá khi khách chưa trả lời
        to = "quoted";
        extra = { quotedPrice: input.quotedPrice };
        if (input.adminNote !== undefined)
          extra.adminNote = input.adminNote || null;
        summary = `báo giá yêu cầu #${id} "${current.title}": ${input.quotedPrice.toLocaleString("vi-VN")}đ`;
        errMsg =
          "Chỉ báo giá được khi yêu cầu đang chờ báo giá hoặc khách chưa trả lời";
        break;
      case "reject":
        from = ["pending"];
        to = "rejected";
        extra = { adminNote: input.adminNote };
        summary = `từ chối yêu cầu #${id} "${current.title}"`;
        errMsg = "Chỉ từ chối được khi yêu cầu đang chờ báo giá";
        break;
      case "start":
        from = ["accepted"];
        to = "in_progress";
        summary = `bắt đầu làm yêu cầu #${id} "${current.title}"`;
        errMsg = "Chỉ bắt đầu làm được khi khách đã đồng ý báo giá";
        break;
      case "complete":
        from = ["in_progress"];
        to = "completed";
        summary = `hoàn thành yêu cầu #${id} "${current.title}"`;
        errMsg = "Chỉ hoàn thành được khi yêu cầu đang làm";
        break;
    }

    if (!from.includes(current.status)) return fail(errMsg, 400);

    // updateMany kèm điều kiện status: nếu khách vừa hủy/trả lời giữa chừng thì không ghi đè
    const ok = await prisma.$transaction(async (tx) => {
      const upd = await tx.customRequest.updateMany({
        where: { id, status: current.status },
        data: { status: to, ...extra },
      });
      if (upd.count === 0) return false;

      await logAudit(
        tx,
        { id: admin.id, username: admin.username },
        {
          action: `custom_request.${input.action}`,
          entityType: "custom_request",
          entityId: id,
          summary,
        },
      );
      return true;
    });
    if (!ok)
      return fail("Yêu cầu vừa được cập nhật, vui lòng tải lại trang", 409);

    const row = await prisma.customRequest.findUnique({ where: { id } });
    return NextResponse.json({
      success: true,
      data: {
        id,
        status: row?.status ?? to,
        quotedPrice: row?.quotedPrice == null ? null : Number(row.quotedPrice),
        adminNote: row?.adminNote ?? null,
      },
    });
  } catch (e) {
    console.error("[admin/custom-requests/id]", e);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}
