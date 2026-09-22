"use client";

import { useState, useEffect } from "react";
import { useAdminToast } from "../layout";

interface Task {
  id: number;
  title: string;
  description: string | null;
  proofType: string;
  proofUrl: string;
  proofLink: string | null;
  status: string;
  adminNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  userName: string;
  userAvatar: string;
  clientName: string;
}

interface ClientOption {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  displayName: string;
}

export default function AdminTasksPage() {
  const { showToast } = useAdminToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  
  const [dateFilter, setDateFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("date") || "";
    }
    return "";
  });
  
  const [userFilter, setUserFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("userId") || "all";
    }
    return "all";
  });

  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(console.error);
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(console.error);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, clientFilter, userFilter, dateFilter, page]);

  const fetchTasks = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (clientFilter !== "all") params.append("clientId", clientFilter);
    if (userFilter !== "all") params.append("userId", userFilter);
    if (dateFilter) {
      const bdStart = new Date(`${dateFilter}T00:00:00+06:00`);
      const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);
      params.append("dateFrom", bdStart.toISOString());
      params.append("dateTo", bdEnd.toISOString());
    }

    try {
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    setActionLoading(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: adminNotes[taskId] || null }),
      });
      if (res.ok) {
        showToast(`Task ${status}!`, "success");
        fetchTasks();
      } else {
        showToast("Failed to update task", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Task deleted", "success");
        fetchTasks();
      }
    } catch {
      showToast("Failed to delete task", "error");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      timeZone: "Asia/Dhaka",
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">All Tasks</h1>
        <p className="text-text-secondary">Review and manage all employee submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {["all", "submitted", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                statusFilter === s
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/20"
                  : "bg-glass text-text-secondary border border-glass-border hover:text-text-primary"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
          className="input-glass text-sm py-2 px-4 w-auto"
        >
          <option value="all" className="bg-navy-900">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id} className="bg-navy-900">{c.name}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
          className="input-glass text-sm py-2 px-4 w-auto"
        >
          <option value="all" className="bg-navy-900">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} className="bg-navy-900">{u.displayName}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 bg-glass/30 px-3 py-2 rounded-xl border border-glass-border">
          <span className="text-xs font-medium text-text-muted">Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-text-primary focus:outline-none"
          />
        </div>
        {(dateFilter || userFilter !== "all" || clientFilter !== "all" || statusFilter !== "all") && (
          <button 
            onClick={() => {
              setDateFilter("");
              setUserFilter("all");
              setClientFilter("all");
              setStatusFilter("all");
              setPage(1);
            }}
            className="text-xs text-text-muted hover:text-white px-2 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-text-secondary">No tasks found with current filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                className="w-full text-left p-5 flex items-center gap-4 hover:bg-glass-hover transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: task.userAvatar || "#3b82f6" }}
                >
                  {task.userName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {task.userName} • {task.clientName} • {formatDate(task.submittedAt)}
                  </p>
                </div>
                <span className={`badge badge-${task.status} flex-shrink-0`}>{task.status}</span>
                <svg className={`w-5 h-5 text-text-muted transition-transform ${expandedTask === task.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {expandedTask === task.id && (
                <div className="px-5 pb-5 border-t border-glass-border pt-4 slide-up">
                  {task.description && (
                    <p className="text-sm text-text-secondary mb-4">{task.description}</p>
                  )}

                  {/* Proof */}
                  <div className="mb-4 space-y-3">
                    {task.proofLink && (
                      <div>
                        <a href={task.proofLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          Open Proof Link
                        </a>
                      </div>
                    )}
                    {task.proofUrl && task.proofUrl.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {task.proofUrl.split(',').map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Screenshot ${idx + 1}`} className="rounded-xl w-full aspect-video object-cover border border-glass-border hover:opacity-90 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                    {(!task.proofUrl || task.proofUrl.length === 0) && !task.proofLink && (
                      <p className="text-sm text-text-muted italic">No proof provided.</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-secondary mb-2">Admin Notes</label>
                    <textarea
                      value={adminNotes[task.id] ?? task.adminNotes ?? ""}
                      onChange={(e) => setAdminNotes((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      className="input-glass resize-none"
                      rows={2}
                      placeholder="Add notes for the employee..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {task.status === "submitted" && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(task.id, "approved")}
                          disabled={actionLoading === task.id}
                          className="btn-success text-sm disabled:opacity-50"
                        >
                          {actionLoading === task.id ? "..." : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, "rejected")}
                          disabled={actionLoading === task.id}
                          className="btn-danger text-sm disabled:opacity-50"
                        >
                          {actionLoading === task.id ? "..." : "✕ Reject"}
                        </button>
                      </>
                    )}
                    {task.status !== "submitted" && (
                      <button
                        onClick={() => updateTaskStatus(task.id, "submitted")}
                        disabled={actionLoading === task.id}
                        className="btn-ghost text-sm"
                      >
                        ↩ Reset to Pending
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="btn-ghost text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-4 py-2 text-sm disabled:opacity-30">← Prev</button>
          <span className="text-sm text-text-secondary px-4">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-4 py-2 text-sm disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
