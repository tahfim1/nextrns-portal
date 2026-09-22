"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser } from "./layout";
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

interface Task {
  id: number;
  title: string;
  description: string | null;
  proofType: string;
  proofUrl: string;
  status: string;
  submittedAt: string;
  clientName: string;
}

interface Stats {
  total: number;
  thisWeek: number;
  approved: number;
  pending: number;
}

interface EmployeeStat {
  userId: number;
  displayName: string;
  avatarColor: string;
  todayTasks: number;
  weekTasks: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasksAndStats();
  }, []);

  const fetchTasksAndStats = async () => {
    try {
      const bdDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
      const bdStart = new Date(`${bdDateStr}T00:00:00+06:00`);
      const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);
      
      const params = new URLSearchParams({
        limit: "10",
        personal: "true",
        dateFrom: bdStart.toISOString(),
        dateTo: bdEnd.toISOString()
      });

      const [tasksRes, statsRes] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch("/api/stats?personal=true")
      ]);
      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();
      
      setTasks(tasksData.tasks || []);
      
      if (statsData.stats) {
        setStats({
          total: statsData.stats.todayTotal,
          thisWeek: statsData.stats.thisWeek,
          approved: statsData.stats.todayApproved,
          pending: statsData.stats.todayPending,
        });
      }

      if (statsData.employeeStats) {
        setEmployeeStats(statsData.employeeStats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const statCards = [
    {
      label: "Today's Tasks",
      value: stats?.total ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
      color: "from-blue-500/20 to-blue-600/20",
      textColor: "text-blue-400",
    },
    {
      label: "This Week",
      value: stats?.thisWeek ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      color: "from-violet-500/20 to-violet-600/20",
      textColor: "text-violet-400",
    },
    {
      label: "Approved",
      value: stats?.approved ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-green-500/20 to-green-600/20",
      textColor: "text-green-400",
    },
    {
      label: "Pending",
      value: stats?.pending ?? 0,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "from-amber-500/20 to-amber-600/20",
      textColor: "text-amber-400",
    },
  ];

  const formatDate = (dateStr: string) => {
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

  const chartData = useMemo(() => {
    return employeeStats.map(emp => ({
      name: emp.displayName.split(" ")[0],
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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
        </h1>
        <p className="text-text-secondary">Here&apos;s your task overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
              <span className={stat.textColor}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{loading ? "—" : stat.value}</p>
            <p className="text-sm text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Action */}
      <div className="mb-8 fade-in flex flex-col sm:flex-row flex-wrap gap-4">
        <Link
          href="/dashboard/submit"
          className="btn-primary inline-flex items-center justify-center gap-3 text-base px-6 py-4 rounded-2xl flex-1 sm:flex-none"
        >
          <span className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Submit New Task
          </span>
        </Link>
        {(user?.username === "jenifar" || user?.role === "admin") && (
          <Link
            href="/dashboard/report"
            className="btn-primary inline-flex items-center justify-center gap-3 text-base px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25 flex-1 sm:flex-none"
          >
            <span className="flex items-center gap-3 text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Daily Report
            </span>
          </Link>
        )}
      </div>

      {/* Employee Performance Chart Section */}
      <div className="glass-card p-6 mb-8 fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Today&apos;s Leaderboard
          </h2>
        </div>

        {loading ? (
          <div className="h-64 w-full shimmer rounded-xl" />
        ) : chartData.length === 0 || chartData.every(d => d.tasks === 0) ? (
          <div className="h-64 w-full flex items-center justify-center border border-dashed border-glass-border rounded-xl">
            <p className="text-text-muted text-sm">No task data available for today</p>
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

      {/* Recent Tasks */}
      <div className="glass-card p-6 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Recent Submissions</h2>
          <Link href="/dashboard/history" className="text-sm text-accent-blue hover:text-blue-400 transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-glass flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-text-secondary mb-2">No tasks submitted yet</p>
            <p className="text-text-muted text-sm">Start by submitting your first task!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-glass/50 hover:bg-glass-hover border border-transparent hover:border-glass-border transition-all duration-200"
              >
                <div className="flex-shrink-0">
                  {task.proofType === "screenshot" ? (
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{task.clientName} • {formatDate(task.submittedAt)}</p>
                </div>
                <span className={`badge badge-${task.status}`}>{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
