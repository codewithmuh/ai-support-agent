"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  total_tickets_today: number;
  ai_resolved: number;
  escalated: number;
  avg_response_time: string;
  recent_escalations: Array<{
    id: number;
    conversation_id: number;
    reason: string;
    status: string;
    created_at: string;
    customer_name?: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/escalations/dashboard/stats/")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        // Use demo data if API is unavailable
        setStats({
          total_tickets_today: 47,
          ai_resolved: 38,
          escalated: 9,
          avg_response_time: "1.2s",
          recent_escalations: [
            { id: 1, conversation_id: 101, reason: "Customer requested human agent", status: "pending", created_at: "2026-03-15T10:30:00Z", customer_name: "John Doe" },
            { id: 2, conversation_id: 102, reason: "Negative sentiment detected", status: "pending", created_at: "2026-03-15T09:15:00Z", customer_name: "Jane Smith" },
            { id: 3, conversation_id: 103, reason: "Billing dispute", status: "in_progress", created_at: "2026-03-15T08:45:00Z", customer_name: "Bob Wilson" },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Tickets Today", value: stats?.total_tickets_today ?? 0, color: "bg-blue-600" },
    { label: "AI Resolved", value: stats?.ai_resolved ?? 0, color: "bg-green-600" },
    { label: "Escalated", value: stats?.escalated ?? 0, color: "bg-yellow-600" },
    { label: "Avg Response Time", value: stats?.avg_response_time ?? "N/A", color: "bg-purple-600" },
  ];

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#1e293b] rounded-xl p-6 border border-gray-800"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <p className="text-sm text-gray-400">{card.label}</p>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Escalations */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold">Recent Escalations</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {stats?.recent_escalations?.map((esc) => (
            <div
              key={esc.id}
              className="p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">
                    {esc.customer_name || `Conversation #${esc.conversation_id}`}
                  </p>
                  <p className="text-sm text-gray-400">{esc.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    esc.status === "pending"
                      ? "bg-yellow-600/20 text-yellow-400"
                      : esc.status === "in_progress"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-green-600/20 text-green-400"
                  }`}
                >
                  {esc.status}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(esc.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {(!stats?.recent_escalations || stats.recent_escalations.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              No recent escalations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
