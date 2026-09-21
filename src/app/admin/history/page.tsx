"use client";

import { useState, useEffect, useCallback } from "react";
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

const BD_TZ = "Asia/Dhaka";

function getBDToday() {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: BD_TZ });
}

export default function AdminHistoryPage() {
  const { showToast } = useAdminToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(getBDToday());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const bdStart = new Date(`${dateFilter}T00:00:00+06:00`);
      const bdEnd = new Date(bdStart.getTime() + 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        dateFrom: bdStart.toISOString(),
        dateTo: bdEnd.toISOString(),
        limit: "500", // Fetch a large chunk for the day
      });

      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setSelectedIds(new Set()); // clear selection on fetch
    } catch (err) {
      console.error(err);
      showToast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, showToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleBulkDeleteByDate = async () => {
    if (!confirm(`WARNING: This will permanently delete ALL ${tasks.length} tasks and their images for ${dateFilter}. Are you sure?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", date: dateFilter }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        fetchTasks();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected tasks and their images?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        fetchTasks();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      timeZone: BD_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">History & Cleanup</h1>
        <p className="text-text-secondary">View past tasks and bulk delete to free up storage</p>
      </div>

      {/* Filters & Actions */}
      <div className="glass-card p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-text-secondary">Select Date (BD Time):</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input-glass text-sm py-2 px-4 w-auto"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDeleteSelected}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete Selected ({selectedIds.size})
            </button>
          )}

          <button
            onClick={handleBulkDeleteByDate}
            disabled={actionLoading || tasks.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete All for {dateFilter}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-glass-border flex items-center gap-4 bg-glass/50">
          <input
            type="checkbox"
            checked={tasks.length > 0 && selectedIds.size === tasks.length}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-glass-border bg-glass/50 text-amber-500 focus:ring-amber-500"
            disabled={tasks.length === 0}
          />
          <span className="text-sm font-medium text-text-secondary">
            {tasks.length} tasks found for this day
          </span>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <svg className="animate-spin w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            No tasks found for {dateFilter}
          </div>
        ) : (
          <div className="divide-y divide-glass-border">
            {tasks.map((task) => (
              <div key={task.id} className={`p-4 flex items-center gap-4 transition-colors ${selectedIds.has(task.id) ? 'bg-amber-500/5' : 'hover:bg-glass-hover'}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(task.id)}
                  onChange={() => toggleSelection(task.id)}
                  className="w-4 h-4 rounded border-glass-border bg-glass/50 text-amber-500 focus:ring-amber-500"
                />
                
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: task.userAvatar || "#3b82f6" }}
                >
                  {task.userName?.charAt(0) || "?"}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {task.userName} • {task.clientName} • {formatTime(task.submittedAt)}
                  </p>
                </div>
                
                <span className={`badge badge-${task.status} flex-shrink-0`}>{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
