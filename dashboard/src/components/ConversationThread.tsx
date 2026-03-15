"use client";

interface Message {
  id: number;
  role: "customer" | "ai" | "agent";
  content: string;
  created_at: string;
}

interface ConversationThreadProps {
  messages: Message[];
}

const roleBadge: Record<string, { bg: string; label: string }> = {
  customer: { bg: "bg-gray-600", label: "Customer" },
  ai: { bg: "bg-blue-600", label: "AI" },
  agent: { bg: "bg-green-600", label: "Agent" },
};

export default function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const badge = roleBadge[msg.role] || roleBadge.customer;
        const isCustomer = msg.role === "customer";

        return (
          <div
            key={msg.id}
            className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 ${
                isCustomer
                  ? "bg-gray-800 rounded-tl-none"
                  : msg.role === "ai"
                  ? "bg-blue-900/40 rounded-tr-none"
                  : "bg-green-900/40 rounded-tr-none"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${badge.bg}`}
                >
                  {badge.label}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        );
      })}
      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">No messages yet</div>
      )}
    </div>
  );
}
