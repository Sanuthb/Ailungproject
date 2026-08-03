import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Ailung@12345";

const DEMO_USERS = [
  {
    name: "System Administrator",
    email: "admin@ailung.com",
    role: "ADMIN" as const,
    hospital: "AI Lung Diagnostics Center",
    phone: "+1-555-0100",
  },
  {
    name: "Dr. Sarah Chen",
    email: "sarah.chen@ailung.com",
    role: "DOCTOR" as const,
    hospital: "AI Lung Diagnostics Center",
    phone: "+1-555-0101",
  },
  {
    name: "Dr. Michael Okoye",
    email: "michael.okoye@ailung.com",
    role: "DOCTOR" as const,
    hospital: "AI Lung Diagnostics Center",
    phone: "+1-555-0102",
  },
  {
    name: "Dr. Priya Nair",
    email: "priya.nair@ailung.com",
    role: "DOCTOR" as const,
    hospital: "Riverside General Hospital",
    phone: "+1-555-0103",
  },
];

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  for (const user of DEMO_USERS) {
    await db.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: hashedPassword },
    });
  }

  const existingSettings = await db.settings.findFirst();
  if (!existingSettings) {
    await db.settings.create({ data: {} });
  }

  console.info("\nSeeded demo accounts (all share one password):\n");
  console.table(DEMO_USERS.map(({ name, email, role }) => ({ name, email, role })));
  console.info(`Password for all accounts: ${DEFAULT_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
