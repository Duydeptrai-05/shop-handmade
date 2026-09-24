/**
 * lib/prisma.ts
 *
 * Prisma Client singleton dùng adapter MariaDB.
 * Next.js dev mode hot-reload lại module mỗi lần sửa code -> nếu không cache
 * instance vào globalThis thì mỗi lần reload sẽ tạo thêm 1 connection pool mới,
 * dễ bị "too many connections" khi dev lâu.
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// ⚠️ Chỉnh đường dẫn này cho khớp `output` trong khối generator của schema.prisma
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Thiếu DATABASE_URL trong file .env");
}

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
