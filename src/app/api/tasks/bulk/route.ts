import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// BD timezone offset: UTC+6
function getBDDateRange(dateStr: string) {
  // dateStr is YYYY-MM-DD in BD time
  // BD midnight = UTC 18:00 previous day
  const bdStart = new Date(`${dateStr}T00:00:00+06:00`);
  const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);
  return { bdStart, bdEnd };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "approve") {
      // Approve all submitted tasks
      const result = await db
        .update(tasks)
        .set({ status: "approved", reviewedAt: new Date() })
        .where(eq(tasks.status, "submitted"))
        .returning({ id: tasks.id });

      return NextResponse.json({
        success: true,
        count: result.length,
        message: `Approved ${result.length} tasks`,
      });
    }

    if (action === "delete") {
      const { date, ids } = body;

      if (ids && Array.isArray(ids) && ids.length > 0) {
        // Fetch tasks first to get proof URLs
        const tasksToDelete = await db
          .select({ id: tasks.id, proofUrl: tasks.proofUrl })
          .from(tasks)
          .where(inArray(tasks.id, ids.map((id: number) => id)));

        // Delete blobs
        const { del } = await import("@vercel/blob");
        for (const t of tasksToDelete) {
          if (t.proofUrl) {
            const urls = t.proofUrl.split(',').filter((u: string) => u.includes("public.blob.vercel-storage.com"));
            if (urls.length > 0) {
              try { await del(urls); } catch (e) { console.error("Blob delete error:", e); }
            }
          }
        }

        // Delete specific tasks by IDs
        const result = await db
          .delete(tasks)
          .where(inArray(tasks.id, ids.map((id: number) => id)))
          .returning({ id: tasks.id });

        return NextResponse.json({
          success: true,
          count: result.length,
          message: `Deleted ${result.length} tasks`,
        });
      }

      if (date) {
        const { bdStart, bdEnd } = getBDDateRange(date);
        
        // Fetch tasks first
        const tasksToDelete = await db
          .select({ id: tasks.id, proofUrl: tasks.proofUrl })
          .from(tasks)
          .where(
            and(
              gte(tasks.submittedAt, bdStart),
              lte(tasks.submittedAt, bdEnd)
            )
          );

        // Delete blobs
        const { del } = await import("@vercel/blob");
        for (const t of tasksToDelete) {
          if (t.proofUrl) {
            const urls = t.proofUrl.split(',').filter((u: string) => u.includes("public.blob.vercel-storage.com"));
            if (urls.length > 0) {
              try { await del(urls); } catch (e) { console.error("Blob delete error:", e); }
            }
          }
        }

        // Delete all tasks for a specific date (BD time)
        const result = await db
          .delete(tasks)
          .where(
            and(
              gte(tasks.submittedAt, bdStart),
              lte(tasks.submittedAt, bdEnd)
            )
          )
          .returning({ id: tasks.id });

        return NextResponse.json({
          success: true,
          count: result.length,
          message: `Deleted ${result.length} tasks from ${date}`,
        });
      }

      return NextResponse.json(
        { error: "Either 'date' or 'ids' is required for delete action" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'delete'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
