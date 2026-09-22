import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { sql, desc, eq, gte, lte, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";

function getBDToday(customDate?: string) {
  const bdDateStr = customDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }); // YYYY-MM-DD
  const bdStart = new Date(`${bdDateStr}T00:00:00+06:00`);
  const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);
  return { bdStart, bdEnd, bdDateStr };
}

function getBDWeekStart() {
  const now = new Date();
  const bdDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const bdNow = new Date(`${bdDateStr}T00:00:00+06:00`);
  const day = bdNow.getDay();
  const weekStart = new Date(bdNow.getTime() - day * 24 * 60 * 60 * 1000);
  return weekStart;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { bdStart, bdEnd, bdDateStr } = getBDToday(dateParam || undefined);
    const weekStart = getBDWeekStart();

    // Today's stats (BD time)
    const [todayTotal] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(gte(tasks.submittedAt, bdStart), lte(tasks.submittedAt, bdEnd)));

    const [todayPending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          gte(tasks.submittedAt, bdStart),
          lte(tasks.submittedAt, bdEnd),
          eq(tasks.status, "submitted")
        )
      );

    const [todayApproved] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          gte(tasks.submittedAt, bdStart),
          lte(tasks.submittedAt, bdEnd),
          eq(tasks.status, "approved")
        )
      );

    const [todayRejected] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          gte(tasks.submittedAt, bdStart),
          lte(tasks.submittedAt, bdEnd),
          eq(tasks.status, "rejected")
        )
      );

    // This week's total (for employee stats)
    const [weekTasks] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(gte(tasks.submittedAt, weekStart));

    // Per-employee stats (today focused)
    const employeeStats = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarColor: users.avatarColor,
        todayTasks: sql<number>`count(case when ${tasks.submittedAt} >= ${bdStart} and ${tasks.submittedAt} < ${bdEnd} then 1 end)`,
        weekTasks: sql<number>`count(case when ${tasks.submittedAt} >= ${weekStart} then 1 end)`,
      })
      .from(users)
      .leftJoin(tasks, eq(users.id, tasks.userId))
      .groupBy(users.id, users.displayName, users.avatarColor)
      .orderBy(sql`count(case when ${tasks.submittedAt} >= ${bdStart} and ${tasks.submittedAt} < ${bdEnd} then 1 end) desc`);

    // Recent activity (today only)
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
      .where(and(gte(tasks.submittedAt, bdStart), lte(tasks.submittedAt, bdEnd)))
      .orderBy(desc(tasks.submittedAt))
      .limit(20);

    return NextResponse.json({
      stats: {
        todayTotal: Number(todayTotal.count),
        todayPending: Number(todayPending.count),
        todayApproved: Number(todayApproved.count),
        todayRejected: Number(todayRejected.count),
        thisWeek: Number(weekTasks.count),
      },
      bdDate: bdDateStr,
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
