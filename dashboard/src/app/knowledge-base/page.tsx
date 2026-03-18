"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  source_file?: string;
  created_at: string;
}

export default function KnowledgeBasePage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const fetchEntries = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/knowledge/`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch knowledge base entries");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data.results ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchEntries();
  }, [token, fetchEntries]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress since fetch doesn't have native progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const res = await fetch(`${API_URL}/api/knowledge-base/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || "Upload failed");
      }

      setUploadSuccess(`"${file.name}" uploaded and processed successfully.`);
      fetchEntries();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge base entry?")) return;

    try {
      const res = await fetch(`${API_URL}/api/knowledge/${id}/`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 dark:text-gray-500 text-sm">Loading knowledge base...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload documents and manage the AI&apos;s knowledge
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf"
            onChange={handleUpload}
            className="hidden"
            id="kb-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Uploading...</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{uploadSuccess}</p>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Fetch error */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">No knowledge base entries yet</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">Upload a .txt, .md, or .pdf file to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[11px] font-medium">
                      {entry.category || "general"}
                    </span>
                    {entry.source_file && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{entry.source_file}</span>
                    )}
                    <span className="text-xs text-gray-300 dark:text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {entry.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-2 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  title="Delete entry"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
