// One-off password reset for the super admin (or any user).
//
// Usage:
//   DATABASE_URL="..." DIRECT_URL="..." \
//   ./node_modules/.bin/tsx prisma/reset-admin-password.ts <email> <new-password>
//
// If the user doesn't exist yet, it's created as a Super Admin.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: tsx prisma/reset-admin-password.ts <email> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      mustChangePassword: false,
      roles: { set: ["SUPER_ADMIN", "EMPLOYEE"] },
    },
    create: {
      email,
      employeeId: "10MS-001",
      name: "Super Admin",
      designation: "CXO",
      department: "Operations",
      modality: "PERMANENT",
      band: "A",
      roles: ["SUPER_ADMIN", "EMPLOYEE"],
      passwordHash,
      mustChangePassword: false,
    },
  });

  console.log(`✓ Password reset for ${user.email} (Super Admin role ensured)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
