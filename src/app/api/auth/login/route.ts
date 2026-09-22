import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await db
        .select()
        .from(users)
        .where(eq(users.username, username.toLowerCase().trim()))
        .limit(1);
    } catch (dbError: any) {
      // Auto-heal missing profile_picture column (common issue on unmigrated deployments)
      if (dbError.message?.includes("profile_picture") || dbError.message?.includes("column")) {
        const { sql } = await import("drizzle-orm");
        try {
          await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture text, ADD COLUMN IF NOT EXISTS designation varchar(100);`);
          user = await db
            .select()
            .from(users)
            .where(eq(users.username, username.toLowerCase().trim()))
            .limit(1);
        } catch (healError) {
          throw dbError; // Throw original if healing fails
        }
      } else {
        throw dbError;
      }
    }

    if (user.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const foundUser = user[0];
    const passwordMatch = compareSync(password, foundUser.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await createSession({
      userId: foundUser.id,
      username: foundUser.username,
      displayName: foundUser.displayName,
      role: foundUser.role,
      avatarColor: foundUser.avatarColor,
      profilePicture: foundUser.profilePicture,
      designation: foundUser.designation,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        displayName: foundUser.displayName,
        role: foundUser.role,
        avatarColor: foundUser.avatarColor,
        profilePicture: foundUser.profilePicture,
        designation: foundUser.designation,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
