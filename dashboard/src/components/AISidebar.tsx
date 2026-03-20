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

const categoryColors: Record<string, string> = {
  billing: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
  technical: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  account: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400",
  general: "bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300",
};

const sentimentConfig: Record<string, { color: string; bg: string; emoji: string; ringColor: string }> = {
  positive: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", emoji: "😊", ringColor: "stroke-emerald-500" },
  neutral: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-slate-700/50", emoji: "😐", ringColor: "stroke-gray-400" },
  negative: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", emoji: "😠", ringColor: "stroke-red-500" },
  frustrated: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30", emoji: "😤", ringColor: "stroke-orange-500" },
};

function ConfidenceRing({ value, size = 48 }: { value: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const color = value >= 0.7 ? "stroke-emerald-500" : value >= 0.4 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={3} fill="none" className="stroke-gray-200 dark:stroke-slate-600" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={3} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${color} transition-all duration-500`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{(value * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function AISidebar({ classification, sentiment, suggested_response }: AISidebarProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="text-xs font-bold text-gray-900 dark:text-white">AI Insights</span>
      </div>

      {/* Classification card */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50/80 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classification</span>
          </div>
        </div>
        <div className="p-3.5">
          {classification ? (
            <div className="flex items-center gap-3">
              <ConfidenceRing value={classification.confidence} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Category</span>
                  <div className="mt-0.5">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${categoryColors[classification.category] || categoryColors.general}`}>
                      {classification.category}
                    </span>
                  </div>
                </div>
                {classification.intent && (
                  <div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Intent</span>
                    <p className="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5">{classification.intent}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-2">Awaiting classification...</p>
          )}
        </div>
      </div>

      {/* Sentiment card */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50/80 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sentiment</span>
          </div>
        </div>
        <div className="p-3.5">
          {sentiment ? (
            (() => {
              const cfg = sentimentConfig[sentiment.label] || sentimentConfig.neutral;
              return (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-xl`}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold capitalize ${cfg.color}`}>{sentiment.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-slate-600">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            sentiment.label === "positive" || sentiment.label === "neutral"
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${(sentiment.score * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
                        {(sentiment.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-2">No sentiment data</p>
          )}
        </div>
      </div>

      {/* Suggested Response */}
      <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50/80 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Suggestion</span>
          </div>
        </div>
        <div className="p-3.5">
          {suggested_response ? (
            <div>
              <p className="text-[12px] leading-[1.7] text-gray-600 dark:text-gray-400">{suggested_response}</p>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-2 italic">Click "Use AI suggestion" in the reply area to apply</p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-2">No suggestion available</p>
          )}
        </div>
      </div>
    </div>
  );
}
