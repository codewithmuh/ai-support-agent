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

const channelConfig: Record<string, { bg: string; text: string }> = {
  whatsapp: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  email: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
  webchat: { bg: "bg-violet-50 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400" },
  telegram: { bg: "bg-sky-50 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-400" },
};

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  escalated: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  resolved: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  closed: { bg: "bg-gray-50 dark:bg-slate-700/50", text: "text-gray-500 dark:text-gray-400", dot: "bg-gray-400" },
};

export default function TicketQueue({ conversations }: TicketQueueProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700">
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channel</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Message</th>
            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {conversations.map((conv) => {
            const channel = channelConfig[conv.channel] || { bg: "bg-gray-50 dark:bg-slate-700/50", text: "text-gray-500 dark:text-gray-400" };
            const sts = statusConfig[conv.status] || statusConfig.closed;

            return (
              <tr key={conv.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/tickets/${conv.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm"
                  >
                    #{String(conv.id).slice(0, 8)}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${channel.bg} ${channel.text}`}>
                    {conv.channel}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sts.bg} ${sts.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
                    {conv.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      {(conv.sender_name || conv.sender_identifier || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {conv.sender_name || conv.sender_identifier}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                  {conv.last_message || "\u2014"}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400 dark:text-gray-500">
                  {new Date(conv.created_at).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {conversations.length === 0 && (
        <div className="py-16 text-center">
          <svg className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">No tickets found</p>
        </div>
      )}
    </div>
  );
}
