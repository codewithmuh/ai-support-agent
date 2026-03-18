"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

interface AnalyticsData {
  ai_resolved: number;
  human_resolved: number;
  channels: { whatsapp: number; email: number; webchat: number; telegram?: number };
  avg_response_time_ai: number;
  avg_response_time_human: number;
  total_today: number;
  total_week: number;
}

const SANDBOX_DATA: AnalyticsData = {
  ai_resolved: 187,
  human_resolved: 42,
  channels: { whatsapp: 112, email: 78, webchat: 41, telegram: 16 },
  avg_response_time_ai: 1.2,
  avg_response_time_human: 4.5,
  total_today: 47,
  total_week: 312,
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sandbox, setSandbox] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("analytics_sandbox") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (sandbox) {
      setData(SANDBOX_DATA);
      return;
    }
    fetch(`${API_URL}/api/escalations/dashboard/stats/`)
      .then((res) => res.json())
      .then((d) => {
        setData({
          ai_resolved: d.ai_resolved ?? 0,
          human_resolved: d.human_resolved ?? 0,
          channels: d.channels ?? { whatsapp: 0, email: 0, webchat: 0 },
          avg_response_time_ai: d.avg_response_time_ai ?? 0,
          avg_response_time_human: d.avg_response_time_human ?? 0,
          total_today: d.total_today ?? 0,
          total_week: d.total_week ?? 0,
        });
      })
      .catch(() => setData({ ai_resolved: 0, human_resolved: 0, channels: { whatsapp: 0, email: 0, webchat: 0 }, avg_response_time_ai: 0, avg_response_time_human: 0, total_today: 0, total_week: 0 }));
  }, [sandbox]);

  const toggleSandbox = () => {
    setSandbox((prev) => {
      const next = !prev;
      localStorage.setItem("analytics_sandbox", String(next));
      return next;
    });
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 dark:text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const totalResolved = data.ai_resolved + data.human_resolved;
  const aiPercent = totalResolved > 0 ? (data.ai_resolved / totalResolved) * 100 : 0;
  const humanPercent = totalResolved > 0 ? (data.human_resolved / totalResolved) * 100 : 0;

  const channelEntries = Object.entries(data.channels).filter(([, v]) => v > 0);
  const totalChannels = channelEntries.reduce((a, [, v]) => a + v, 0);

  const channelColors: Record<string, string> = {
    whatsapp: "bg-green-500",
    email: "bg-blue-500",
    webchat: "bg-purple-500",
    telegram: "bg-sky-500",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <button
          onClick={toggleSandbox}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
            sandbox
              ? "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400"
              : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-violet-200 dark:hover:border-violet-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          {sandbox ? "Sandbox ON" : "Sandbox"}
        </button>
      </div>

      {/* Sandbox banner */}
      {sandbox && (
        <div className="mb-6 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center justify-between">
          <p className="text-xs text-violet-700 dark:text-violet-400">
            <strong>Sandbox mode</strong> — Showing demo data.
          </p>
          <button onClick={toggleSandbox} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">
            Switch to Live
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Today</p>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{data.total_today}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total This Week</p>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{data.total_week}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">AI Resolution Rate</p>
          <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
            {aiPercent.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI vs Human Resolution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">AI vs Human Resolution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">AI Resolved</span>
                <span className="text-gray-700 dark:text-gray-300">{data.ai_resolved} ({aiPercent.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-8">
                <div
                  className="bg-blue-500 h-8 rounded-full flex items-center justify-end pr-3"
                  style={{ width: `${Math.max(aiPercent, 5)}%` }}
                >
                  <span className="text-xs font-bold text-white">{data.ai_resolved}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">Human Resolved</span>
                <span className="text-gray-700 dark:text-gray-300">{data.human_resolved} ({humanPercent.toFixed(0)}%)</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-8">
                <div
                  className="bg-yellow-500 h-8 rounded-full flex items-center justify-end pr-3"
                  style={{ width: `${Math.max(humanPercent, 5)}%` }}
                >
                  <span className="text-xs font-bold text-white">{data.human_resolved}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets by Channel */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Tickets by Channel</h3>
          <div className="space-y-4">
            {channelEntries.length > 0 ? channelEntries.map(([name, count]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400 capitalize">{name}</span>
                  <span className="text-gray-700 dark:text-gray-300">{count}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-8">
                  <div
                    className={`${channelColors[name] || "bg-gray-400"} h-8 rounded-full flex items-center justify-end pr-3`}
                    style={{ width: totalChannels > 0 ? `${Math.max((count / totalChannels) * 100, 5)}%` : "0%" }}
                  >
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No channel data yet</p>
            )}
          </div>
        </div>

        {/* Response Time Comparison */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Average Response Time</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-blue-500 mb-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.avg_response_time_ai}s</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">avg</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI Response</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-yellow-500 mb-4">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.avg_response_time_human}m</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">avg</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Human Response</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
