"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ConversationThread from "@/components/ConversationThread";
import AISidebar from "@/components/AISidebar";

interface Message {
  id: number;
  role: "customer" | "ai" | "agent";
  content: string;
  created_at: string;
}

interface TicketDetail {
  id: number;
  channel: string;
  status: string;
  sender_name: string;
  messages: Message[];
  classification?: {
    category: string;
    confidence: number;
    intent: string;
  };
  sentiment?: {
    label: string;
    score: number;
  };
  suggested_response?: string;
  escalation_id?: number;
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolveText, setResolveText] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/api/conversations/${id}/`)
      .then((res) => res.json())
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch(() => {
        // Demo data
        setTicket({
          id: Number(id),
          channel: "whatsapp",
          status: "escalated",
          sender_name: "John Doe",
          messages: [
            { id: 1, role: "customer", content: "Hi, I placed an order 3 days ago and haven't received any shipping update.", created_at: "2026-03-15T10:30:00Z" },
            { id: 2, role: "ai", content: "I understand your concern about your order. Let me look into this for you. Could you please provide your order number?", created_at: "2026-03-15T10:30:05Z" },
            { id: 3, role: "customer", content: "Order #ORD-2847. This is really frustrating, I needed it by tomorrow.", created_at: "2026-03-15T10:31:00Z" },
            { id: 4, role: "ai", content: "I can see order #ORD-2847. It appears there was a delay at our warehouse. I'm escalating this to a human agent who can expedite the shipping for you.", created_at: "2026-03-15T10:31:05Z" },
          ],
          classification: {
            category: "Order & Shipping",
            confidence: 0.94,
            intent: "track_order",
          },
          sentiment: {
            label: "frustrated",
            score: 0.82,
          },
          suggested_response:
            "I apologize for the delay with order #ORD-2847. I've prioritized your shipment and it will be dispatched within the next 2 hours via express delivery. You should receive it by tomorrow morning. As a courtesy, I've waived the shipping fee.",
          escalation_id: 1,
        });
        setLoading(false);
      });
  }, [id]);

  const handleResolve = async () => {
    if (!resolveText.trim() || !ticket?.escalation_id) return;

    setResolving(true);
    try {
      await fetch(
        `http://localhost:8000/api/escalations/${ticket.escalation_id}/resolve/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: resolveText }),
        }
      );
      setTicket((prev) =>
        prev ? { ...prev, status: "resolved" } : prev
      );
      setResolveText("");
    } catch {
      // Handle error silently for demo
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Ticket not found</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Ticket #{ticket.id}</h2>
          <p className="text-gray-400 mt-1">
            {ticket.sender_name} via{" "}
            <span className="capitalize">{ticket.channel}</span>
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            ticket.status === "escalated"
              ? "bg-yellow-600/20 text-yellow-400"
              : ticket.status === "resolved"
              ? "bg-green-600/20 text-green-400"
              : "bg-blue-600/20 text-blue-400"
          }`}
        >
          {ticket.status}
        </span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Conversation Thread */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Conversation</h3>
            <ConversationThread messages={ticket.messages} />
          </div>

          {/* Resolve Form */}
          {ticket.status === "escalated" && (
            <div className="bg-[#1e293b] rounded-xl border border-yellow-800/50 p-6">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">
                Resolve Escalation
              </h3>
              <textarea
                value={resolveText}
                onChange={(e) => setResolveText(e.target.value)}
                placeholder="Type your response to the customer..."
                className="w-full bg-gray-800 text-white rounded-lg p-4 text-sm outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-500 resize-none h-32"
              />
              <button
                onClick={handleResolve}
                disabled={resolving || !resolveText.trim()}
                className="mt-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                {resolving ? "Resolving..." : "Resolve Ticket"}
              </button>
            </div>
          )}
        </div>

        {/* Right: AI Sidebar */}
        <div>
          <AISidebar
            classification={ticket.classification}
            sentiment={ticket.sentiment}
            suggested_response={ticket.suggested_response}
          />
        </div>
      </div>
    </div>
  );
}
