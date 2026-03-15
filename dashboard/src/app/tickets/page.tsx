"use client";

import { useEffect, useState } from "react";
import TicketQueue from "@/components/TicketQueue";

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
    fetch("http://localhost:8000/api/conversations/")
      .then((res) => res.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : data.results || []);
        setLoading(false);
      })
      .catch(() => {
        // Demo data
        setConversations([
          { id: 1, channel: "whatsapp", status: "active", sender_name: "John Doe", sender_identifier: "+1234567890", last_message: "I need help with my order", created_at: "2026-03-15T10:30:00Z" },
          { id: 2, channel: "email", status: "escalated", sender_name: "Jane Smith", sender_identifier: "jane@email.com", last_message: "This is unacceptable service", created_at: "2026-03-15T09:15:00Z" },
          { id: 3, channel: "webchat", status: "resolved", sender_name: "Bob Wilson", sender_identifier: "bob_web", last_message: "Thanks for the help!", created_at: "2026-03-15T08:45:00Z" },
          { id: 4, channel: "whatsapp", status: "active", sender_name: "Alice Brown", sender_identifier: "+9876543210", last_message: "Where is my package?", created_at: "2026-03-15T08:00:00Z" },
          { id: 5, channel: "email", status: "escalated", sender_name: "Charlie Davis", sender_identifier: "charlie@email.com", last_message: "I want a refund immediately", created_at: "2026-03-15T07:30:00Z" },
          { id: 6, channel: "webchat", status: "resolved", sender_name: "Diana Miller", sender_identifier: "diana_web", last_message: "That solved my issue, thank you", created_at: "2026-03-14T22:00:00Z" },
        ]);
        setLoading(false);
      });
  }, []);

  const filtered =
    activeTab === "all"
      ? conversations
      : conversations.filter((c) => c.status === activeTab);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Ticket Queue</h2>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {tab}
            <span className="ml-2 text-xs opacity-70">
              ({tab === "all"
                ? conversations.length
                : conversations.filter((c) => c.status === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-800">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : (
          <TicketQueue conversations={filtered} />
        )}
      </div>
    </div>
  );
}
