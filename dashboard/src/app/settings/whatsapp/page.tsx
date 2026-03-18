"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface WhatsAppConfig {
  phone_number_id: string;
  access_token: string;
  verify_token: string;
}

export default function WhatsAppSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<WhatsAppConfig>({
    phone_number_id: "",
    access_token: "",
    verify_token: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load existing config
  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/api/team/whatsapp/`, {
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
            phone_number_id: data.phone_number_id || "",
            access_token: data.access_token || "",
            verify_token: data.verify_token || "",
          });
        }
      })
      .catch(() => {
        setToast({ type: "error", message: "Failed to load WhatsApp config" });
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/team/whatsapp/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to save config");
      }

      setToast({ type: "success", message: "WhatsApp config saved successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save config",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);

    try {
      const res = await fetch(`${API_URL}/api/team/whatsapp/test/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Connection test failed");
      }

      setToast({ type: "success", message: "WhatsApp connection verified successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-48" />
          <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded-xl" />
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
        <span className="text-gray-900 dark:text-white font-medium">WhatsApp</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your WhatsApp Business Cloud API
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label
              htmlFor="phone_number_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Phone Number ID
            </label>
            <input
              id="phone_number_id"
              type="text"
              value={config.phone_number_id}
              onChange={(e) =>
                setConfig({ ...config, phone_number_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="e.g. 123456789012345"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Found in your Meta Developer Portal under WhatsApp &gt; API Setup
            </p>
          </div>

          <div>
            <label
              htmlFor="access_token"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Access Token
            </label>
            <input
              id="access_token"
              type="password"
              value={config.access_token}
              onChange={(e) =>
                setConfig({ ...config, access_token: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="Your permanent access token"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Use a permanent token from a System User for production
            </p>
          </div>

          <div>
            <label
              htmlFor="verify_token"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Verify Token
            </label>
            <input
              id="verify_token"
              type="text"
              value={config.verify_token}
              onChange={(e) =>
                setConfig({ ...config, verify_token: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="A custom string for webhook verification"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              This must match the token you set in the Meta webhook configuration
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config.phone_number_id || !config.access_token}
              className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
