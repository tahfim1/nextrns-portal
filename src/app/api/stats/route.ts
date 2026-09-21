import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { sql, desc, eq, gte, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total stats
    const [totalTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks);

    const [todayTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(gte(tasks.submittedAt, todayStart));

    const [weekTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(gte(tasks.submittedAt, weekStart));

    const [monthTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(gte(tasks.submittedAt, monthStart));

    const [pendingTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "submitted"));

    const [approvedTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "approved"));

    const [rejectedTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, "rejected"));

    // Per-employee stats
    const employeeStats = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarColor: users.avatarColor,
        totalTasks: sql<number>`count(${tasks.id})`,
        weekTasks: sql<number>`count(case when ${tasks.submittedAt} >= ${weekStart} then 1 end)`,
      })
      .from(users)
      .leftJoin(tasks, eq(users.id, tasks.userId))
      .where(eq(users.role, "employee"))
      .groupBy(users.id, users.displayName, users.avatarColor)
      .orderBy(sql`count(${tasks.id}) desc`);

    // Recent activity
    const recentActivity = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        submittedAt: tasks.submittedAt,
        userName: users.displayName,
        userAvatar: users.avatarColor,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.userId, users.id))
      .orderBy(desc(tasks.submittedAt))
      .limit(10);

    return NextResponse.json({
      stats: {
        total: Number(totalTasks.count),
        today: Number(todayTasks.count),
        thisWeek: Number(weekTasks.count),
        thisMonth: Number(monthTasks.count),
        pending: Number(pendingTasks.count),
        approved: Number(approvedTasks.count),
        rejected: Number(rejectedTasks.count),
      },
      employeeStats,
      recentActivity,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
