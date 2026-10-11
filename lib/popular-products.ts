import { prisma } from "./prisma";

export async function getPopularProducts(limit = 8) {
  // Tổng số lượng bán theo từng sản phẩm (bỏ đơn đã hủy, bỏ sản phẩm đã ẩn)
  const sold = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { status: { not: "cancelled" } },
      product: { isActive: true },
    },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: "desc" } }, { productId: "asc" }],
    take: limit,
  });

  const ids = sold.map((s) => s.productId);

  const found = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } } })
    : [];

  // Giữ đúng thứ tự bán chạy
  const popular = ids
    .map((id) => found.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (popular.length >= limit) return popular;

  // Chưa đủ số lượng thì bù bằng sản phẩm mới nhất đang bán
  const filler = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: ids } },
    orderBy: { id: "desc" },
    take: limit - popular.length,
  });

  return [...popular, ...filler];
}
