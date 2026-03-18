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

const roleConfig: Record<string, { label: string; avatar: string; avatarBg: string; bubbleBg: string; isRight: boolean }> = {
  customer: {
    label: "Customer",
    avatar: "C",
    avatarBg: "bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300",
    bubbleBg: "bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600",
    isRight: false,
  },
  ai: {
    label: "AI",
    avatar: "AI",
    avatarBg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
    bubbleBg: "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50",
    isRight: true,
  },
  agent: {
    label: "Agent",
    avatar: "H",
    avatarBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    bubbleBg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50",
    isRight: true,
  },
};

export default function ConversationThread({ messages }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
      {messages.map((msg, i) => {
        const config = roleConfig[msg.role] || roleConfig.customer;
        const prevMsg = messages[i - 1];
        const sameRole = prevMsg?.role === msg.role;
        const time = new Date(msg.created_at);

        return (
          <div key={msg.id} className={`flex items-end gap-2 ${config.isRight ? "flex-row-reverse" : ""} ${sameRole ? "mt-0.5" : "mt-3"}`}>
            {/* Avatar — only show if different role from previous */}
            {!sameRole ? (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${config.avatarBg}`}>
                {config.avatar}
              </div>
            ) : (
              <div className="w-7 shrink-0" />
            )}

            {/* Bubble */}
            <div className={`max-w-[75%] ${config.bubbleBg} rounded-2xl ${config.isRight ? "rounded-br-md" : "rounded-bl-md"} px-3.5 py-2.5`}>
              {!sameRole && (
                <div className={`flex items-center gap-2 mb-1 ${config.isRight ? "flex-row-reverse" : ""}`}>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{config.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
