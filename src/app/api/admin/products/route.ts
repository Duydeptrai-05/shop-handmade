import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";
import { productSchema } from "../../../../../lib/validation/product";

// Kiểm tra đăng nhập Admin, trả về null nếu hợp lệ
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

// GET /api/admin/products?q=nến&status=active|inactive&categoryId=1
export async function GET(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const categoryId = Number(searchParams.get("categoryId"));

    const products = await prisma.product.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(status === "active" ? { isActive: true } : {}),
        ...(status === "inactive" ? { isActive: false } : {}),
        ...(Number.isInteger(categoryId) && categoryId > 0
          ? { categoryId }
          : {}),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { id: "desc" },
    });

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price), // Decimal -> number
      imageUrl: p.imageUrl,
      stock: p.stock,
      isActive: p.isActive,
      categoryId: p.categoryId,
      category: p.category,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/admin/products lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh sách sản phẩm" },
      { status: 500 },
    );
  }
}

// POST /api/admin/products
export async function POST(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Dữ liệu gửi lên không hợp lệ" },
        { status: 400 },
      );
    }

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Danh mục phải tồn tại
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Danh mục không tồn tại" },
        { status: 400 },
      );
    }

    const created = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        imageUrl: input.imageUrl ?? null,
        stock: input.stock,
        categoryId: input.categoryId,
        // isActive dùng mặc định true trong schema
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { ...created, price: Number(created.price) },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/products lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo sản phẩm" },
      { status: 500 },
    );
  }
}
