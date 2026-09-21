import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcryptjs";
import { users, clients } from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const EMPLOYEE_PASSWORD_HASH = hashSync("12345", 10);
const ADMIN_PASSWORD_HASH = hashSync("Sunny11076#", 10);

const avatarColors = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981",
  "#06b6d4", "#f43f5e", "#a855f7", "#14b8a6", "#eab308", "#6366f1",
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed users
  const employeeList = [
    { username: "sunny", displayName: "Sunny", role: "admin" as const, passwordHash: ADMIN_PASSWORD_HASH },
    { username: "niloy", displayName: "Niloy", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "shafin", displayName: "Shafin", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "jenifar", displayName: "Jenifar", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "matthew", displayName: "Matthew", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "sayeeb", displayName: "Sayeeb", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "anamika", displayName: "Anamika", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "sarwar", displayName: "Sarwar", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "shishir", displayName: "Shishir", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "shuddho", displayName: "Shuddho", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
    { username: "tonusree", displayName: "Tonusree", role: "employee" as const, passwordHash: EMPLOYEE_PASSWORD_HASH },
  ];

  for (let i = 0; i < employeeList.length; i++) {
    const emp = employeeList[i];
    await db.insert(users).values({
      ...emp,
      avatarColor: avatarColors[i % avatarColors.length],
    }).onConflictDoNothing();
    console.log(`  ✅ User: ${emp.displayName} (${emp.role})`);
  }

  // Seed clients
  const clientList = [
    "Leo Bar & Grill",
    "KS2 Halal Steak & Grill",
    "Ruth's Pizza Plus",
    "BDFusion Restaurant",
    "ODIN Protection Services",
    "Greek Mansion",
    "Right Carpenters",
    "Built Wright Construction Inc",
    "Roy RenoCon Services",
    "King Lounge",
    "NextRNS",
  ];

  for (const name of clientList) {
    await db.insert(clients).values({ name }).onConflictDoNothing();
    console.log(`  ✅ Client: ${name}`);
  }

  console.log("\n🎉 Seeding complete!");
}

seed().catch(console.error);
