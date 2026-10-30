import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../lib/auth";

const STATUSES = [
  "pending",
  "quoted",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
] as const;
type Status = (typeof STATUSES)[number];

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload || payload.role !== "admin")
      return fail("Bạn cần đăng nhập Admin", 401);

    const statusParam = new URL(req.url).searchParams.get("status");
    if (statusParam && !(STATUSES as readonly string[]).includes(statusParam)) {
      return fail("Trạng thái lọc không hợp lệ", 400);
    }

    const [rows, grouped] = await Promise.all([
      prisma.customRequest.findMany({
        where: statusParam ? { status: statusParam as Status } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
      prisma.customRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    // Số đếm cho từng trạng thái (kể cả trạng thái chưa có yêu cầu nào thì là 0)
    const counts: Record<string, number> = {};
    for (const s of STATUSES) counts[s] = 0;
    for (const g of grouped) counts[g.status] = g._count._all;

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      quantity: r.quantity,
      budget: r.budget == null ? null : Number(r.budget),
      referenceImageUrl: r.referenceImageUrl,
      quotedPrice: r.quotedPrice == null ? null : Number(r.quotedPrice),
      adminNote: r.adminNote,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customer: r.customer,
    }));

    return NextResponse.json({ success: true, data, counts });
  } catch (e) {
    console.error("[admin/custom-requests]", e);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}
