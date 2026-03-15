"use client";

import Link from "next/link";

interface Conversation {
  id: number;
  channel: string;
  status: string;
  sender_name: string;
  sender_identifier: string;
  last_message?: string;
  created_at: string;
}

interface TicketQueueProps {
  conversations: Conversation[];
}

const channelBadge: Record<string, string> = {
  whatsapp: "bg-green-600/20 text-green-400",
  email: "bg-blue-600/20 text-blue-400",
  webchat: "bg-purple-600/20 text-purple-400",
};

const statusBadge: Record<string, string> = {
  active: "bg-blue-600/20 text-blue-400",
  escalated: "bg-yellow-600/20 text-yellow-400",
  resolved: "bg-green-600/20 text-green-400",
  closed: "bg-gray-600/20 text-gray-400",
};

export default function TicketQueue({ conversations }: TicketQueueProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-4 py-3 text-sm font-medium text-gray-400">ID</th>
            <th className="px-4 py-3 text-sm font-medium text-gray-400">Channel</th>
            <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
            <th className="px-4 py-3 text-sm font-medium text-gray-400">Sender</th>
            <th className="px-4 py-3 text-sm font-medium text-gray-400">Last Message</th>
            <th className="px-4 py-3 text-sm font-medium text-gray-400">Created At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {conversations.map((conv) => (
            <tr
              key={conv.id}
              className="hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/tickets/${conv.id}`}
                  className="text-blue-400 hover:underline font-mono"
                >
                  #{conv.id}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    channelBadge[conv.channel] || "bg-gray-600/20 text-gray-400"
                  }`}
                >
                  {conv.channel}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusBadge[conv.status] || "bg-gray-600/20 text-gray-400"
                  }`}
                >
                  {conv.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm">{conv.sender_name || conv.sender_identifier}</td>
              <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                {conv.last_message || "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(conv.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {conversations.length === 0 && (
        <div className="p-8 text-center text-gray-500">No tickets found</div>
      )}
    </div>
  );
}
