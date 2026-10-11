import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { updateProductSchema } from "../../../../../../lib/validation/product";

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

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/admin/products/[id]  — chỉ gửi các trường cần đổi
export async function PATCH(request: Request, { params }: Context) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

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

    const updated = await prisma.product.update({
      where: { id },
      data: parsed.data, // trường nào undefined thì Prisma bỏ qua
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

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
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
