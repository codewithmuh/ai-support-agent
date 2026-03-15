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
  const sentimentColor: Record<string, string> = {
    positive: "text-green-400",
    neutral: "text-gray-400",
    negative: "text-red-400",
    frustrated: "text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Classification */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          AI Classification
        </h3>
        {classification ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Category</p>
              <p className="text-sm font-medium">{classification.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Intent</p>
              <p className="text-sm font-medium">{classification.intent}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Confidence</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(classification.confidence * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {(classification.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No classification data</p>
        )}
      </div>

      {/* Sentiment */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Sentiment
        </h3>
        {sentiment ? (
          <div className="flex items-center gap-3">
            <span
              className={`text-2xl font-bold capitalize ${
                sentimentColor[sentiment.label] || "text-gray-400"
              }`}
            >
              {sentiment.label}
            </span>
            <span className="text-sm text-gray-500">
              ({(sentiment.score * 100).toFixed(0)}%)
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No sentiment data</p>
        )}
      </div>

      {/* Suggested Response */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Suggested Response
        </h3>
        {suggested_response ? (
          <div>
            <p className="text-sm leading-relaxed text-gray-300 bg-gray-800 rounded-lg p-3">
              {suggested_response}
            </p>
            <button className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Copy to clipboard
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No suggestion available</p>
        )}
      </div>
    </div>
  );
}
