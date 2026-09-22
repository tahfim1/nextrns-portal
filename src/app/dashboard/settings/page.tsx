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
