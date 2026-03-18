"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

interface DashboardStats {
  total_tickets: number;
  total_open: number;
  total_escalated: number;
  total_resolved: number;
  total_tickets_today: number;
  ai_resolved: number;
  escalated: number;
  avg_response_time: number | null;
  channel_breakdown: Record<string, number>;
  recent_escalations: Array<{
    id: string;
    conversation_id: string;
    reason: string;
    status: string;
    created_at: string;
    customer_name?: string;
  }>;
}

const SANDBOX_DATA: DashboardStats = {
  total_tickets: 247,
  total_open: 18,
  total_escalated: 6,
  total_resolved: 229,
  total_tickets_today: 34,
  ai_resolved: 187,
  escalated: 6,
  avg_response_time: 1.4,
  channel_breakdown: { whatsapp: 112, email: 78, webchat: 41, telegram: 16 },
  recent_escalations: [
    { id: "e1", conversation_id: "c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6", reason: "low_confidence", status: "pending", created_at: new Date().toISOString(), customer_name: "Sarah Johnson" },
    { id: "e2", conversation_id: "d2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7", reason: "negative_sentiment", status: "pending", created_at: new Date(Date.now() - 1800000).toISOString(), customer_name: "Ahmed Khan" },
    { id: "e3", conversation_id: "e3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8", reason: "human_request", status: "resolved", created_at: new Date(Date.now() - 3600000).toISOString(), customer_name: "Maria Garcia" },
    { id: "e4", conversation_id: "f4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9", reason: "low_confidence", status: "pending", created_at: new Date(Date.now() - 5400000).toISOString(), customer_name: "James Wilson" },
  ],
};

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sandbox, setSandbox] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard_sandbox") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    if (sandbox) {
      setStats(SANDBOX_DATA);
      setLoading(false);
      return;
    }
    const fetchStats = () => {
      fetch(`${API_URL}/api/escalations/dashboard/stats/`)
        .then((res) => res.json())
        .then((data) => {
          setStats(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sandbox]);

  const toggleSandbox = () => {
    setSandbox((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_sandbox", String(next));
      setLoading(true);
      return next;
    });
  };

  if (!authLoading && !isAuthenticated) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 dark:text-gray-500 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const totalTickets = stats?.total_tickets ?? 0;
  const totalOpen = stats?.total_open ?? 0;
  const totalEscalated = stats?.total_escalated ?? 0;
  const totalResolved = stats?.total_resolved ?? 0;
  const aiResolved = stats?.ai_resolved ?? 0;
  const todayTickets = stats?.total_tickets_today ?? 0;
  const escalatedToday = stats?.escalated ?? 0;
  const avgResponse = stats?.avg_response_time;

  const resolutionRate = totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 0;
  const aiRate = totalResolved > 0 ? Math.round((aiResolved / totalResolved) * 100) : 0;

  const channelBreakdown = stats?.channel_breakdown ?? {};
  const totalChannelTickets = Object.values(channelBreakdown).reduce((a, b) => a + b, 0) || 1;

  const channelConfig: Record<string, { color: string; bg: string }> = {
    whatsapp: { color: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
    email: { color: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
    webchat: { color: "bg-violet-500", bg: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
    telegram: { color: "bg-sky-500", bg: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of your support operations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sandbox Toggle */}
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
          <Link
            href="/tickets"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            View All Tickets
          </Link>
        </div>
      </div>

      {/* Sandbox Banner */}
      {sandbox && (
        <div className="mb-6 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-violet-700 dark:text-violet-400">
              <strong>Sandbox mode</strong> — Showing demo data. Toggle off to see real data from your API.
            </p>
          </div>
          <button onClick={toggleSandbox} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">
            Switch to Live
          </button>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label: "Total Tickets", value: totalTickets, change: `+${todayTickets} today`, color: "text-blue-600 dark:text-blue-400", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", iconBg: "bg-blue-50 dark:bg-blue-900/30" },
          { label: "Open", value: totalOpen, change: `${totalEscalated} escalated`, color: "text-amber-600 dark:text-amber-400", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", iconBg: "bg-amber-50 dark:bg-amber-900/30" },
          { label: "Resolved", value: totalResolved, change: `${resolutionRate}% resolution`, color: "text-emerald-600 dark:text-emerald-400", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", iconBg: "bg-emerald-50 dark:bg-emerald-900/30" },
          { label: "AI Resolved", value: aiResolved, change: `${aiRate}% of resolved`, color: "text-indigo-600 dark:text-indigo-400", icon: "M13 10V3L4 14h7v7l9-11h-7z", iconBg: "bg-indigo-50 dark:bg-indigo-900/30" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <svg className={`w-5 h-5 ${card.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={card.icon} />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{card.change}</p>
          </div>
        ))}
      </div>

      {/* Middle Row: Gauges + Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* AI Resolution Gauge */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">AI Resolution Rate</h3>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-gray-100 dark:stroke-slate-700" />
                <circle
                  cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                  className="stroke-indigo-500"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - aiRate / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{aiRate}%</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">AI handled</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> AI: {aiResolved}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600" /> Human: {totalResolved - aiResolved}</span>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Today&apos;s Activity</h3>
          <div className="space-y-5">
            {[
              { label: "New Tickets", value: todayTickets, max: Math.max(todayTickets, 10), color: "bg-blue-500" },
              { label: "AI Resolved", value: aiResolved, max: Math.max(todayTickets, 10), color: "bg-emerald-500" },
              { label: "Escalated", value: escalatedToday, max: Math.max(todayTickets, 10), color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all`}
                    style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500">Avg Response Time</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {avgResponse != null ? `${avgResponse}s` : "N/A"}
            </p>
          </div>
        </div>

        {/* Channels */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">Channels</h3>
          {Object.keys(channelBreakdown).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(channelBreakdown).map(([channel, count]) => {
                const pct = Math.round((count / totalChannelTickets) * 100);
                const cfg = channelConfig[channel] || { color: "bg-gray-400", bg: "bg-gray-50 dark:bg-slate-700 text-gray-500" };
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300 font-medium">{channel}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{count} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3">
                      <div
                        className={`${cfg.color} h-3 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">No channel data yet</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Send a test message to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Escalations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Escalations</h3>
          <Link href="/tickets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {stats?.recent_escalations?.map((esc) => (
            <Link
              key={esc.id}
              href={`/tickets/${esc.conversation_id}`}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors block"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {esc.customer_name || `Ticket #${esc.conversation_id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{esc.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  esc.status === "pending"
                    ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {esc.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(esc.created_at).toLocaleTimeString()}
                </span>
              </div>
            </Link>
          ))}
          {(!stats?.recent_escalations || stats.recent_escalations.length === 0) && (
            <div className="px-6 py-12 text-center">
              <svg className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">No recent escalations</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">All tickets are being handled by AI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
