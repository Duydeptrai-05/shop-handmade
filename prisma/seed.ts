/**
 * prisma/seed.ts
 * Chạy bằng: npx prisma db seed
 *
 * - Chạy lại nhiều lần vẫn an toàn (không tạo trùng dữ liệu).
 * - Tạo: 3 danh mục, 15 sản phẩm, 1 tài khoản Admin, 4 đơn hàng mẫu.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// ⚠️ Chỉnh đường dẫn này cho khớp `output` trong khối generator của schema.prisma
import { PrismaClient, OrderStatus } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Thiếu DATABASE_URL trong file .env");
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// 1. Dữ liệu danh mục & sản phẩm
// Ảnh đặt ở public/images/products/<tên-file>.jpg (tải từ Unsplash/Pexels/Pixabay)
// Nếu muốn dùng URL ngoài, thay giá trị `image` bằng URL đầy đủ
// (và nhớ khai báo remotePatterns trong next.config nếu dùng <Image />).
// ---------------------------------------------------------------------------
const img = (file: string) => `/images/products/${file}.jpg`;

const CATEGORIES = [
  "Nến thơm",
  "Trang sức handmade",
  "Quà tặng & phụ kiện handmade",
] as const;

type SeedProduct = {
  name: string;
  description: string;
  price: number; // VND
  stock: number;
  image: string;
  category: (typeof CATEGORIES)[number];
};

const PRODUCTS: SeedProduct[] = [
  // ----- Nến thơm -----
  {
    name: "Nến thơm sáp đậu nành hương Lavender",
    description:
      "Nến đổ thủ công từ sáp đậu nành tự nhiên, hương oải hương dịu nhẹ giúp thư giãn và dễ ngủ. Bấc cotton cháy sạch, thời gian đốt khoảng 40 giờ.",
    price: 185000,
    stock: 25,
    image: img("nen-ngoi-sao"),
    category: "Nến thơm",
  },
  {
    name: "Nến thơm ngôi sao biển đại dương",
    description:
      "Hương thơm dễ chịu, hình dạng nến rất đẹp, rất xinh và dễ thương. Rất phù hợp để tặng bạn bè người thân vào các dịp lễ.",
    price: 195000,
    stock: 18,
    image: img("nen-vanilla-caramel"),
    category: "Nến thơm",
  },
  {
    name: "Nến thơm hương Gỗ đàn hương",
    description:
      "Hương gỗ trầm ấm, sang trọng, hợp không gian làm việc và thiền. Tinh dầu thiên nhiên pha chế theo công thức riêng của shop.",
    price: 210000,
    stock: 12,
    image: img("nen-dan-huong"),
    category: "Nến thơm",
  },
  {
    name: "Nến ly thủy tinh hương Trà xanh",
    description:
      "Mùi trà xanh thanh mát, nhẹ nhàng, không gắt. Kích thước nhỏ gọn, tiện đặt bàn làm việc hoặc đầu giường.",
    price: 165000,
    stock: 30,
    image: img("nen-tra-xanh"),
    category: "Nến thơm",
  },
  {
    name: "Set 4 nến mini quà tặng",
    description:
      "Bộ 4 nến thơm mini tạo hình topping hoa xinh xắn, tỏa hương dịu nhẹ và đóng gói trong hộp quà lót rơm tinh tế.",
    price: 250000,
    stock: 0, // hết hàng — để demo trạng thái "Hết hàng"
    image: img("set-nen-mini"),
    category: "Nến thơm",
  },

  // ----- Trang sức handmade -----
  {
    name: "Vòng tay đá thạch anh hồng",
    description:
      "Vòng tay xâu từ hạt thạch anh hồng , đeo lên tay dễ , đá sáng. Màu hồng nhạt nhẹ nhàng, dễ phối đồ.",
    price: 220000,
    stock: 15,
    image: img("vong-tay-thach-anh"),
    category: "Trang sức handmade",
  },
  {
    name: "Dây chuyền hoa thạch",
    description:
      "Mặt dây từ dây da,những viên đá nổi bật với thiết kế mặt hoa thạch nhiều màu sắc ngọt ngào.",
    price: 175000,
    stock: 20,
    image: img("day-chuyen-hoa-thach"),
    category: "Trang sức handmade",
  },
  {
    name: "Vòng Tay Dây Sáp Sao Biển",
    description:
      "Vòng tay đính charm sao biển phong cách trẻ trung, năng động, rất thích hợp để phối đồ đi biển.",
    price: 145000,
    stock: 22,
    image: img("vong-tay-bien-lang"),
    category: "Trang sức handmade",
  },
  {
    name: "Nhẫn hoa hạt cườm",
    description:
      "Nhẫn hạt cườm họa tiết mặt cười và hoa cúc phong cách đáng yêu.",
    price: 95000,
    stock: 40,
    image: img("nhan-hat-cuom"),
    category: "Trang sức handmade",
  },
  {
    name: "Vòng cổ máy ảnh phim",
    description:
      "Chuỗi ngọc trai nước ngọt tự nhiên, khóa và dây bạc 925. Thiết kế thanh lịch, phù hợp đi làm và dự tiệc.",
    price: 320000,
    stock: 8,
    image: img("vong-co-may-anh"),
    category: "Trang sức handmade",
  },

  // ----- Quà tặng & phụ kiện handmade -----
  {
    name: "Chậu hoa mini kẽm nhung",
    description: ".",
    price: 45000,
    stock: 50,
    image: img("chau-hoa-huong-duong"),
    category: "Quà tặng & phụ kiện handmade",
  },
  {
    name: "Túi đeo chéo len handmade phối viền xù",
    description:
      "Túi xách len handmade phối viền xù mềm mại, đính charm hoạt hình đáng yêu kèm dây xích đeo chéo.",
    price: 65000,
    stock: 35,
    image: img("tui-len"),
    category: "Quà tặng & phụ kiện handmade",
  },
  {
    name: "Móc khóa bó hoa hồng mini len",
    description:
      "Móc khóa hình bó hoa mini đan móc len tỉ mỉ, thiết kế nhỏ nhắn dễ thương, thích hợp treo balo, túi xách, chìa khóa.",
    price: 55000,
    stock: 40,
    image: img("moc-khoa-len"),
    category: "Quà tặng & phụ kiện handmade",
  },
  {
    name: "Tranh thêu len handmade",
    description:
      "Tranh thêu len thủ công thành phẩm hình gấu cầu vồng đáng yêu, chất len xù mềm mại căng trên khung tròn kèm giá đỡ gỗ.",
    price: 85000,
    stock: 28,
    image: img("tranh-theu-len"),
    category: "Quà tặng & phụ kiện handmade",
  },
  {
    name: "Thỏ bông len Bunny handmade",
    description:
      "Thỏ bông handmade móc từ sợi len mềm mịn, diện set yếm và mũ tai ếch xinh xắn.",
    price: 90000,
    stock: 20,
    image: img("tho-bong-len"),
    category: "Quà tặng & phụ kiện handmade",
  },
];

// ---------------------------------------------------------------------------
// 2. Đơn hàng mẫu (để trang admin có dữ liệu demo, đủ 4 trạng thái)
// ---------------------------------------------------------------------------
const SAMPLE_ORDERS = [
  {
    customerName: "Nguyễn Thị Mai",
    phone: "0901234567",
    address: "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
    status: OrderStatus.pending,
    items: [
      { name: "Nến thơm sáp đậu nành hương Lavender", quantity: 2 },
      { name: "Móc khóa bó hoa hồng mini len", quantity: 1 },
    ],
  },
  {
    customerName: "Trần Văn Hùng",
    phone: "0912345678",
    address: "45 Lê Lợi, Phường 1, TP. Phan Thiết, Bình Thuận",
    status: OrderStatus.confirmed,
    items: [{ name: "Nến thơm hương Gỗ đàn hương", quantity: 1 }],
  },
  {
    customerName: "Lê Thu Hà",
    phone: "0987654321",
    address: "88 Trần Phú, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa",
    status: OrderStatus.shipped,
    items: [
      { name: "Vòng tay đá thạch anh hồng", quantity: 1 },
      { name: "Nhẫn hoa hạt cườm", quantity: 1 },
    ],
  },
  {
    customerName: "Phạm Quốc Bảo",
    phone: "0933445566",
    address: "7 Hai Bà Trưng, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    status: OrderStatus.completed,
    items: [
      { name: "Dây chuyền hoa thạch", quantity: 1 },
      { name: "Tranh thêu len handmade", quantity: 2 },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Hàm seed
// ---------------------------------------------------------------------------
async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(
    `✔ Admin: ${username} / ${password}  (đổi mật khẩu khi triển khai thật)`,
  );
}

async function seedCategories() {
  const map = new Map<string, number>();
  for (const name of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    map.set(name, category.id);
  }
  console.log(`✔ Danh mục: ${CATEGORIES.length}`);
  return map;
}

async function seedProducts(categoryIds: Map<string, number>) {
  for (const p of PRODUCTS) {
    const data = {
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      imageUrl: p.image,
      isActive: true,
      categoryId: categoryIds.get(p.category)!,
    };

    // Product không có cột unique nên tìm theo tên để tránh tạo trùng khi chạy lại
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
    });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
    } else {
      await prisma.product.create({ data });
    }
  }
  console.log(`✔ Sản phẩm: ${PRODUCTS.length}`);
}

async function seedOrders() {
  // Chỉ tạo đơn mẫu khi bảng orders còn trống, tránh nhân đôi mỗi lần seed
  const count = await prisma.order.count();
  if (count > 0) {
    console.log(`• Đã có ${count} đơn hàng, bỏ qua đơn mẫu`);
    return;
  }

  const products = await prisma.product.findMany();
  const byName = new Map(products.map((p) => [p.name, p]));

  for (const o of SAMPLE_ORDERS) {
    await prisma.order.create({
      data: {
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        status: o.status,
        orderItems: {
          create: o.items.map((item) => {
            const product = byName.get(item.name);
            if (!product) {
              throw new Error(`Không tìm thấy sản phẩm mẫu: ${item.name}`);
            }
            return {
              productId: product.id,
              quantity: item.quantity,
              priceAtOrder: product.price, // "đóng băng" giá tại thời điểm đặt
            };
          }),
        },
      },
    });
  }
  console.log(`✔ Đơn hàng mẫu: ${SAMPLE_ORDERS.length}`);
}

async function main() {
  console.log("Bắt đầu seed dữ liệu...");
  await seedAdmin();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedOrders();
  console.log("Seed hoàn tất.");
}

main()
  .catch((e) => {
    console.error("Seed thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
