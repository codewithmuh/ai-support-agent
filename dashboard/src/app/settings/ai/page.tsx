"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AISettingsPage() {
  const { token } = useAuth();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasAnthropic, setHasAnthropic] = useState(false);
  const [hasOpenai, setHasOpenai] = useState(false);
  const [anthropicDisplay, setAnthropicDisplay] = useState("");
  const [openaiDisplay, setOpenaiDisplay] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/team/ai/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setHasAnthropic(data.has_anthropic_key || false);
          setHasOpenai(data.has_openai_key || false);
          setAnthropicDisplay(data.anthropic_api_key || "");
          setOpenaiDisplay(data.openai_api_key || "");
          if (data.anthropic_api_key) setAnthropicKey(data.anthropic_api_key);
          if (data.openai_api_key) setOpenaiKey(data.openai_api_key);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const body: Record<string, string> = {};
      if (anthropicKey) body.anthropic_api_key = anthropicKey;
      if (openaiKey) body.openai_api_key = openaiKey;

      if (Object.keys(body).length === 0) {
        setToast({ type: "error", message: "Enter at least one API key to save" });
        setIsSaving(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/team/ai/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setHasAnthropic(data.has_anthropic_key || false);
      setHasOpenai(data.has_openai_key || false);
      if (data.anthropic_api_key) setAnthropicKey(data.anthropic_api_key);
      if (data.openai_api_key) setOpenaiKey(data.openai_api_key);
      setToast({ type: "success", message: "AI configuration saved successfully" });
    } catch {
      setToast({ type: "error", message: "Failed to save AI configuration" });
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
    <div className="p-8 max-w-3xl">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
          toast.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Settings</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">AI Configuration</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure your AI API keys. These are used for ticket classification, response generation, and embeddings.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <p className="font-semibold mb-1">How AI keys are used:</p>
            <ul className="space-y-1 ml-3 list-disc">
              <li><strong>Anthropic (required)</strong> — Powers ticket classification (Claude Haiku) and response generation (Claude Sonnet)</li>
              <li><strong>OpenAI (optional)</strong> — Used for knowledge base embeddings (text-embedding-3-small). Falls back to basic embeddings if not set.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-6">
        {/* Anthropic */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="anthropic" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Anthropic API Key
            </label>
            {hasAnthropic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="anthropic"
              type={showAnthropic ? "text" : "password"}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={hasAnthropic ? anthropicDisplay : "sk-ant-api03-..."}
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(!showAnthropic)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showAnthropic ? (
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
            Get your key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">console.anthropic.com</a>
          </p>
        </div>

        {/* OpenAI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="openai" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              OpenAI API Key <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            {hasOpenai && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="openai"
              type={showOpenai ? "text" : "password"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={hasOpenai ? openaiDisplay : "sk-..."}
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-slate-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showOpenai ? (
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
            Used for semantic search embeddings. Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">platform.openai.com</a>
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || (!anthropicKey && !openaiKey)}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
