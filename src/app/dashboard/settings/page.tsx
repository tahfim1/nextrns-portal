"use client";

import { useState, useRef } from "react";
import { useToast, useUser } from "../layout";
import imageCompression from "browser-image-compression";

export default function SettingsPage() {
  const { showToast } = useToast();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [designation, setDesignation] = useState("");
  const [updatingDesignation, setUpdatingDesignation] = useState(false);

  // Initialize designation when user loads
  useState(() => {
    if (user && user.designation) {
      setDesignation(user.designation);
    }
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("New passwords don't match", "error");
      return;
    }

    if (newPassword.length < 4) {
      showToast("Password must be at least 4 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to change password", "error");
        return;
      }

      showToast("Password changed successfully! 🔒", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(file, options);
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

      const updateRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture: uploadData.url }),
      });

      if (!updateRes.ok) throw new Error("Failed to save profile picture");

      const stored = sessionStorage.getItem("nextrns-user");
      if (stored) {
        const userObj = JSON.parse(stored);
        userObj.profilePicture = uploadData.url;
        sessionStorage.setItem("nextrns-user", JSON.stringify(userObj));
      }

      showToast("Profile picture updated successfully! Refreshing...", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      showToast(err.message || "Failed to update profile picture", "error");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpdateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingDesignation(true);
    try {
      const updateRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: designation.trim() }),
      });

      if (!updateRes.ok) throw new Error("Failed to save designation");

      const stored = sessionStorage.getItem("nextrns-user");
      if (stored) {
        const userObj = JSON.parse(stored);
        userObj.designation = designation.trim();
        sessionStorage.setItem("nextrns-user", JSON.stringify(userObj));
      }

      showToast("Designation updated! Refreshing...", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      showToast(err.message || "Failed to update designation", "error");
    } finally {
      setUpdatingDesignation(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary">Manage your account preferences</p>
      </div>

      {/* Profile Picture */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Profile Picture</h2>
            <p className="text-sm text-text-muted">Update your avatar</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {user?.profilePicture ? (
            <img 
              src={user.profilePicture} 
              alt="Profile" 
              className="w-24 h-24 rounded-full object-cover border-4 border-glass-border" 
            />
          ) : (
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-glass-border"
              style={{ backgroundColor: user?.avatarColor || "#3b82f6" }}
            >
              {user?.displayName?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="btn-primary px-5 py-2.5 disabled:opacity-50"
            >
              {uploadingImage ? "Uploading..." : "Upload New Picture"}
            </button>
            <p className="text-xs text-text-muted mt-2">JPG, PNG, GIF max 10MB. Will be compressed.</p>
          </div>
        </div>
      </div>

      {/* Designation */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Job Title / Designation</h2>
            <p className="text-sm text-text-muted">Set your role or designation</p>
          </div>
        </div>

        <form onSubmit={handleUpdateDesignation} className="space-y-4">
          <div>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="input-glass"
              placeholder="e.g. Frontend Developer, QA Engineer, Project Manager"
            />
          </div>
          <button
            type="submit"
            disabled={updatingDesignation || designation === (user?.designation || "")}
            className="btn-primary px-6 py-2.5 disabled:opacity-50"
          >
            <span>{updatingDesignation ? "Updating..." : "Save Designation"}</span>
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
            <p className="text-sm text-text-muted">Update your login password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-text-secondary mb-2">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-glass"
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-glass"
              placeholder="Enter new password"
              required
              minLength={4}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-glass"
              placeholder="Confirm new password"
              required
              minLength={4}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-6 py-3 disabled:opacity-50"
          >
            <span>{loading ? "Updating..." : "Update Password"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
