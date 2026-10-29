import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentCustomer } from "../../../../../lib/auth";

// DELETE /api/wishlist/[productId]: bỏ khỏi danh sách yêu thích
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 },
      );
    }

    const { productId: raw } = await params;
    const productId = Number(raw);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { success: false, message: "Mã sản phẩm không hợp lệ" },
        { status: 400 },
      );
    }

    // deleteMany: chỉ xóa dòng của đúng khách này, bỏ thích món chưa thích
    // thì không báo lỗi (kết quả vẫn là "không còn trong danh sách")
    await prisma.wishlist.deleteMany({
      where: { customerId: customer.id, productId },
    });

    return NextResponse.json({
      success: true,
      data: { productId, liked: false },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
