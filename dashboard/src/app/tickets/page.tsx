"use client";

import { useEffect, useState } from "react";
import TicketQueue from "@/components/TicketQueue";
import { API_URL } from "@/lib/api";

interface Conversation {
  id: number;
  channel: string;
  status: string;
  sender_name: string;
  sender_identifier: string;
  last_message?: string;
  created_at: string;
}

const TABS = ["all", "active", "escalated", "resolved"] as const;

export default function TicketsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    fetch(`${API_URL}/api/conversations/`)
      .then((res) => res.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : data.results || []);
        setLoading(false);
      })
      .catch(() => {
        setConversations([]);
        setLoading(false);
      });
  }, []);

  const filtered =
    activeTab === "all"
      ? conversations
      : conversations.filter((c) => c.status === activeTab);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer support conversations</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-6 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-1 w-fit">
        {TABS.map((tab) => {
          const count =
            tab === "all"
              ? conversations.length
              : conversations.filter((c) => c.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-xs ${activeTab === tab ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm">Loading tickets...</div>
        ) : (
          <TicketQueue conversations={filtered} />
        )}
      </div>
    </div>
  );
}
