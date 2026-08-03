import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function run() {
  try {
    await db.$connect();
    console.log("Connected!");
    const tables = await db.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log("Tables:", JSON.stringify(tables));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await db.$disconnect();
  }
}
run();
