"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { useAdminToast } from "./layout";

interface Stats {
  todayTotal: number;
  todayPending: number;
  todayApproved: number;
  todayRejected: number;
  thisWeek: number;
}

interface EmployeeStat {
  userId: number;
  displayName: string;
  avatarColor: string;
  todayTasks: number;
  weekTasks: number;
}

interface Activity {
  id: number;
  title: string;
  status: string;
  submittedAt: string;
  userName: string;
  userAvatar: string;
}

interface ExportTask {
  id: number;
  title: string;
  proofUrl: string;
  proofLink: string | null;
  status: string;
  clientName: string;
  userName: string;
}

const BD_TZ = "Asia/Dhaka";

function formatBDTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    timeZone: BD_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bdDate, setBdDate] = useState("");
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  // Export state
  const [exportDate, setExportDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: BD_TZ });
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const fetchStats = useCallback(() => {
    setLoading(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setBdDate(data.bdDate || "");
        setEmployeeStats(data.employeeStats || []);
        setRecentActivity(data.recentActivity || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleApproveAll = async () => {
    if (!stats || stats.todayPending === 0) return;
    if (!confirm(`Approve all ${stats.todayPending} pending tasks?`)) return;

    setApproving(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Approved ${data.count} tasks!`, "success");
        fetchStats();
      } else {
        showToast(data.error || "Failed to approve", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setApproving(false);
    }
  };

  // ZIP Export logic
  const sanitizeName = (name: string) =>
    name.replace(/[<>:"/\\|?*]/g, "").replace(/&/g, "and").replace(/\s+/g, "_").substring(0, 60);

  const getExtFromUrl = (url: string) => {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|pdf)$/i);
      if (match) return "." + match[1].toLowerCase();
    } catch {}
    return ".png";
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportProgress("Fetching tasks...");

    try {
      const bdStart = new Date(`${exportDate}T00:00:00+06:00`);
      const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        dateFrom: bdStart.toISOString(),
        dateTo: bdEnd.toISOString(),
        limit: "200",
      });

      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      const tasks: ExportTask[] = (data.tasks || []).filter(
        (t: ExportTask) => t.proofUrl && t.proofUrl.trim() !== ""
      );

      if (tasks.length === 0) {
        setExportProgress("No tasks with images found for this date.");
        setTimeout(() => setExportProgress(""), 3000);
        setExporting(false);
        return;
      }

      const zip = new JSZip();
      const clientFolders: Record<string, JSZip> = {};
      const nameCounters: Record<string, number> = {};

      let downloaded = 0;
      for (const task of tasks) {
        const folderName = sanitizeName(task.clientName || "Unknown_Client");
        if (!clientFolders[folderName]) {
          clientFolders[folderName] = zip.folder(folderName)!;
        }

        const baseName = sanitizeName(task.title || `task_${task.id}`);
        const ext = getExtFromUrl(task.proofUrl);

        const key = folderName + "/" + baseName + ext;
        if (nameCounters[key] !== undefined) {
          nameCounters[key]++;
        } else {
          nameCounters[key] = 0;
        }
        const suffix = nameCounters[key] > 0 ? `_${nameCounters[key]}` : "";
        const fileName = `${baseName}${suffix}${ext}`;

        setExportProgress(`Downloading ${downloaded + 1}/${tasks.length}: ${task.title}`);

        try {
          const imgRes = await fetch(task.proofUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            clientFolders[folderName].file(fileName, blob);
          }
        } catch {
          // Skip failed downloads
        }
        downloaded++;
      }

      setExportProgress("Creating ZIP file...");
      const content = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `Client_Work_${exportDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setExportProgress(`Done! ${downloaded} files exported.`);
      setTimeout(() => setExportProgress(""), 4000);
    } catch (err) {
      console.error(err);
      setExportProgress("Export failed. Please try again.");
      setTimeout(() => setExportProgress(""), 3000);
    } finally {
      setExporting(false);
    }
  }, [exportDate]);

  const statCards = [
    {
      label: "Today's Tasks",
      value: stats?.todayTotal ?? 0,
      textColor: "text-blue-400",
      icon: "\ud83d\udccb",
      href: "/admin/tasks",
    },
    {
      label: "Pending",
      value: stats?.todayPending ?? 0,
      textColor: "text-amber-400",
      icon: "\u23f3",
      href: "/admin/tasks?status=submitted",
    },
    {
      label: "Approved",
      value: stats?.todayApproved ?? 0,
      textColor: "text-green-400",
      icon: "\u2705",
      href: "/admin/tasks?status=approved",
    },
    {
      label: "Rejected",
      value: stats?.todayRejected ?? 0,
      textColor: "text-red-400",
      icon: "\u274c",
      href: "/admin/tasks?status=rejected",
    },
  ];

  const formattedBdDate = bdDate
    ? new Date(`${bdDate}T00:00:00+06:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: BD_TZ,
      })
    : "";

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">Admin Dashboard</h1>
          <p className="text-text-secondary">
            {formattedBdDate && (
              <span className="text-amber-400 font-medium">{formattedBdDate}</span>
            )}
            {" \u00b7 "}Bangladesh Time
          </p>
        </div>
        {stats && stats.todayPending > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={approving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/20 hover:from-green-500/30 hover:to-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {approving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Approving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approve All ({stats.todayPending})
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="stat-card text-left cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className="text-sm text-text-muted mt-1">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Daily Work Export */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Daily Work Export
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Download all proof images for a specific day, organized by client folders in a ZIP file.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="input-glass text-sm py-2.5 px-4 w-auto"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download ZIP
              </>
            )}
          </button>
          {exportProgress && (
            <span className="text-sm text-text-muted animate-pulse">{exportProgress}</span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Employee Performance (Today) */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Today&apos;s Employee Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
            </div>
          ) : employeeStats.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No employee data yet</p>
          ) : (
            <div className="space-y-3">
              {employeeStats.map((emp, idx) => (
                <div key={emp.userId} className="flex items-center gap-3 p-3 rounded-xl bg-glass/50 hover:bg-glass-hover transition-all">
                  <span className="text-text-muted text-sm font-mono w-6">#{idx + 1}</span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: emp.avatarColor }}
                  >
                    {emp.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{emp.displayName}</p>
                    <p className="text-xs text-text-muted">{emp.weekTasks} this week</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">{emp.todayTasks}</p>
                    <p className="text-xs text-text-muted">today</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Activity Feed */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Today&apos;s Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No activity today</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-glass/50 hover:bg-glass-hover transition-all">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: activity.userAvatar || "#3b82f6" }}
                  >
                    {activity.userName?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      <span className="font-medium">{activity.userName}</span>{" "}
                      <span className="text-text-secondary">submitted</span>{" "}
                      <span className="font-medium">{activity.title}</span>
                    </p>
                    <p className="text-xs text-text-muted">{formatBDTime(activity.submittedAt)}</p>
                  </div>
                  <span className={`badge badge-${activity.status} flex-shrink-0`}>{activity.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
