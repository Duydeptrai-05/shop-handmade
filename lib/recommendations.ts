import { prisma } from "./prisma";

// Chỉ gợi ý sản phẩm đang bán và còn hàng
const SELLABLE = { isActive: true, stock: { gt: 0 } };

// "Dành cho bạn" (trang chủ): dựa trên các món khách này đã mua.
// Điểm = (số món khách khác mua kèm) x 3 + (số món khách đã mua cùng danh mục) x 2.
// Không có lịch sử mua thì trả mảng rỗng (trang chủ tự ẩn mục này).
export async function getRecommendationsForCustomer(
  customerId: number,
  limit = 4,
) {
  const mine = await prisma.orderItem.findMany({
    where: { order: { customerId, status: { not: "cancelled" } } },
    select: {
      productId: true,
      quantity: true,
      product: { select: { categoryId: true } },
    },
  });
  if (mine.length === 0) return [];

  const boughtIds = [...new Set(mine.map((m) => m.productId))];

  // Trọng số theo danh mục khách hay mua
  const categoryWeight = new Map<number, number>();
  for (const m of mine) {
    const cat = m.product.categoryId;
    categoryWeight.set(cat, (categoryWeight.get(cat) ?? 0) + m.quantity);
  }

  // Khách khác đã mua các món này thì còn mua thêm gì
  const alsoBought = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { notIn: boughtIds },
      product: SELLABLE,
      order: {
        customerId: { not: customerId },
        status: { not: "cancelled" },
        orderItems: { some: { productId: { in: boughtIds } } },
      },
    },
    _sum: { quantity: true },
  });
  const coWeight = new Map(
    alsoBought.map((r) => [r.productId, r._sum.quantity ?? 0]),
  );

  const candidates = await prisma.product.findMany({
    where: { ...SELLABLE, id: { notIn: boughtIds } },
  });

  return candidates
    .map((product) => ({
      product,
      score:
        (coWeight.get(product.id) ?? 0) * 3 +
        (categoryWeight.get(product.categoryId) ?? 0) * 2,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.product.id - a.product.id)
    .slice(0, limit)
    .map((x) => x.product);
}

// "Khách mua món này cũng mua" (trang chi tiết).
// Lấy các món hay nằm chung đơn với sản phẩm này; thiếu thì bù bằng
// món cùng danh mục để mục này không bị trống khi dữ liệu còn ít.
export async function getAlsoBought(productId: number, limit = 4) {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: productId },
      product: SELLABLE,
      order: {
        status: { not: "cancelled" },
        orderItems: { some: { productId } },
      },
    },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: "desc" } }, { productId: "asc" }],
    take: limit,
  });

  const ids = rows.map((r) => r.productId);
  const found = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } } })
    : [];

  // Giữ đúng thứ tự mua kèm nhiều nhất
  const result = ids
    .map((id) => found.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (result.length >= limit) return result;

  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  });
  if (!current) return result;

  const filler = await prisma.product.findMany({
    where: {
      ...SELLABLE,
      categoryId: current.categoryId,
      id: { notIn: [productId, ...ids] },
    },
    orderBy: { id: "desc" },
    take: limit - result.length,
  });

  return [...result, ...filler];
}
