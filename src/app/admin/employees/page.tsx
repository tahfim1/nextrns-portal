"use client";

import { useState, useEffect, useRef } from "react";
import { useAdminToast } from "../layout";
import imageCompression from "browser-image-compression";

interface Employee {
  id: number;
  username: string;
  displayName: string;
  role: string;
  profilePicture?: string;
  designation?: string;
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
  const [newDesignation, setNewDesignation] = useState("");
  const [newPassword, setNewPassword] = useState("12345");
  const [adding, setAdding] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editRole, setEditRole] = useState("employee");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          designation: newDesignation.trim(),
          password: newPassword,
        }),
      });
      if (res.ok) {
        showToast("Employee added!", "success");
        setNewUsername("");
        setNewDisplayName("");
        setNewDesignation("");
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

  const openEditModal = (emp: Employee) => {
    setEditingUser(emp);
    setEditDisplayName(emp.displayName);
    setEditDesignation(emp.designation || "");
    setEditRole(emp.role);
  };

  const closeEditModal = () => {
    setEditingUser(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editDisplayName,
          designation: editDesignation.trim(),
          role: editRole,
        }),
      });
      
      if (res.ok) {
        showToast("User updated", "success");
        fetchEmployees();
        closeEditModal();
      } else {
        showToast("Failed to update user", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    }
  };

  const handleImageUploadAdmin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Maximum size is 10MB.", "error");
      return;
    }

    setUploadingImage(true);
    try {
      let fileToUpload = file;
      if (file.size > 1024 * 1024) {
        showToast("Compressing image...", "info");
        fileToUpload = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });
      }

      showToast("Uploading profile picture...", "info");
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      const updateRes = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: uploadData.url }),
      });

      if (!updateRes.ok) throw new Error("Failed to save profile picture");

      showToast("Profile picture updated!", "success");
      fetchEmployees();
      // Update local state so it reflects immediately in the modal too
      setEditingUser({ ...editingUser, profilePicture: uploadData.url });
    } catch (err: any) {
      showToast(err.message || "Failed to update profile picture", "error");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Designation / Job Title</label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="input-glass"
                  placeholder="e.g. Employee"
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
              {emp.profilePicture ? (
                <img 
                  src={emp.profilePicture} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0" 
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: emp.avatarColor }}
                >
                  {emp.displayName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">{emp.displayName}</p>
                  {emp.role === "admin" && (
                    <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/20 text-[10px]">ADMIN</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {emp.designation ? `${emp.designation} • ` : ""}@{emp.username}
                </p>
              </div>
              <div className="text-right mr-4">
                <p className="text-xl font-bold text-text-primary">{emp.taskCount}</p>
                <p className="text-xs text-text-muted">tasks</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(emp)}
                  className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l12.683-12.683z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
                  </svg>
                  Edit
                </button>
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
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-md p-6 border border-glass-border shadow-2xl relative">
            <button
              onClick={closeEditModal}
              className="absolute top-4 right-4 text-text-muted hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-xl font-bold text-text-primary mb-6">Edit Employee</h3>
            
            <div className="flex flex-col items-center gap-4 mb-6">
              {editingUser.profilePicture ? (
                <img 
                  src={editingUser.profilePicture} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-glass-border" 
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-glass-border"
                  style={{ backgroundColor: editingUser.avatarColor }}
                >
                  {editingUser.displayName.charAt(0)}
                </div>
              )}
              
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUploadAdmin}
                disabled={uploadingImage}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
              >
                {uploadingImage ? "Uploading..." : "Change Profile Picture"}
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="input-glass"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Designation / Job Title</label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="input-glass"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="input-glass"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
