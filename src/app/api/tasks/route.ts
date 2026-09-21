import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, clients } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const offset = (page - 1) * limit;

    const conditions = [];

    // Employees can only see their own tasks
    if (session.role !== "admin") {
      conditions.push(eq(tasks.userId, session.userId));
    } else if (userId) {
      conditions.push(eq(tasks.userId, parseInt(userId)));
    }

    if (status) {
      conditions.push(eq(tasks.status, status as "submitted" | "approved" | "rejected"));
    }

    if (clientId) {
      conditions.push(eq(tasks.clientId, parseInt(clientId)));
    }

    if (dateFrom) {
      conditions.push(gte(tasks.submittedAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const { lte } = await import("drizzle-orm");
      conditions.push(lte(tasks.submittedAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const taskList = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        proofType: tasks.proofType,
        proofUrl: tasks.proofUrl,
        proofLink: tasks.proofLink,
        status: tasks.status,
        adminNotes: tasks.adminNotes,
        submittedAt: tasks.submittedAt,
        reviewedAt: tasks.reviewedAt,
        userId: tasks.userId,
        clientId: tasks.clientId,
        userName: users.displayName,
        userAvatar: users.avatarColor,
        clientName: clients.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.userId, users.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(tasks.submittedAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(whereClause);

    const total = Number(countResult[0].count);

    return NextResponse.json({
      tasks: taskList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, clientId, proofType, proofUrl, proofLink } =
      await request.json();

    if (!title || !clientId || !proofType) {
      return NextResponse.json(
        { error: "Title, client, and proof type are required" },
        { status: 400 }
      );
    }

    const newTask = await db
      .insert(tasks)
      .values({
        userId: session.userId,
        clientId: parseInt(clientId),
        title,
        description: description || null,
        proofType: proofType || "screenshot",
        proofUrl: proofUrl || "",
        proofLink: proofLink || null,
      })
      .returning();

    return NextResponse.json({ success: true, task: newTask[0] });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
