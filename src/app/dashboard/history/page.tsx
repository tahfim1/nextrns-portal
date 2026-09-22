"use client";

import { useState, useEffect } from "react";

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
  clientName: string;
}

export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTasks();
  }, [filter, page]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (filter !== "all") params.append("status", filter);

      const res = await fetch(`/api/tasks?personal=true&${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filters = [
    { label: "All", value: "all" },
    { label: "Pending", value: "submitted" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <div className="max-w-4xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Task History</h1>
        <p className="text-text-secondary">View all your submitted tasks and their statuses</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.value
                ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/20"
                : "bg-glass text-text-secondary border border-glass-border hover:text-text-primary hover:bg-glass-hover"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-glass flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-1">No tasks found</p>
          <p className="text-text-muted text-sm">Try changing the filter or submit a new task</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="glass-card overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                className="w-full text-left p-5 flex items-center gap-4 hover:bg-glass-hover transition-colors"
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
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {task.clientName} • {formatDate(task.submittedAt)}
                  </p>
                </div>
                <span className={`badge badge-${task.status} flex-shrink-0`}>{task.status}</span>
                <svg
                  className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform ${expandedTask === task.id ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {expandedTask === task.id && (
                <div className="px-5 pb-5 border-t border-glass-border pt-4 slide-up">
                  {task.description && (
                    <p className="text-sm text-text-secondary mb-4">{task.description}</p>
                  )}
                  <div className="flex flex-col gap-3">
                    {task.proofLink && (
                      <div>
                        <a
                          href={task.proofLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          Open Proof Link
                        </a>
                      </div>
                    )}
                    {task.proofUrl && task.proofUrl.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                        {task.proofUrl.split(',').map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Task proof ${idx + 1}`}
                              className="rounded-xl w-full aspect-video object-cover border border-glass-border hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {(!task.proofUrl || task.proofUrl.length === 0) && !task.proofLink && (
                      <p className="text-sm text-text-muted italic">No proof provided.</p>
                    )}
                  </div>
                  {task.adminNotes && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-400 mb-1">Admin Notes</p>
                      <p className="text-sm text-text-secondary">{task.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost px-4 py-2 text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-sm text-text-secondary px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-ghost px-4 py-2 text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
