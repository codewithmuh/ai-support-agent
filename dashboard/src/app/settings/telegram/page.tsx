"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface TelegramConfig {
  bot_token_display?: string;
  bot_username?: string;
  is_active?: boolean;
}

export default function TelegramSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/team/telegram/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("not found");
      })
      .then((data) => {
        setConfig(data);
        setBotUsername(data.bot_username || "");
        setIsActive(data.is_active || false);
        setIsNew(false);
      })
      .catch(() => setIsNew(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    const method = isNew ? "POST" : "PUT";
    const body: Record<string, unknown> = { bot_username: botUsername, is_active: isActive };
    if (botToken) body.bot_token = botToken;

    try {
      const res = await fetch(`${API_URL}/api/team/telegram/`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setIsNew(false);
        setBotToken("");
        setToast({ type: "success", message: "Telegram config saved!" });
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ type: "error", message: err.detail || "Failed to save" });
      }
    } catch {
      setToast({ type: "error", message: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48" />
          <div className="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          Settings
        </Link>
        <span className="text-gray-300 dark:text-gray-600 mx-2">/</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">Telegram</span>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Telegram Integration</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Connect your Telegram bot to receive and respond to messages.
      </p>

      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Webhook Setup Guide */}
      <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.07-.2c-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.57 3.68-.53.36-1 .54-1.43.53-.47-.01-1.38-.27-2.05-.48-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49.98-.75 3.85-1.68 6.42-2.79 7.71-3.32 3.67-1.53 4.43-1.79 4.93-1.8.11 0 .35.03.51.14.13.1.17.23.18.33.02.1.04.33.02.51z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-300 mb-1">Webhook Setup</h3>
            <p className="text-xs text-sky-700 dark:text-sky-400/80 leading-relaxed mb-3">
              After saving your bot token, set the Telegram webhook so your bot receives messages:
            </p>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-sky-200 dark:border-sky-800/50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Message <span className="font-medium">@BotFather</span> on Telegram → <code className="text-indigo-600 dark:text-indigo-400 font-mono">/newbot</code> → copy the token
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  Run this command to set the webhook (replace <code className="text-indigo-600 dark:text-indigo-400 font-mono">TOKEN</code> and <code className="text-indigo-600 dark:text-indigo-400 font-mono">URL</code>):
                  <code className="block mt-1 px-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-[11px] text-gray-800 dark:text-gray-200 font-mono break-all leading-relaxed">
                    curl &quot;https://api.telegram.org/bot<span className="text-indigo-600 dark:text-indigo-400">YOUR_TOKEN</span>/setWebhook?url=<span className="text-indigo-600 dark:text-indigo-400">NGROK_URL</span>/api/webhooks/telegram/&quot;
                  </code>
                  <span className="text-gray-500 dark:text-gray-400 mt-1 block">For local dev: <code className="text-indigo-600 dark:text-indigo-400 font-mono">ngrok http 8000</code></span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Send a message to your bot — it should appear in the <Link href="/tickets" className="text-indigo-600 dark:text-indigo-400 hover:underline">ticket queue</Link>
                </p>
              </div>
            </div>
            <Link href="/docs" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 transition-colors">
              View full setup guide in docs
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bot Token</label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={config?.bot_token_display || "Paste your bot token from @BotFather"}
            required={isNew}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Get this from <strong>@BotFather</strong> on Telegram → /newbot
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bot Username</label>
          <input
            type="text"
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value)}
            placeholder="@your_bot_username"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 dark:bg-slate-600 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
          </label>
          <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>

      {/* Setup guide */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Setup Guide</h3>
        <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-decimal list-inside">
          <li>Open Telegram and message <strong>@BotFather</strong></li>
          <li>Send <code>/newbot</code> and follow the prompts to create a bot</li>
          <li>Copy the bot token and paste it above</li>
          <li>Set the webhook URL to: <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-xs">{`{your-ngrok-url}/api/webhooks/telegram/`}</code></li>
          <li>Or use the Telegram API: <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-xs break-all">{`https://api.telegram.org/bot{TOKEN}/setWebhook?url={your-ngrok-url}/api/webhooks/telegram/`}</code></li>
        </ol>
      </div>
    </div>
  );
}
