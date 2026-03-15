"use client";

import { useEffect, useState, useCallback } from "react";
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
  id: string;
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
  escalation_id?: string;
}

type ResponseMode = "human" | "ai";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("human");

  const fetchTicket = useCallback(() => {
    fetch(`http://localhost:8000/api/conversations/${id}/`)
      .then((res) => res.json())
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTicket();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchTicket, 5000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;

    setSending(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/conversations/${ticket.id}/reply/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyText }),
        }
      );

      if (res.ok) {
        setReplyText("");
        fetchTicket(); // Refresh to show new message
      }
    } catch {
      // Handle error silently
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!replyText.trim() || !ticket?.escalation_id) return;

    setResolving(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/escalations/${ticket.escalation_id}/resolve/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: replyText }),
        }
      );

      if (res.ok) {
        setReplyText("");
        fetchTicket();
      }
    } catch {
      // Handle error silently
    } finally {
      setResolving(false);
    }
  };

  const handleUseSuggested = () => {
    if (ticket?.suggested_response) {
      setReplyText(ticket.suggested_response);
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

  const isEscalated = ticket.status === "escalated";
  const isResolved = ticket.status === "resolved";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Ticket #{ticket.id.slice(0, 8)}</h2>
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

          {/* Reply / Resolve Section */}
          {!isResolved && (
            <div className="bg-[#1e293b] rounded-xl border border-gray-800 p-6">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isEscalated ? "Agent Response" : "Reply"}
                </h3>
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setResponseMode("human")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      responseMode === "human"
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Human
                  </button>
                  <button
                    onClick={() => {
                      setResponseMode("ai");
                      handleUseSuggested();
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      responseMode === "ai"
                        ? "bg-purple-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    AI Suggested
                  </button>
                </div>
              </div>

              {/* Response hint */}
              {responseMode === "ai" && (
                <div className="mb-3 px-3 py-2 bg-purple-900/20 border border-purple-800/30 rounded-lg text-purple-300 text-xs">
                  Using AI-suggested response. You can edit it before sending.
                </div>
              )}

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  responseMode === "human"
                    ? "Type your response to the customer..."
                    : "AI suggested response will appear here..."
                }
                className="w-full bg-gray-800 text-white rounded-lg p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none h-32"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {sending ? "Sending..." : "Send Reply"}
                </button>

                {isEscalated && (
                  <button
                    onClick={handleResolve}
                    disabled={resolving || !replyText.trim()}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                  >
                    {resolving ? "Resolving..." : "Send & Resolve"}
                  </button>
                )}
              </div>

              <p className="text-gray-500 text-xs mt-2">
                <strong>Send Reply</strong> sends the message without closing the ticket.{" "}
                {isEscalated && (
                  <>
                    <strong>Send &amp; Resolve</strong> sends the message and marks the ticket as resolved.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Resolved banner */}
          {isResolved && (
            <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-6 text-center">
              <div className="text-green-400 text-lg font-semibold">Ticket Resolved</div>
              <p className="text-gray-400 text-sm mt-1">This ticket has been resolved and closed.</p>
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
