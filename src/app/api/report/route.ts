import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, clients } from "@/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.username !== "jenifar") {
      // Admin could also view it, but the requirement specifically says "for the employee jenifar".
      if (session?.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // dateParam is expected to be YYYY-MM-DD
    const bdStart = new Date(`${dateParam}T00:00:00+06:00`);
    const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);

    const taskList = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        proofUrl: tasks.proofUrl,
        proofLink: tasks.proofLink,
        status: tasks.status,
        submittedAt: tasks.submittedAt,
        userId: tasks.userId,
        userName: users.displayName,
        userAvatar: users.avatarColor,
        clientName: clients.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.userId, users.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(
        and(
          gte(tasks.submittedAt, bdStart),
          lt(tasks.submittedAt, bdEnd)
        )
      )
      .orderBy(desc(tasks.submittedAt));

    // Group by user
    const grouped = taskList.reduce((acc: any, task) => {
      const uId = task.userId;
      if (!acc[uId]) {
        acc[uId] = {
          user: {
            id: uId,
            name: task.userName,
            avatar: task.userAvatar,
          },
          tasks: [],
        };
      }
      acc[uId].tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        proofUrl: task.proofUrl,
        proofLink: task.proofLink,
        status: task.status,
        clientName: task.clientName,
        submittedAt: task.submittedAt,
      });
      return acc;
    }, {});

    return NextResponse.json({
      reportDate: dateParam,
      data: Object.values(grouped),
    });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
