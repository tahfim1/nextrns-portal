"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface EmployeeStat {
  userId: number;
  displayName: string;
  avatarColor: string;
  totalTasks: number;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDate, setExportDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setEmployeeStats(data.employeeStats || []);
        setRecentActivity(data.recentActivity || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
      const dateFrom = exportDate + "T00:00:00";
      const nextDay = new Date(exportDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const dateTo = nextDay.toISOString().split("T")[0] + "T00:00:00";

      const params = new URLSearchParams({
        dateFrom,
        dateTo,
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

        // Handle duplicate filenames
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

      // Trigger download
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
    { label: "Total Tasks", value: stats?.total ?? 0, color: "from-blue-500/20 to-blue-600/20", textColor: "text-blue-400", icon: "📋" },
    { label: "Today", value: stats?.today ?? 0, color: "from-violet-500/20 to-violet-600/20", textColor: "text-violet-400", icon: "📅" },
    { label: "This Week", value: stats?.thisWeek ?? 0, color: "from-cyan-500/20 to-cyan-600/20", textColor: "text-cyan-400", icon: "📊" },
    { label: "This Month", value: stats?.thisMonth ?? 0, color: "from-pink-500/20 to-pink-600/20", textColor: "text-pink-400", icon: "📈" },
    { label: "Pending", value: stats?.pending ?? 0, color: "from-amber-500/20 to-amber-600/20", textColor: "text-amber-400", icon: "⏳" },
    { label: "Approved", value: stats?.approved ?? 0, color: "from-green-500/20 to-green-600/20", textColor: "text-green-400", icon: "✅" },
    { label: "Rejected", value: stats?.rejected ?? 0, color: "from-red-500/20 to-red-600/20", textColor: "text-red-400", icon: "❌" },
  ];

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary">Overview of all employee activities</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="shimmer h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className="text-sm text-text-muted mt-1">{stat.label}</p>
            </div>
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
        {/* Employee Performance */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Employee Performance
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
                    <p className="text-lg font-bold text-text-primary">{emp.totalTasks}</p>
                    <p className="text-xs text-text-muted">total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No activity yet</p>
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
                    <p className="text-xs text-text-muted">{formatTimeAgo(activity.submittedAt)}</p>
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
