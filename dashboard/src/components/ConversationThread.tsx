"use client";

import { useEffect, useRef } from "react";

interface Message {
  id: number;
  role: "customer" | "ai" | "agent";
  content: string;
  created_at: string;
}

interface ConversationThreadProps {
  messages: Message[];
}

const roleConfig: Record<
  string,
  { label: string; avatar: string; avatarBg: string; bubbleBg: string; textColor: string; isRight: boolean }
> = {
  customer: {
    label: "Customer",
    avatar: "C",
    avatarBg: "bg-gray-600 text-white",
    bubbleBg: "bg-white dark:bg-slate-700 shadow-sm border border-gray-100 dark:border-slate-600",
    textColor: "text-gray-800 dark:text-gray-200",
    isRight: false,
  },
  ai: {
    label: "AI Assistant",
    avatar: "AI",
    avatarBg: "bg-indigo-600 text-white",
    bubbleBg: "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100/80 dark:border-indigo-800/40",
    textColor: "text-gray-800 dark:text-gray-200",
    isRight: true,
  },
  agent: {
    label: "Human Agent",
    avatar: "H",
    avatarBg: "bg-emerald-600 text-white",
    bubbleBg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100/80 dark:border-emerald-800/40",
    textColor: "text-gray-800 dark:text-gray-200",
    isRight: true,
  },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function ConversationThread({ messages }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-gray-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No messages yet</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Messages will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-2">
      {messages.map((msg, i) => {
        const config = roleConfig[msg.role] || roleConfig.customer;
        const prevMsg = messages[i - 1];
        const sameRole = prevMsg?.role === msg.role;
        const isFirstInGroup = !sameRole;

        return (
          <div key={msg.id}>
            {/* Date separator — show when day changes */}
            {i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString() ? (
              <div className="flex items-center justify-center my-4">
                <div className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {new Date(msg.created_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                </div>
              </div>
            ) : null}

            <div className={`flex ${config.isRight ? "flex-row-reverse" : ""} ${isFirstInGroup ? "mt-4" : "mt-0.5"} group`}>
              {/* Avatar */}
              <div className="w-8 shrink-0 flex flex-col items-center">
                {isFirstInGroup ? (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${config.avatarBg}`}>
                    {config.avatar}
                  </div>
                ) : null}
              </div>

              {/* Content */}
              <div className={`flex flex-col ${config.isRight ? "items-end" : "items-start"} max-w-[70%] mx-1`}>
                {/* Name + time header */}
                {isFirstInGroup && (
                  <div className={`flex items-center gap-2 mb-1 px-1 ${config.isRight ? "flex-row-reverse" : ""}`}>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{config.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(msg.created_at)}</span>
                  </div>
                )}

                {/* Message bubble */}
                <div className={`${config.bubbleBg} rounded-2xl ${
                  config.isRight
                    ? isFirstInGroup ? "rounded-tr-sm" : "rounded-tr-sm"
                    : isFirstInGroup ? "rounded-tl-sm" : "rounded-tl-sm"
                } px-4 py-2.5 relative`}>
                  <p className={`text-[13px] leading-[1.6] ${config.textColor} whitespace-pre-wrap break-words`}>
                    {msg.content}
                  </p>
                  {/* Inline time for consecutive messages */}
                  {!isFirstInGroup && (
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-3.5 right-2">
                      {formatTime(msg.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
