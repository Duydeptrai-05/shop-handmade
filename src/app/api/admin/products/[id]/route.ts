import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { updateProductSchema } from "../../../../../../lib/validation/product";
import { logStockMovement } from "../../../../../../lib/stock"; //
import { logAudit } from "../../../../../../lib/audit"; // AUDIT

type Context = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const payload = await getAuthPayload();
  if (!payload || payload.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Bạn cần đăng nhập quản trị" },
      { status: 401 },
    );
  }
  return null;
}

// AUDIT: lấy Admin đang thao tác để ghi nhật ký
async function getAdminActor() {
  const payload = await getAuthPayload();
  if (!payload) return null;
  return prisma.admin.findUnique({
    where: { id: payload.id },
    select: { id: true, username: true },
  });
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/admin/products/[id]  — chỉ gửi các trường cần đổi
export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const admin = await getAdminActor();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập quản trị" },
        { status: 401 },
      );
    }

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mã sản phẩm không hợp lệ" },
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

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { success: false, message: "Không có thông tin nào để cập nhật" },
        { status: 400 },
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm" },
        { status: 404 },
      );
    }

    // Nếu đổi danh mục thì danh mục mới phải tồn tại
    if (parsed.data.categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Danh mục không tồn tại" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // STOCK: đọc tồn kho ngay trước khi sửa, trong cùng transaction,
      // để tính chênh lệch đúng kể cả khi vừa có đơn đặt hàng
      const before = await tx.product.findUnique({
        where: { id },
        select: { stock: true, name: true, price: true, isActive: true },
      });

      const product = await tx.product.update({
        where: { id },
        data: parsed.data, // trường nào undefined thì Prisma bỏ qua
      });

      const newStock = parsed.data.stock;
      if (before && newStock !== undefined && newStock !== before.stock) {
        const change = newStock - before.stock;
        await logStockMovement(tx, {
          productId: id,
          change,
          reason: change > 0 ? "import" : "adjustment",
          note:
            change > 0
              ? "Admin nhập thêm hàng"
              : "Admin giảm tồn kho khi sửa sản phẩm",
        });
      }

      // AUDIT: gom các thay đổi thành một câu mô tả
      const d = parsed.data;
      const changes: string[] = [];
      if (before) {
        if (d.name !== undefined && d.name !== before.name)
          changes.push(`tên "${before.name}" → "${d.name}"`);
        if (d.price !== undefined && d.price !== Number(before.price))
          changes.push(
            `giá ${Number(before.price).toLocaleString("vi-VN")}đ → ${d.price.toLocaleString("vi-VN")}đ`,
          );
        if (d.stock !== undefined && d.stock !== before.stock)
          changes.push(`tồn kho ${before.stock} → ${d.stock}`);
        if (d.isActive !== undefined && d.isActive !== before.isActive)
          changes.push(d.isActive ? "hiện lại sản phẩm" : "ẩn sản phẩm");
      }
      if (d.description !== undefined) changes.push("đổi mô tả");
      if (d.imageUrl !== undefined) changes.push("đổi ảnh");
      if (d.categoryId !== undefined) changes.push("đổi danh mục");

      if (changes.length > 0) {
        await logAudit(
          tx,
          { id: admin.id, username: admin.username },
          {
            action: "product.update",
            entityType: "product",
            entityId: id,
            summary: `Sửa sản phẩm #${id}: ${changes.join(", ")}`,
          },
        );
      }

      return product;
    });
    return NextResponse.json({
      success: true,
      data: { ...updated, price: Number(updated.price) },
    });
  } catch (error) {
    console.error("PATCH /api/admin/products/[id] lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật sản phẩm" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/products/[id]  — soft delete: chỉ ẩn sản phẩm
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const admin = await getAdminActor();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập quản trị" },
        { status: 401 },
      );
    }

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Mã sản phẩm không hợp lệ" },
        { status: 400 },
      );
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive: false },
      });
      await logAudit(
        tx,
        { id: admin.id, username: admin.username },
        {
          action: "product.hide",
          entityType: "product",
          entityId: id,
          summary: `Ẩn sản phẩm #${id}`,
        },
      );
    });

    return NextResponse.json({
      success: true,
      data: { id, isActive: false },
    });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể ẩn sản phẩm" },
      { status: 500 },
    );
  }
}
