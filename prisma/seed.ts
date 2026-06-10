import { PrismaClient, Band, Modality, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "fuad@10minuteschool.com";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "123456789";
  const name = process.env.SUPER_ADMIN_NAME ?? "Fuad";
  const employeeId = process.env.SUPER_ADMIN_EMPLOYEE_ID ?? "10MS-001";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      roles: { set: [Role.SUPER_ADMIN, Role.EMPLOYEE] },
    },
    create: {
      email,
      name,
      employeeId,
      passwordHash,
      designation: "Super Admin",
      department: "Operations",
      modality: Modality.PERMANENT,
      band: Band.A,
      roles: [Role.SUPER_ADMIN, Role.EMPLOYEE],
      mustChangePassword: false,
    },
  });

  console.log(`Seeded super admin: ${user.email} (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
