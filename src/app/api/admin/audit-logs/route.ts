import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

const PAGE_SIZE_DEFAULT = 30;
const PAGE_SIZE_MAX = 100;

// GET: Admin xem nhật ký thao tác
// ?entityType=order|product|customer|voucher|review|custom_request  ?q=từ khóa trong nội dung
// ?page=1  ?pageSize=30
export async function GET(request: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get("entityType")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;

    const pageRaw = Number(searchParams.get("page") ?? "1");
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const sizeRaw = Number(searchParams.get("pageSize") ?? PAGE_SIZE_DEFAULT);
    const pageSize =
      Number.isInteger(sizeRaw) && sizeRaw > 0
        ? Math.min(sizeRaw, PAGE_SIZE_MAX)
        : PAGE_SIZE_DEFAULT;

    const where = {
      ...(entityType ? { entityType } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q } },
              { adminUsername: { contains: q } },
            ],
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          adminUsername: true,
          action: true,
          entityType: true,
          entityId: true,
          summary: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/audit-logs error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra, vui lòng thử lại" },
      { status: 500 },
    );
  }
}
