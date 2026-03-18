"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ConversationThread from "@/components/ConversationThread";
import AISidebar from "@/components/AISidebar";
import { API_URL } from "@/lib/api";

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
  sender_id?: string;
  created_at?: string;
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

const channelIcons: Record<string, { icon: string; color: string }> = {
  whatsapp: { icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z", color: "text-emerald-600 dark:text-emerald-400" },
  telegram: { icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.57 3.68-.53.36-1 .54-1.43.53-.47-.01-1.38-.27-2.05-.48-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49.98-.75 3.85-1.68 6.42-2.79 7.71-3.32 3.67-1.53 4.43-1.79 4.93-1.8.11 0 .35.03.51.14.13.1.17.23.18.33.02.1.04.33.02.51z", color: "text-sky-600 dark:text-sky-400" },
  email: { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "text-red-500 dark:text-red-400" },
  webchat: { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "text-violet-600 dark:text-violet-400" },
};

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("human");
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTicket = useCallback(() => {
    fetch(`${API_URL}/api/conversations/${id}/`)
      .then((res) => res.json())
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 5000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/conversations/${ticket.id}/reply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchTicket();
      }
    } catch { /* silent */ } finally { setSending(false); }
  };

  const handleResolve = async () => {
    if (!replyText.trim() || !ticket?.escalation_id) return;
    setResolving(true);
    try {
      const res = await fetch(`${API_URL}/api/escalations/${ticket.escalation_id}/resolve/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        fetchTicket();
      }
    } catch { /* silent */ } finally { setResolving(false); }
  };

  const handleUseSuggested = () => {
    if (ticket?.suggested_response) {
      setReplyText(ticket.suggested_response);
      textareaRef.current?.focus();
    }
  };

  // Ctrl+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && replyText.trim()) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-10 h-10 text-gray-200 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">Ticket not found</p>
          <Link href="/tickets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">Back to tickets</Link>
        </div>
      </div>
    );
  }

  const isEscalated = ticket.status === "escalated";
  const isResolved = ticket.status === "resolved";
  const msgCount = ticket.messages.length;
  const ch = channelIcons[ticket.channel] || channelIcons.webchat;

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    escalated: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    resolved: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    active: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  };
  const sts = statusConfig[ticket.status] || statusConfig.active;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/tickets" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-400 dark:text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              {/* Channel icon */}
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className={`w-4.5 h-4.5 ${ch.color}`} fill={ticket.channel === "whatsapp" || ticket.channel === "telegram" ? "currentColor" : "none"} stroke={ticket.channel === "whatsapp" || ticket.channel === "telegram" ? "none" : "currentColor"} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={ch.icon} />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{ticket.sender_name}</h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sts.bg} ${sts.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{ticket.channel}</span>
                  <span className="text-gray-200 dark:text-slate-600">|</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{msgCount} messages</span>
                  {ticket.created_at && (
                    <>
                      <span className="text-gray-200 dark:text-slate-600">|</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-gray-400 dark:text-gray-600">#{ticket.id.slice(0, 8)}</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation + Reply */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-slate-900/50">
            <ConversationThread messages={ticket.messages} />
          </div>

          {/* Reply area — always at bottom */}
          {!isResolved ? (
            <div className="shrink-0 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              {/* Success flash */}
              {showSuccess && (
                <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Message sent successfully
                </div>
              )}

              {/* Mode toggle + AI hint */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setResponseMode("human")}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                      responseMode === "human"
                        ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Write reply
                  </button>
                  <button
                    onClick={() => { setResponseMode("ai"); handleUseSuggested(); }}
                    className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                      responseMode === "ai"
                        ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Use AI suggestion
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{replyText.length} chars</span>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response..."
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg p-3 pr-24 text-sm outline-none border border-gray-200 dark:border-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    {sending ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    Send
                  </button>
                  {isEscalated && (
                    <button
                      onClick={handleResolve}
                      disabled={resolving || !replyText.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm inline-flex items-center gap-1.5"
                    >
                      {resolving ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Send &amp; Resolve
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                  {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to send
                </span>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-gray-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Ticket Resolved</p>
                <p className="text-[11px] text-emerald-600/60 dark:text-emerald-400/60">This conversation has been closed.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Sidebar — sticky */}
        <div className="w-72 border-l border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-4 hidden lg:block">
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
