import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hashSync } from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { resetPassword, displayName, role, profilePicture, designation } = body;

    if (resetPassword) {
      await db
        .update(users)
        .set({
          passwordHash: hashSync("12345", 10),
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(id)));

      return NextResponse.json({ success: true, message: "Password reset to 12345" });
    }

    if (displayName || role || profilePicture !== undefined || designation !== undefined) {
      const updateData: any = { updatedAt: new Date() };
      if (displayName) updateData.displayName = displayName;
      if (role) updateData.role = role;
      if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
      if (designation !== undefined) updateData.designation = designation;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)));

      return NextResponse.json({ success: true, message: "User updated" });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
