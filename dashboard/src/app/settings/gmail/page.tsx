"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface GmailConfig {
  watch_email: string;
  is_connected: boolean;
}

export default function GmailSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<GmailConfig>({
    watch_email: "",
    is_connected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load existing config
  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/team/gmail/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 404) return null;
        throw new Error("Failed to load config");
      })
      .then((data) => {
        if (data) {
          setConfig({
            watch_email: data.watch_email || "",
            is_connected: data.is_connected || false,
          });
        }
      })
      .catch(() => {
        setToast({ type: "error", message: "Failed to load Gmail config" });
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave() {
    setIsSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/team/gmail/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ watch_email: config.watch_email }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to save config");
      }

      setToast({ type: "success", message: "Gmail config saved successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save config",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleConnectGmail() {
    // Placeholder for OAuth flow — will open Google consent screen
    setToast({
      type: "success",
      message: "Gmail OAuth flow will be implemented with Google Cloud credentials",
    });
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-48" />
          <div className="h-48 bg-gray-100 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Settings
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">Gmail</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gmail Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect Gmail to receive and reply to support emails
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Connection Status
        </h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              config.is_connected ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {config.is_connected ? "Connected" : "Not connected"}
          </span>
        </div>
        {config.is_connected && config.watch_email && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Watching: <span className="font-medium text-gray-700 dark:text-gray-300">{config.watch_email}</span>
          </p>
        )}
      </div>

      {/* Config Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Email Settings
        </h2>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="watch_email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Watch Email Address
            </label>
            <input
              id="watch_email"
              type="email"
              value={config.watch_email}
              onChange={(e) =>
                setConfig({ ...config, watch_email: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="support@yourcompany.com"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              The email address that will receive customer support emails
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !config.watch_email}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={handleConnectGmail}
              className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              {config.is_connected ? "Reconnect Gmail" : "Connect Gmail"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
