import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { updateVoucherSchema } from "../../../../../../lib/validation/voucher";
import { logAudit } from "../../../../../../lib/audit"; // AUDIT

type RouteContext = { params: Promise<{ id: string }> };

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Số lượt đã dùng: chỉ đếm đơn chưa hủy, theo đúng loại của voucher
async function countUsed(voucherId: number, type: string) {
  return prisma.order.count({
    where: {
      status: { not: "cancelled" },
      ...(type === "discount"
        ? { discountVoucherId: voucherId }
        : { shippingVoucherId: voucherId }),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return fail("Bạn không có quyền truy cập", 401);
    }

    // AUDIT: lấy Admin đang thao tác để ghi nhật ký
    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true },
    });
    if (!admin) return fail("Bạn không có quyền truy cập", 401);

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return fail("Mã voucher không hợp lệ", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = updateVoucherSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400,
      );
    }
    const data = parsed.data;

    const current = await prisma.voucher.findUnique({ where: { id } });
    if (!current) return fail("Không tìm thấy voucher", 404);

    // Giá trị sau khi sửa = giá trị mới nếu có, không thì giữ giá trị cũ
    const value =
      data.value !== undefined ? Number(data.value) : Number(current.value);
    if (!(value > 0)) return fail("Giá trị giảm phải lớn hơn 0", 400);
    if (current.discountKind === "percent" && value > 100) {
      return fail("Giảm theo % không được quá 100", 400);
    }

    const startsAt =
      data.startsAt !== undefined
        ? data.startsAt
          ? new Date(data.startsAt)
          : null
        : current.startsAt;
    const expiresAt =
      data.expiresAt !== undefined
        ? data.expiresAt
          ? new Date(data.expiresAt)
          : null
        : current.expiresAt;
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      return fail("Ngày hết hạn phải sau ngày bắt đầu", 400);
    }

    // Không cho hạ giới hạn lượt dùng xuống dưới số lượt đã dùng
    const usedCount = await countUsed(id, current.type);
    if (
      data.usageLimit !== undefined &&
      data.usageLimit !== null &&
      data.usageLimit < usedCount
    ) {
      return fail(
        `Voucher đã được dùng ${usedCount} lượt, giới hạn không được nhỏ hơn số này`,
        400,
      );
    }

    const voucher = await prisma.$transaction(async (tx) => {
      const updated = await tx.voucher.update({
        where: { id },
        data: {
          ...(data.description !== undefined && {
            description: data.description || null,
          }),
          ...(data.value !== undefined && { value: data.value }),
          // Mức giảm tối đa chỉ có ý nghĩa khi giảm theo %
          ...(current.discountKind === "percent"
            ? data.maxDiscount !== undefined && {
                maxDiscount: data.maxDiscount ?? null,
              }
            : { maxDiscount: null }),
          ...(data.minOrderValue !== undefined && {
            minOrderValue: data.minOrderValue ?? 0,
          }),
          ...(data.startsAt !== undefined && { startsAt }),
          ...(data.expiresAt !== undefined && { expiresAt }),
          ...(data.usageLimit !== undefined && {
            usageLimit: data.usageLimit ?? null,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      // AUDIT: so sánh với giá trị cũ để chỉ ghi những gì thật sự đổi
      const fmt = (n: number) =>
        current.discountKind === "percent"
          ? `${n}%`
          : `${n.toLocaleString("vi-VN")}đ`;
      const toggled =
        data.isActive !== undefined && data.isActive !== current.isActive;
      const changes: string[] = [];
      if (data.value !== undefined && value !== Number(current.value))
        changes.push(`giá trị ${fmt(Number(current.value))} → ${fmt(value)}`);
      if (
        data.description !== undefined &&
        (data.description || null) !== (current.description ?? null)
      )
        changes.push("đổi mô tả");
      if (
        current.discountKind === "percent" &&
        data.maxDiscount !== undefined &&
        (data.maxDiscount ?? null) !==
          (current.maxDiscount === null ? null : Number(current.maxDiscount))
      )
        changes.push("đổi mức giảm tối đa");
      if (
        data.minOrderValue !== undefined &&
        (data.minOrderValue ?? 0) !== Number(current.minOrderValue)
      )
        changes.push("đổi đơn tối thiểu");
      if (
        data.startsAt !== undefined &&
        (startsAt?.getTime() ?? null) !== (current.startsAt?.getTime() ?? null)
      )
        changes.push("đổi ngày bắt đầu");
      if (
        data.expiresAt !== undefined &&
        (expiresAt?.getTime() ?? null) !==
          (current.expiresAt?.getTime() ?? null)
      )
        changes.push("đổi ngày hết hạn");
      if (
        data.usageLimit !== undefined &&
        (data.usageLimit ?? null) !== current.usageLimit
      )
        changes.push(
          `giới hạn lượt ${current.usageLimit ?? "không giới hạn"} → ${data.usageLimit ?? "không giới hạn"}`,
        );

      if (changes.length > 0 || toggled) {
        const onlyToggle = toggled && changes.length === 0;
        await logAudit(
          tx,
          { id: admin.id, username: admin.username },
          {
            action: onlyToggle ? "voucher.toggle" : "voucher.update",
            entityType: "voucher",
            entityId: id,
            summary: onlyToggle
              ? `${data.isActive ? "Bật" : "Tắt"} voucher ${current.code}`
              : `Sửa voucher ${current.code}: ${[
                  ...(toggled ? [data.isActive ? "bật" : "tắt"] : []),
                  ...changes,
                ].join(", ")}`,
          },
        );
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: { ...voucher, usedCount },
    });
  } catch (error) {
    console.error("PATCH /api/admin/vouchers/[id] error:", error);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}

// Chỉ xóa được voucher chưa từng gắn vào đơn nào; đã dùng rồi thì chỉ tắt
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return fail("Bạn không có quyền truy cập", 401);
    }

    // AUDIT: lấy Admin đang thao tác để ghi nhật ký
    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true },
    });
    if (!admin) return fail("Bạn không có quyền truy cập", 401);

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return fail("Mã voucher không hợp lệ", 400);
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      select: { id: true, code: true },
    });
    if (!voucher) return fail("Không tìm thấy voucher", 404);

    // Tính cả đơn đã hủy: đơn cũ vẫn đang tham chiếu voucher này
    const linked = await prisma.order.count({
      where: {
        OR: [{ discountVoucherId: id }, { shippingVoucherId: id }],
      },
    });
    if (linked > 0) {
      return fail(
        "Voucher đã gắn với đơn hàng nên không xóa được, hãy tắt voucher thay vì xóa",
        409,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.voucher.delete({ where: { id } });
      await logAudit(
        tx,
        { id: admin.id, username: admin.username },
        {
          action: "voucher.delete",
          entityType: "voucher",
          entityId: id,
          summary: `Xóa voucher ${voucher.code}`,
        },
      );
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("DELETE /api/admin/vouchers/[id] error:", error);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}
