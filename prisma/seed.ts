import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Dev-only default credentials. Override via env (ADMIN_USERNAME / ADMIN_PASSWORD).
// NEVER use these defaults in production.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
const DEV_PASSWORD = "ChangeMe123!";

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  // 1. Singleton inventory setting (lowStockThreshold default 10).
  await prisma.inventorySetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", lowStockThreshold: 10 },
  });

  // 2. One user per role. Idempotent via unique username.
  const users: Array<{ username: string; password: string; role: Role }> = [
    { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: Role.ADMIN },
    { username: "barman", password: DEV_PASSWORD, role: Role.BARMAN },
    { username: "waiter", password: DEV_PASSWORD, role: Role.WAITER },
    { username: "sara", password: DEV_PASSWORD, role: Role.WAITER },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { role: u.role, isActive: true },
      create: {
        username: u.username,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });
  }

  // 3. Sample beverages. Idempotent via unique name.
  // stock = warehouse; counterStock = bar/counter (what orders deduct from).
  const items: Array<{ name: string; price: string; stock: number; counterStock: number }> = [
    { name: "Coca-Cola", price: "25.00", stock: 120, counterStock: 24 },
    { name: "Sprite", price: "25.00", stock: 80, counterStock: 24 },
    { name: "Fanta Orange", price: "25.00", stock: 60, counterStock: 12 },
    { name: "Bottled Water", price: "15.00", stock: 200, counterStock: 48 },
    { name: "Espresso", price: "40.00", stock: 50, counterStock: 20 },
    { name: "Macchiato", price: "45.00", stock: 8, counterStock: 4 }, // low in both
    { name: "Fresh Orange Juice", price: "60.00", stock: 0, counterStock: 0 }, // out in both
  ];

  for (const it of items) {
    await prisma.item.upsert({
      where: { name: it.name },
      update: { price: it.price, isActive: true },
      create: {
        name: it.name,
        price: it.price,
        stock: it.stock,
        counterStock: it.counterStock,
        isActive: true,
      },
    });
  }

  const userCount = await prisma.user.count();
  const itemCount = await prisma.item.count();
  console.log(
    `Seed complete. Users: ${userCount} (admin="${ADMIN_USERNAME}"), Items: ${itemCount}, InventorySetting: singleton (threshold 10).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
