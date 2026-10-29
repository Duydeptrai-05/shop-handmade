import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { getCurrentCustomer } from "../../../../lib/auth";

const addSchema = z.object({
  productId: z.number().int().positive(),
});

// GET /api/wishlist: danh sách món yêu thích của khách đang đăng nhập
export async function GET() {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 },
      );
    }

    const rows = await prisma.wishlist.findMany({
      // Sản phẩm bị Admin ẩn thì không hiện trong danh sách yêu thích
      where: { customerId: customer.id, product: { isActive: true } },
      orderBy: { createdAt: "desc" },
      include: { product: true },
    });

    const data = rows.map((r) => ({
      productId: r.productId,
      name: r.product.name,
      price: Number(r.product.price),
      imageUrl: r.product.imageUrl,
      stock: r.product.stock,
      addedAt: r.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}

// POST /api/wishlist  body: { productId }: thêm vào yêu thích
export async function POST(request: Request) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập" },
        { status: 401 },
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

    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Mã sản phẩm không hợp lệ" },
        { status: 400 },
      );
    }
    const { productId } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sản phẩm" },
        { status: 404 },
      );
    }

    // upsert: thích rồi mà bấm lại thì không tạo thêm dòng, cũng không báo lỗi
    await prisma.wishlist.upsert({
      where: {
        customerId_productId: { customerId: customer.id, productId },
      },
      update: {},
      create: { customerId: customer.id, productId },
    });

    return NextResponse.json({
      success: true,
      data: { productId, liked: true },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
