"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminToast } from "../layout";

export default function AdminSettings() {
  const { showToast } = useAdminToast();
  const [autoApproval, setAutoApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings && data.settings.auto_approval === "true") {
          setAutoApproval(true);
        } else {
          setAutoApproval(false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleAutoApproval = async () => {
    setToggling(true);
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
      setToggling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">Settings</h1>
        <p className="text-text-secondary">Manage system configurations and automation.</p>
      </div>

      <div className="space-y-6">
        {/* Automation Settings */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Automation
          </h2>

          <div className="flex items-center justify-between p-4 rounded-xl bg-glass/30 border border-glass-border">
            <div>
              <h3 className="font-bold text-text-primary">Auto-Approval System</h3>
              <p className="text-sm text-text-secondary mt-1 max-w-lg">
                When enabled, all new tasks submitted by employees are instantly marked as "approved" automatically without requiring manual review.
              </p>
            </div>
            {loading ? (
              <div className="w-14 h-8 rounded-full shimmer" />
            ) : (
              <button
                onClick={toggleAutoApproval}
                disabled={toggling}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
