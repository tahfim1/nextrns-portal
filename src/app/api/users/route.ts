import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashSync } from "bcryptjs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        avatarColor: users.avatarColor,
        createdAt: users.createdAt,
        taskCount: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.user_id = ${users.id})`,
      })
      .from(users)
      .orderBy(users.displayName);

    return NextResponse.json({ users: userList });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, displayName, password } = await request.json();

    if (!username || !displayName || !password) {
      return NextResponse.json(
        { error: "Username, display name, and password are required" },
        { status: 400 }
      );
    }

    const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#06b6d4", "#f43f5e"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = await db
      .insert(users)
      .values({
        username: username.toLowerCase().trim(),
        displayName,
        passwordHash: hashSync(password, 10),
        role: "employee",
        avatarColor: randomColor,
      })
      .returning();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        displayName: newUser[0].displayName,
        role: newUser[0].role,
        avatarColor: newUser[0].avatarColor,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
