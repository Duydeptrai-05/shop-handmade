import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthPayload } from "../../../../../../lib/auth";
import { createReviewSchema } from "../../../../../../lib/validation/review";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Lấy customerId từ token; null nếu chưa đăng nhập hoặc không phải Customer
async function getCustomerId(): Promise<number | null> {
  const payload = await getAuthPayload();
  if (!payload || payload.role !== "customer") return null;
  return Number(payload.id); // <-- xem ghi chú bên dưới
}

// Khách có đơn completed chứa sản phẩm này không?
async function hasPurchased(customerId: number, productId: number) {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { customerId, status: "completed" },
    },
    select: { id: true },
  });
  return item !== null;
}

// GET: tình trạng review của khách hiện tại với sản phẩm này
export async function GET(_request: Request, { params }: Context) {
  try {
    const productId = parseId((await params).id);
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Mã sản phẩm không hợp lệ" },
        { status: 400 },
      );
    }

    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json({
        success: true,
        data: { loggedIn: false, canReview: false, hasReviewed: false },
      });
    }

    const [purchased, existing] = await Promise.all([
      hasPurchased(customerId, productId),
      prisma.review.findUnique({
        where: { productId_customerId: { productId, customerId } },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        loggedIn: true,
        canReview: purchased && !existing,
        hasReviewed: existing !== null,
      },
    });
  } catch (error) {
    console.error("GET /api/products/[id]/reviews lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể kiểm tra quyền đánh giá" },
      { status: 500 },
    );
  }
}

// POST: viết review
export async function POST(request: Request, { params }: Context) {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Bạn cần đăng nhập để đánh giá" },
        { status: 401 },
      );
    }

    const productId = parseId((await params).id);
    if (!productId) {
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

    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

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

    if (!(await hasPurchased(customerId, productId))) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bạn chỉ có thể đánh giá sản phẩm đã mua và đơn hàng đã hoàn thành",
        },
        { status: 403 },
      );
    }

    try {
      const review = await prisma.review.create({
        data: {
          productId,
          customerId,
          rating: parsed.data.rating,
          comment: parsed.data.comment ?? null,
        },
      });
      return NextResponse.json(
        { success: true, data: review },
        { status: 201 },
      );
    } catch (e) {
      // P2002 = vi phạm UNIQUE(productId, customerId): đã đánh giá rồi
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { success: false, message: "Bạn đã đánh giá sản phẩm này rồi" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("POST /api/products/[id]/reviews lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Không thể gửi đánh giá" },
      { status: 500 },
    );
  }
}
