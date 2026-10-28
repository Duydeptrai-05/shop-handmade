import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { updateReviewStatusSchema } from "../../../../../../lib/validation/review";
import { logAudit } from "../../../../../../lib/audit";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH: Admin duyệt (approved) hoặc ẩn (hidden) một đánh giá
export async function PATCH(request: Request, { params }: Context) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

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

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mã đánh giá không hợp lệ" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
      );
    }

    const parsed = updateReviewStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Trạng thái không hợp lệ (chỉ nhận approved hoặc hidden)",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.review.findUnique({
      where: { id },
      select: {
        status: true,
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đánh giá" },
        { status: 404 },
      );
    }

    if (existing.status === parsed.data.status) {
      return NextResponse.json(
        { success: false, message: "Đánh giá đã ở trạng thái này rồi" },
        { status: 409 },
      );
    }

    const newStatus = parsed.data.status;
    let verb: string;
    if (newStatus === "hidden") {
      verb = "Ẩn";
    } else if (existing.status === "hidden") {
      verb = "Hiện lại";
    } else {
      verb = "Duyệt";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id },
        data: { status: newStatus },
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          createdAt: true,
          customer: { select: { id: true, name: true, email: true } },
          product: {
            select: { id: true, name: true, imageUrl: true, isActive: true },
          },
        },
      });

      await logAudit(
        tx,
        { id: admin.id, username: admin.username },
        {
          action: newStatus === "hidden" ? "review.hide" : "review.approve",
          entityType: "review",
          entityId: id,
          summary: `${verb} đánh giá #${id} của "${existing.customer.name}" cho "${existing.product.name}"`,
        },
      );

      return review;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/admin/reviews/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
