"use client";

import { useState, useEffect, useRef } from "react";
import { WS_URL } from "@/lib/api";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    const ws = new WebSocket(`${WS_URL}/ws/chat/`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [
        ...prev,
        {
          id: ++idRef.current,
          role: "assistant",
          content: data.message || data.response || data.content,
          timestamp: new Date(),
        },
      ]);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg: ChatMessage = {
      id: ++idRef.current,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, msg]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: input }));
    }

    setInput("");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 flex items-center justify-center transition-all z-50"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-sm">Chat Support</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {connected ? "Connected" : "Connecting..."}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
                Send a message to start chatting
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700 shadow-sm rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 dark:border-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              <button
                onClick={sendMessage}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
