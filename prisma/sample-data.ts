import { PrismaClient, Band, Modality, Role, RequestStatus, RequestType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Change123!", 10);

  // ── Approvers ─────────────────────────────────────────────────────────────
  const adminManager = await prisma.user.upsert({
    where: { email: "admin.manager@10minuteschool.com" },
    update: {},
    create: {
      email: "admin.manager@10minuteschool.com",
      employeeId: "10MS-010",
      name: "Sadia Admin",
      passwordHash,
      designation: "Assistant Vice President",
      department: "Operations",
      modality: Modality.PERMANENT,
      band: Band.C2,
      roles: [Role.ADMIN_MANAGER, Role.EMPLOYEE],
    },
  });

  const financeManager = await prisma.user.upsert({
    where: { email: "finance.manager@10minuteschool.com" },
    update: {},
    create: {
      email: "finance.manager@10minuteschool.com",
      employeeId: "10MS-011",
      name: "Tareq Finance",
      passwordHash,
      designation: "General Manager",
      department: "Finance",
      modality: Modality.PERMANENT,
      band: Band.C1,
      roles: [Role.FINANCE_MANAGER, Role.EMPLOYEE],
    },
  });

  // ── Line manager ──────────────────────────────────────────────────────────
  const lineManager = await prisma.user.upsert({
    where: { email: "asha@10minuteschool.com" },
    update: {},
    create: {
      email: "asha@10minuteschool.com",
      employeeId: "10MS-100",
      name: "Asha Rahman",
      passwordHash,
      designation: "Manager",
      department: "Marketing",
      modality: Modality.PERMANENT,
      band: Band.D,
      roles: [Role.EMPLOYEE],
    },
  });

  // ── Employees ─────────────────────────────────────────────────────────────
  const imran = await prisma.user.upsert({
    where: { email: "imran@10minuteschool.com" },
    update: { lineManagerId: lineManager.id },
    create: {
      email: "imran@10minuteschool.com",
      employeeId: "10MS-101",
      name: "Imran Khan",
      passwordHash,
      designation: "Senior Executive",
      department: "Marketing",
      modality: Modality.PERMANENT,
      band: Band.F2,
      lineManagerId: lineManager.id,
      roles: [Role.EMPLOYEE],
    },
  });

  const nadia = await prisma.user.upsert({
    where: { email: "nadia@10minuteschool.com" },
    update: { lineManagerId: lineManager.id },
    create: {
      email: "nadia@10minuteschool.com",
      employeeId: "10MS-102",
      name: "Nadia Hossain",
      passwordHash,
      designation: "Executive",
      department: "Marketing",
      modality: Modality.PERMANENT,
      band: Band.F1,
      lineManagerId: lineManager.id,
      roles: [Role.EMPLOYEE],
    },
  });

  await prisma.user.upsert({
    where: { email: "rashid@10minuteschool.com" },
    update: { lineManagerId: lineManager.id },
    create: {
      email: "rashid@10minuteschool.com",
      employeeId: "10MS-103",
      name: "Rashid Ali",
      passwordHash,
      designation: "Intern",
      department: "Marketing",
      modality: Modality.INTERN,
      band: Band.G,
      lineManagerId: lineManager.id,
      roles: [Role.EMPLOYEE],
    },
  });

  // Make Asha report to admin manager too, for full chain demo
  await prisma.user.update({
    where: { id: lineManager.id },
    data: { lineManagerId: adminManager.id },
  });

  // ── Sample requests ───────────────────────────────────────────────────────
  // 1) Pending Line Manager — Imran's advance
  await prisma.request.create({
    data: {
      type: RequestType.ADVANCE,
      status: RequestStatus.PENDING_LINE_MANAGER,
      submitterId: imran.id,
      purpose: "Dhaka → Chittagong field visit for partner meeting",
      destination: "Chittagong",
      locationType: "INTERCITY",
      tripStart: new Date(Date.now() + 7 * 86400000),
      tripEnd: new Date(Date.now() + 11 * 86400000),
      paymentMethod: "BKASH",
      bkashNumber: "01711-000000",
      totalAmount: 12000,
      submittedAt: new Date(Date.now() - 1 * 86400000),
      claimItems: {
        create: [
          { type: "TA", description: "Bus ticket round trip", quantity: 1, amount: 2000 },
          { type: "DA", description: "Daily food + refreshments (intercity)", quantity: 5, amount: 800, rateSnapshot: 800 },
          { type: "AA", description: "Hotel — 4 nights", quantity: 4, amount: 1500, rateSnapshot: 4000 },
        ],
      },
    },
  });

  // 2) Pending Admin Manager — Nadia, already passed line manager
  const nadiaReq = await prisma.request.create({
    data: {
      type: RequestType.ADVANCE,
      status: RequestStatus.PENDING_ADMIN_MANAGER,
      submitterId: nadia.id,
      purpose: "Sylhet promotional event — booth setup",
      destination: "Sylhet",
      locationType: "INTERCITY",
      tripStart: new Date(Date.now() + 14 * 86400000),
      tripEnd: new Date(Date.now() + 18 * 86400000),
      paymentMethod: "BANK",
      bankName: "BRAC Bank",
      bankAccount: "1501203456789",
      bankBranch: "Dhanmondi",
      totalAmount: 9600,
      submittedAt: new Date(Date.now() - 3 * 86400000),
      claimItems: {
        create: [
          { type: "TA", description: "Train ticket", quantity: 1, amount: 1600 },
          { type: "DA", description: "Daily allowance (intercity)", quantity: 5, amount: 800, rateSnapshot: 800 },
          { type: "AA", description: "Hotel — 4 nights", quantity: 4, amount: 1000, rateSnapshot: 4000 },
        ],
      },
    },
  });
  await prisma.approvalRecord.create({
    data: {
      requestId: nadiaReq.id,
      actorId: lineManager.id,
      stage: "LINE_MANAGER",
      action: "APPROVED",
      comment: "Approved, please proceed.",
    },
  });

  // 3) Disbursed — Imran's reimbursement, fully through
  const disbursedReq = await prisma.request.create({
    data: {
      type: RequestType.REIMBURSEMENT,
      status: RequestStatus.DISBURSED,
      submitterId: imran.id,
      purpose: "Procurement run to New Market",
      destination: "Dhaka",
      locationType: "CITY",
      tripStart: new Date(Date.now() - 20 * 86400000),
      tripEnd: new Date(Date.now() - 20 * 86400000),
      paymentMethod: "BKASH",
      bkashNumber: "01711-000000",
      totalAmount: 850,
      submittedAt: new Date(Date.now() - 18 * 86400000),
      disbursedAt: new Date(Date.now() - 10 * 86400000),
      claimItems: {
        create: [
          { type: "TA", description: "Uber round trip", quantity: 2, amount: 425 },
        ],
      },
    },
  });
  await prisma.approvalRecord.createMany({
    data: [
      { requestId: disbursedReq.id, actorId: lineManager.id, stage: "LINE_MANAGER", action: "APPROVED" },
      { requestId: disbursedReq.id, actorId: adminManager.id, stage: "ADMIN_MANAGER", action: "APPROVED" },
      { requestId: disbursedReq.id, actorId: financeManager.id, stage: "FINANCE_MANAGER", action: "APPROVED" },
      { requestId: disbursedReq.id, actorId: financeManager.id, stage: "FINANCE_MANAGER", action: "DISBURSED", comment: "Paid via bKash" },
    ],
  });

  // 4) Changes requested — Rashid's, so the edit screen has data
  const changesReq = await prisma.request.create({
    data: {
      type: RequestType.REIMBURSEMENT,
      status: RequestStatus.CHANGES_REQUESTED,
      submitterId: nadia.id,
      purpose: "Office stationery purchase",
      destination: "Dhaka",
      locationType: "CITY",
      tripStart: new Date(Date.now() - 5 * 86400000),
      tripEnd: new Date(Date.now() - 5 * 86400000),
      paymentMethod: "BANK",
      bankName: "BRAC Bank",
      bankAccount: "1501203456789",
      totalAmount: 1200,
      submittedAt: new Date(Date.now() - 4 * 86400000),
      claimItems: {
        create: [
          { type: "TA", description: "CNG fare", quantity: 1, amount: 400 },
          { type: "DA", description: "Refreshments", quantity: 1, amount: 800 },
        ],
      },
    },
  });
  await prisma.approvalRecord.create({
    data: {
      requestId: changesReq.id,
      actorId: lineManager.id,
      stage: "LINE_MANAGER",
      action: "CHANGES_REQUESTED",
      comment: "Please attach receipts and split the items by date.",
    },
  });

  console.log(`Seeded:
  Approvers:
    - admin.manager@10minuteschool.com (Admin Manager)
    - finance.manager@10minuteschool.com (Finance Manager)
  Line Manager:
    - asha@10minuteschool.com
  Employees:
    - imran@10minuteschool.com
    - nadia@10minuteschool.com
    - rashid@10minuteschool.com
  All sample passwords: Change123!

  4 sample requests in different states.
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
