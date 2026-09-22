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
    const { profilePicture, designation } = body;

    if (profilePicture === undefined && designation === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (designation !== undefined) updateData.designation = designation;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.userId));

    // Update session cookie
    await createSession({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      avatarColor: session.avatarColor,
      profilePicture: profilePicture !== undefined ? profilePicture : session.profilePicture,
      designation: designation !== undefined ? designation : session.designation,
    });

    return NextResponse.json({ success: true, profilePicture, designation });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
