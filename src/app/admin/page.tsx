"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { useAdminToast } from "./layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

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

function getBDToday() {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: BD_TZ });
}

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
  
  // Dashboard global stats (always Today)
  const [stats, setStats] = useState<Stats | null>(null);
  const [bdDate, setBdDate] = useState("");
  
  // Employee specific stats (Date controllable)
  const [chartDate, setChartDate] = useState(getBDToday());
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [approving, setApproving] = useState(false);
  const [autoApproval, setAutoApproval] = useState(false);
  const [togglingAutoApproval, setTogglingAutoApproval] = useState(false);

  // Export state
  const [exportDate, setExportDate] = useState(getBDToday());
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  // Fetch general stats (always today)
  const fetchGeneralStats = useCallback(() => {
    setLoadingStats(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setBdDate(data.bdDate || "");
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  // Fetch employee stats for a specific date
  const fetchEmployeeStats = useCallback((date: string) => {
    setLoadingChart(true);
    fetch(`/api/stats?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setEmployeeStats(data.employeeStats || []);
        setRecentActivity(data.recentActivity || []);
      })
      .catch(console.error)
      .finally(() => setLoadingChart(false));
  }, []);

  const fetchSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings && data.settings.auto_approval === "true") {
          setAutoApproval(true);
        } else {
          setAutoApproval(false);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchGeneralStats();
    fetchSettings();
  }, [fetchGeneralStats, fetchSettings]);

  useEffect(() => {
    fetchEmployeeStats(chartDate);
  }, [chartDate, fetchEmployeeStats]);

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
        fetchGeneralStats();
        fetchEmployeeStats(chartDate); // Refresh chart too
      } else {
        showToast(data.error || "Failed to approve", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setApproving(false);
    }
  };

  const toggleAutoApproval = async () => {
    setTogglingAutoApproval(true);
    const newValue = !autoApproval;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "auto_approval", value: newValue ? "true" : "false" }),
      });
      if (res.ok) {
        setAutoApproval(newValue);
        showToast(`Auto-approval turned ${newValue ? "ON" : "OFF"}`, "success");
      } else {
        showToast("Failed to update setting", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setTogglingAutoApproval(false);
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

  // Top Performer Logic
  const topPerformer = useMemo(() => {
    if (!employeeStats || employeeStats.length === 0) return null;
    return employeeStats.reduce((prev, current) => 
      (prev.todayTasks > current.todayTasks) ? prev : current
    );
  }, [employeeStats]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    return employeeStats.map(emp => ({
      name: emp.displayName.split(" ")[0], // First name only for cleaner chart
      tasks: emp.todayTasks,
      color: emp.avatarColor || "#3b82f6"
    }));
  }, [employeeStats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-glass-border">
          <p className="font-semibold text-text-primary">{label}</p>
          <p className="text-sm text-amber-400">
            {payload[0].value} Tasks
          </p>
        </div>
      );
    }
    return null;
  };

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

      {/* Auto Approval Banner */}
      <div className="mb-8 glass-card p-4 flex items-center justify-between border-l-4 border-l-amber-500">
        <div>
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Auto-Approval System
          </h3>
          <p className="text-sm text-text-secondary mt-1">When enabled, all new tasks submitted by employees are instantly marked as &quot;approved&quot;.</p>
        </div>
        <button
          onClick={toggleAutoApproval}
          disabled={togglingAutoApproval}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            autoApproval ? "bg-green-500" : "bg-glass-border"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              autoApproval ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Top Performer Banner */}
      {!loadingChart && topPerformer && topPerformer.todayTasks > 0 && (
        <div className="mb-8 relative overflow-hidden glass-card p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 group">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all duration-500" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-amber-500/30"
                style={{ backgroundColor: topPerformer.avatarColor }}
              >
                {topPerformer.displayName.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                🏆 MVP
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-500 mb-1 tracking-wider uppercase">Top Performer ({chartDate})</p>
              <h2 className="text-2xl font-bold text-text-primary">
                {topPerformer.displayName}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Crushing it with <span className="font-bold text-amber-400">{topPerformer.todayTasks} completed tasks</span>!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {loadingStats ? (
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

      {/* Employee Performance Chart Section */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Employee Performance Chart
          </h2>
          <div className="flex items-center gap-3 bg-glass/30 p-1.5 rounded-xl border border-glass-border">
            <span className="text-xs font-medium text-text-muted pl-2">Select Date:</span>
            <input
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
              className="bg-transparent text-sm text-text-primary font-medium focus:outline-none border-none py-1 px-2 cursor-pointer"
            />
          </div>
        </div>

        {loadingChart ? (
          <div className="h-64 w-full shimmer rounded-xl" />
        ) : chartData.length === 0 || chartData.every(d => d.tasks === 0) ? (
          <div className="h-64 w-full flex items-center justify-center border border-dashed border-glass-border rounded-xl">
            <p className="text-text-muted text-sm">No task data available for {chartDate}</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff60" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff60" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar 
                  dataKey="tasks" 
                  radius={[6, 6, 0, 0]}
                  animationDuration={1500}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Employee Performance List */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Activity for {chartDate}
          </h2>
          {loadingChart ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
            </div>
          ) : employeeStats.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No employee data yet</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                    <p className="text-xs text-text-muted">completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed for selected date */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Task Feed ({chartDate})
          </h2>
          {loadingChart ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No activity for this date</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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

      {/* Daily Work Export */}
      <div className="glass-card p-6">
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
    </div>
  );
}
