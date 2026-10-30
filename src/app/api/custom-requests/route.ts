import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthPayload } from "../../../../lib/auth";
import { createCustomRequestSchema } from "../../../../lib/validation/custom-request";

const MAX_OPEN_REQUESTS = 5; // tối đa 5 yêu cầu đang chờ báo giá cùng lúc

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Đổi Decimal sang number trước khi trả JSON
function toJson(r: {
  id: number;
  title: string;
  description: string;
  quantity: number;
  budget: unknown;
  referenceImageUrl: string | null;
  quotedPrice: unknown;
  adminNote: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}

// Lấy customerId từ phiên đăng nhập, null nếu không phải khách
async function getCustomerId(): Promise<number | null> {
  const payload = await getAuthPayload();
  if (!payload || payload.role !== "customer") return null;
  return Number(payload.id); // <-- xem ghi chú bên dưới
}

// GET: danh sách yêu cầu của chính khách đang đăng nhập
export async function GET() {
  try {
    const customerId = await getCustomerId();
    if (customerId === null) return fail("Bạn cần đăng nhập", 401);

    const rows = await prisma.customRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: rows.map(toJson) });
  } catch (e) {
    console.error("[custom-requests]", e);
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}

// POST: khách gửi yêu cầu mới
export async function POST(req: Request) {
  try {
    const customerId = await getCustomerId();
    if (customerId === null) return fail("Bạn cần đăng nhập", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail("Dữ liệu gửi lên không hợp lệ", 400);
    }

    const parsed = createCustomRequestSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400,
      );
    }

    const openCount = await prisma.customRequest.count({
      where: { customerId, status: "pending" },
    });
    if (openCount >= MAX_OPEN_REQUESTS) {
      return fail(
        `Bạn đang có ${MAX_OPEN_REQUESTS} yêu cầu chờ báo giá, vui lòng chờ shop phản hồi hoặc hủy bớt`,
        429,
      );
    }

    const { title, description, quantity, budget, referenceImageUrl } =
      parsed.data;

    const created = await prisma.customRequest.create({
      data: {
        customerId, // lấy từ phiên đăng nhập, không lấy từ body
        title,
        description,
        quantity,
        budget: budget ?? null,
        referenceImageUrl: referenceImageUrl ?? null,
        // status mặc định pending, quotedPrice/adminNote khách không được gửi
      },
    });

    return NextResponse.json(
      { success: true, data: toJson(created) },
      { status: 201 },
    );
  } catch {
    return fail("Có lỗi xảy ra, vui lòng thử lại", 500);
  }
}
