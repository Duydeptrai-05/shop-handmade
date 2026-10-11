import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

// GET /api/admin/categories
export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập quản trị" },
        { status: 401 },
      );
    }

    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("GET /api/admin/categories lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tải danh mục" },
      { status: 500 },
    );
  }
}
