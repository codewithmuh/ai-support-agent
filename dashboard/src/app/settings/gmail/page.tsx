"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface GmailConfig {
  google_client_id: string;
  google_client_secret: string;
  watch_email: string;
  is_active: boolean;
}

export default function GmailSettingsPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<GmailConfig>({
    google_client_id: "",
    google_client_secret: "",
    watch_email: "",
    is_active: false,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollResult, setPollResult] = useState<string | null>(null);
  const [autoPoll, setAutoPoll] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gmail_auto_poll") === "true";
    }
    return false;
  });
  const [isDisconnecting, setIsDisconnecting] = useState(false);
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

  // Check URL params for OAuth callback result
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "true") {
      setToast({ type: "success", message: "Gmail connected successfully!" });
      // Clean URL params without reload
      window.history.replaceState({}, "", "/settings/gmail");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_code_or_state: "OAuth callback was missing required parameters.",
        invalid_team: "Could not identify your team. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        token_exchange_error: "An error occurred during token exchange. Please try again.",
        access_denied: "You denied access to Gmail. No changes were made.",
      };
      setToast({
        type: "error",
        message: errorMessages[error] || `Gmail connection failed: ${error}`,
      });
      window.history.replaceState({}, "", "/settings/gmail");
    }
  }, [searchParams]);

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
          setConfigExists(true);
          setConfig({
            google_client_id: data.google_client_id || "",
            google_client_secret: data.google_client_secret || "",
            watch_email: data.watch_email || "",
            is_active: data.is_active || false,
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
        method: configExists ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          google_client_id: config.google_client_id,
          google_client_secret: config.google_client_secret,
          watch_email: config.watch_email,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to save config");
      }

      setConfigExists(true);
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

  async function handleConnectGmail() {
    setIsConnecting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/gmail/init/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to start OAuth flow");
      }

      const data = await res.json();
      window.location.href = data.auth_url;
    } catch (err) {
      setIsConnecting(false);
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to start Gmail connection",
      });
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);

    try {
      const res = await fetch(`${API_URL}/api/team/gmail/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to disconnect");
      }

      setConfig({ ...config, is_active: false });
      setToast({ type: "success", message: "Gmail disconnected successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disconnect Gmail",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  // Auto-poll every 30 seconds when enabled
  useEffect(() => {
    if (!autoPoll || !config.is_active || !token) return;

    const poll = () => {
      fetch(`${API_URL}/api/email/poll/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_results: 10 }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.processed > 0) {
            setPollResult(`Auto-polled: ${data.processed} email(s) processed`);
          }
        })
        .catch(() => {});
    };

    poll(); // Poll immediately on enable
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [autoPoll, config.is_active, token]);

  function toggleAutoPoll() {
    setAutoPoll((prev) => {
      const next = !prev;
      localStorage.setItem("gmail_auto_poll", String(next));
      if (next) {
        setToast({ type: "success", message: "Auto-polling enabled — checking every 30 seconds" });
      } else {
        setToast({ type: "success", message: "Auto-polling disabled" });
        setPollResult(null);
      }
      return next;
    });
  }

  async function handlePollEmails() {
    setIsPolling(true);
    setPollResult(null);
    try {
      const res = await fetch(`${API_URL}/api/email/poll/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_results: 10 }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to poll emails");
      }

      const data = await res.json();
      const msg = data.processed > 0
        ? `Processed ${data.processed} email(s)${data.errors > 0 ? `, ${data.errors} error(s)` : ""}`
        : "No new emails found";
      setPollResult(msg);
      setToast({ type: "success", message: msg });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to poll emails",
      });
    } finally {
      setIsPolling(false);
    }
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

      {/* Setup Guide */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Google Cloud Setup Required</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed mb-3">
              Before connecting Gmail, you need to set up OAuth credentials in the Google Cloud Console and configure them in your environment variables.
            </p>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800/50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Go to <span className="font-medium">Google Cloud Console</span> &rarr; APIs &amp; Services &rarr; Credentials
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Create an <span className="font-medium">OAuth 2.0 Client ID</span> (Web application type)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  Add this <span className="font-medium">Authorized redirect URI</span>:
                  <code className="block mt-1 px-2 py-1 bg-gray-50 dark:bg-slate-700 rounded text-[11px] text-indigo-600 dark:text-indigo-400 font-mono break-all">
                    {typeof window !== "undefined" ? window.location.origin.replace("3000", "8000") : "https://your-domain.com"}/api/auth/gmail/callback/
                  </code>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Enable the <span className="font-medium">Gmail API</span> in your Google Cloud project
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Copy the <span className="font-medium">Client ID</span> and <span className="font-medium">Client Secret</span> into the form below
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google OAuth Credentials */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Google OAuth Credentials
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          From Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Google Client ID
            </label>
            <input
              id="client_id"
              type="text"
              value={config.google_client_id}
              onChange={(e) => setConfig({ ...config, google_client_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="123456789-abc.apps.googleusercontent.com"
            />
          </div>

          <div>
            <label htmlFor="client_secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Google Client Secret
            </label>
            <div className="relative">
              <input
                id="client_secret"
                type={showSecret ? "text" : "password"}
                value={config.google_client_secret}
                onChange={(e) => setConfig({ ...config, google_client_secret: e.target.value })}
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                placeholder="GOCSPX-..."
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showSecret ? (
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
          </div>

          {/* Watch Email — in the same card */}
          <div>
            <label htmlFor="watch_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Support Email Address
            </label>
            <input
              id="watch_email"
              type="email"
              value={config.watch_email}
              onChange={(e) => setConfig({ ...config, watch_email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              placeholder="support@yourcompany.com"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {config.is_active
                ? "Auto-filled from your Google account. Change if needed."
                : "Will be auto-filled when you connect Gmail."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Connection Status
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                config.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
            {config.is_active ? (
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  Connected
                </span>
                {config.watch_email && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Connected as <span className="font-medium text-gray-700 dark:text-gray-300">{config.watch_email}</span>
                  </p>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-700 dark:text-gray-300">Not connected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {config.is_active ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnecting || !config.google_client_id}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? "Connecting..." : "Connect Gmail"}
              </button>
            )}
          </div>
        </div>
        {!config.is_active && !config.google_client_id && (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Save your Google Client ID above first, then click Connect Gmail.
          </p>
        )}
      </div>

      {/* Email Polling */}
      {config.is_active && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Email Polling
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Check Gmail for new unread support emails and process them through the AI pipeline.
          </p>

          {/* Auto-poll toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Polling</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Automatically check for new emails every 30 seconds</p>
            </div>
            <button
              type="button"
              onClick={toggleAutoPoll}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoPoll ? "bg-indigo-600" : "bg-gray-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  autoPoll ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {autoPoll && (
            <div className="mb-4 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs text-indigo-700 dark:text-indigo-400">Auto-polling active — checking every 30 seconds</span>
              </div>
              <button
                type="button"
                onClick={toggleAutoPoll}
                className="px-3 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                Stop Polling
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePollEmails}
              disabled={isPolling}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isPolling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Check Now
                </>
              )}
            </button>
            {pollResult && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{pollResult}</span>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
