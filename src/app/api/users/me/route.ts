import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, createSession } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { profilePicture } = body;

    if (profilePicture === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        profilePicture,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    // Update session cookie
    await createSession({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      avatarColor: session.avatarColor,
      profilePicture,
    });

    return NextResponse.json({ success: true, profilePicture });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
