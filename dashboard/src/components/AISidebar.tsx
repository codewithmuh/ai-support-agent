"use client";

interface AISidebarProps {
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
}

export default function AISidebar({
  classification,
  sentiment,
  suggested_response,
}: AISidebarProps) {
  const sentimentConfig: Record<string, { color: string; bg: string; emoji: string }> = {
    positive: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", emoji: "😊" },
    neutral: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-slate-700/50", emoji: "😐" },
    negative: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", emoji: "😠" },
    frustrated: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", emoji: "😤" },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">AI Insights</h3>

      {/* Classification */}
      <div className="rounded-lg bg-gray-50 dark:bg-slate-700/30 p-3.5">
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classification</span>
        </div>
        {classification ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Category</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded capitalize">{classification.category}</span>
            </div>
            {classification.intent && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Intent</span>
                <span className="text-[11px] text-gray-700 dark:text-gray-300">{classification.intent}</span>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">Confidence</span>
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  {(classification.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    classification.confidence >= 0.7 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${(classification.confidence * 100).toFixed(0)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">No data</p>
        )}
      </div>

      {/* Sentiment */}
      <div className="rounded-lg bg-gray-50 dark:bg-slate-700/30 p-3.5">
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sentiment</span>
        </div>
        {sentiment ? (
          <div className="flex items-center gap-2">
            {(() => {
              const cfg = sentimentConfig[sentiment.label] || sentimentConfig.neutral;
              return (
                <>
                  <span className="text-lg">{cfg.emoji}</span>
                  <span className={`text-sm font-semibold capitalize ${cfg.color}`}>{sentiment.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                    {(sentiment.score * 100).toFixed(0)}%
                  </span>
                </>
              );
            })()}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">No data</p>
        )}
      </div>

      {/* Suggested Response */}
      <div className="rounded-lg bg-gray-50 dark:bg-slate-700/30 p-3.5">
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Suggestion</span>
        </div>
        {suggested_response ? (
          <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">{suggested_response}</p>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">No suggestion available</p>
        )}
      </div>
    </div>
  );
}
