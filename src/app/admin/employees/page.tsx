"use client";

import { useState, useEffect } from "react";
import { useAdminToast } from "../layout";

interface Employee {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarColor: string;
  createdAt: string;
  taskCount: number;
}

export default function AdminEmployeesPage() {
  const { showToast } = useAdminToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("12345");
  const [adding, setAdding] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setEmployees(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newDisplayName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim(),
          password: newPassword,
        }),
      });
      if (res.ok) {
        showToast("Employee added!", "success");
        setNewUsername("");
        setNewDisplayName("");
        setNewPassword("12345");
        setShowAddForm(false);
        fetchEmployees();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to add employee", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setAdding(false);
    }
  };

  const resetPassword = async (id: number) => {
    if (!confirm("Reset this employee's password to 12345?")) return;
    setResettingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });
      if (res.ok) {
        showToast("Password reset to 12345", "success");
      } else {
        showToast("Failed to reset password", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Employees</h1>
          <p className="text-text-secondary">Manage team members</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary px-5 py-2.5">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Add Employee
          </span>
        </button>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="glass-card p-6 mb-6 slide-up">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Add New Employee</h3>
          <form onSubmit={addEmployee} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input-glass"
                  placeholder="e.g., john"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="input-glass"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Initial Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-glass"
                placeholder="Default: 12345"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={adding} className="btn-success px-6 disabled:opacity-50">
                {adding ? "Adding..." : "Add Employee"}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost px-4">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="shimmer h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {employees.map((emp) => (
            <div key={emp.id} className="glass-card p-5 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: emp.avatarColor }}
              >
                {emp.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{emp.displayName}</p>
                  {emp.role === "admin" && (
                    <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/20 text-[10px]">ADMIN</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">@{emp.username}</p>
              </div>
              <div className="text-right mr-4">
                <p className="text-xl font-bold text-text-primary">{emp.taskCount}</p>
                <p className="text-xs text-text-muted">tasks</p>
              </div>
              {emp.role !== "admin" && (
                <button
                  onClick={() => resetPassword(emp.id)}
                  disabled={resettingId === emp.id}
                  className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
                  title="Reset password to 12345"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                  {resettingId === emp.id ? "..." : "Reset PW"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
