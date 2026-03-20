"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface MessengerConfig {
  page_access_token: string;
  page_id: string;
  verify_token: string;
  instagram_enabled: boolean;
}

export default function MessengerSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<MessengerConfig>({
    page_access_token: "",
    page_id: "",
    verify_token: "",
    instagram_enabled: false,
  });
  const [configExists, setConfigExists] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

    fetch(`${API_URL}/api/team/messenger/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 404) return null;
        throw new Error("Failed to load config");
      })
      .then((data) => {
        if (data) {
          setConfigExists(true);
          setConfig({
            page_access_token: data.page_access_token || "",
            page_id: data.page_id || "",
            verify_token: data.verify_token || "",
            instagram_enabled: data.instagram_enabled || false,
          });
        }
      })
      .catch(() => {
        setToast({ type: "error", message: "Failed to load Messenger config" });
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/team/messenger/`, {
        method: configExists ? "PUT" : "POST",
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

      setConfigExists(true);
      setToast({ type: "success", message: "Messenger config saved successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save config",
      });
    } finally {
      setIsSaving(false);
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
        <span className="text-gray-900 dark:text-white font-medium">Messenger &amp; Instagram</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facebook Messenger &amp; Instagram</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your Facebook Page to receive Messenger and Instagram DMs
        </p>
      </div>

      {/* Setup Guide */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Setup Guide</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed mb-3">
              Follow these steps to connect your Facebook Page for Messenger and Instagram messaging.
            </p>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800/50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Go to <span className="font-medium">Meta Developer Portal</span> &rarr; Your App &rarr; Messenger &rarr; Settings
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Generate a <span className="font-medium">Page Access Token</span> for your Facebook Page
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  Set <span className="font-medium">Webhook URL</span> to:
                  <code className="block mt-1 px-2 py-1 bg-gray-50 dark:bg-slate-700 rounded text-[11px] text-indigo-600 dark:text-indigo-400 font-mono break-all">
                    {typeof window !== "undefined" ? window.location.origin.replace("3000", "8000") : "https://your-domain.com"}/api/webhooks/messenger/
                  </code>
                  <span className="text-gray-500 dark:text-gray-400 mt-1 block">For local dev, use ngrok: <code className="text-indigo-600 dark:text-indigo-400 font-mono">ngrok http 8000</code></span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Subscribe to the <span className="font-medium">messages</span> webhook field
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  For Instagram: Link your Instagram account to your Facebook Page in <span className="font-medium">Business Settings</span>
                </p>
              </div>
            </div>
            <Link href="/docs" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors">
              View full setup guide in docs
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label
              htmlFor="page_access_token"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Page Access Token
            </label>
            <div className="relative">
              <input
                id="page_access_token"
                type={showToken ? "text" : "password"}
                value={config.page_access_token}
                onChange={(e) =>
                  setConfig({ ...config, page_access_token: e.target.value })
                }
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="Your Facebook Page access token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showToken ? (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Generated from Meta Developer Portal under Messenger &gt; Settings
            </p>
          </div>

          <div>
            <label
              htmlFor="page_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Page ID
            </label>
            <input
              id="page_id"
              type="text"
              value={config.page_id}
              onChange={(e) =>
                setConfig({ ...config, page_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="e.g. 123456789012345"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Found in your Facebook Page &gt; About &gt; Page ID
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

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.instagram_enabled}
                onChange={(e) =>
                  setConfig({ ...config, instagram_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 dark:bg-slate-600 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Instagram DMs Enabled</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Receive Instagram Direct Messages through your linked Facebook Page
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
