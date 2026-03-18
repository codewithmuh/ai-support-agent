"use client";

import { motion } from "framer-motion";

interface FlowNode {
  icon: string;
  label: string;
  sublabel?: string;
  color: string;
}

const channelNodes: FlowNode[] = [
  { icon: "💬", label: "WhatsApp", sublabel: "Cloud API", color: "#10b981" },
  { icon: "✈️", label: "Telegram", sublabel: "Bot API", color: "#0ea5e9" },
  { icon: "📧", label: "Email", sublabel: "Gmail API", color: "#ef4444" },
  { icon: "🌐", label: "Web Chat", sublabel: "WebSocket", color: "#8b5cf6" },
];

const pipelineNodes: FlowNode[] = [
  { icon: "🔀", label: "Normalize", sublabel: "UnifiedMessage", color: "#6366f1" },
  { icon: "🏷️", label: "Classify", sublabel: "Claude Haiku", color: "#8b5cf6" },
  { icon: "🔍", label: "Search KB", sublabel: "pgvector RAG", color: "#06b6d4" },
  { icon: "🧠", label: "Generate", sublabel: "Claude Sonnet", color: "#6366f1" },
  { icon: "🛡️", label: "Guardrails", sublabel: "3-layer check", color: "#f43f5e" },
];

const escalationNodes: FlowNode[] = [
  { icon: "📊", label: "Dashboard", sublabel: "Agent Queue", color: "#f59e0b" },
  { icon: "👤", label: "Human Agent", sublabel: "Review & Reply", color: "#f59e0b" },
];

function HArrow({ delay, color = "#818cf8", dashed = false }: { delay: number; color?: string; dashed?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center px-0.5"
      style={{ originX: 0 }}
    >
      <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
        <motion.path
          d="M0 8H30M30 8L24 3M30 8L24 13"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "4 3" : undefined}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.1, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );
}

function VArrow({ delay, color = "#818cf8" }: { delay: number; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.3 }}
      className="flex justify-center py-1"
    >
      <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
        <motion.path
          d="M7 0V16M7 16L3 11M7 16L11 11"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.1, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );
}

function NodeCard({ node, delay, pulse, size = "normal" }: { node: FlowNode; delay: number; pulse?: boolean; size?: "normal" | "small" }) {
  const isSmall = size === "small";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      className={`relative flex flex-col items-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow ${isSmall ? "px-5 py-4" : "px-7 py-5"}`}
      style={{
        minWidth: isSmall ? 130 : 145,
        background: `linear-gradient(145deg, ${node.color}18, ${node.color}08)`,
        borderWidth: 1,
        borderColor: `${node.color}30`,
      }}
    >
      {/* Colored icon circle */}
      <div
        className={`${isSmall ? "w-10 h-10" : "w-12 h-12"} rounded-xl flex items-center justify-center shadow-sm`}
        style={{ background: `${node.color}20` }}
      >
        <span className={isSmall ? "text-xl" : "text-2xl"}>{node.icon}</span>
      </div>
      <span
        className={`${isSmall ? "text-sm" : "text-base"} font-bold text-center leading-tight`}
        style={{ color: node.color }}
      >
        {node.label}
      </span>
      {node.sublabel && (
        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 text-center">{node.sublabel}</span>
      )}
      {pulse && (
        <motion.div
          className="absolute -inset-1.5 rounded-[20px] border-2"
          style={{ borderColor: node.color }}
          animate={{ opacity: [0.4, 0, 0.4], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

export default function SupportFlowDiagram() {
  return (
    <div className="py-20 px-6" id="how-it-works">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            8-Step AI Pipeline
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">How It Works</h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            From customer message to AI response in under <span className="font-semibold text-indigo-600 dark:text-indigo-400">2 seconds</span>.
          </p>
        </div>

        {/* ═══ DESKTOP ═══ */}
        <div className="hidden lg:block">
          {/* Row 1: Channel sources */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-widest"
          >
            ● Incoming Channels
          </motion.p>
          <div className="flex items-center justify-center gap-4 mb-2">
            {channelNodes.map((node, i) => (
              <NodeCard key={node.label} node={node} delay={i * 0.08} size="small" />
            ))}
          </div>

          {/* Merge arrows down into pipeline */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex justify-center my-2"
          >
            <svg width="400" height="40" viewBox="0 0 400 40" fill="none" className="mx-auto">
              {[60, 150, 250, 340].map((x, i) => (
                <motion.path
                  key={i}
                  d={`M${x} 0L200 32`}
                  stroke="#6366f1"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.45 + i * 0.05, duration: 0.35 }}
                />
              ))}
              <motion.path
                d="M200 32L196 25M200 32L204 25"
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.75 }}
              />
            </svg>
          </motion.div>

          {/* Row 2: AI Pipeline */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4 uppercase tracking-widest"
          >
            ● AI Pipeline
          </motion.p>
          <div className="flex items-center justify-center gap-0.5">
            {pipelineNodes.map((node, i) => (
              <div key={node.label} className="contents">
                {i > 0 && <HArrow delay={0.8 + i * 0.1} />}
                <NodeCard node={node} delay={0.8 + i * 0.1} pulse={node.label === "Generate"} />
              </div>
            ))}
          </div>

          {/* Escalation branch from "Classify" */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4 }}
            className="flex justify-center mt-3"
          >
            <div className="flex flex-col items-center" style={{ width: 600 }}>
              <svg width="600" height="45" viewBox="0 0 600 45" fill="none" className="mx-auto">
                <motion.path
                  d="M180 0V20H440V40M440 40L435 33M440 40L445 33"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="5 4"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.5, duration: 0.6 }}
                />
              </svg>
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.7 }}
                className="rounded-full px-4 py-1.5 text-xs font-semibold mt-2"
                style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}
              >
                ⚡ Confidence &lt; 70% · Negative sentiment · Human requested → Escalate
              </motion.span>
            </div>
          </motion.div>

          {/* Escalation nodes */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <NodeCard node={escalationNodes[0]} delay={1.8} size="small" />
            <HArrow delay={1.9} color="#f59e0b" dashed />
            <NodeCard node={escalationNodes[1]} delay={2.0} size="small" />
          </div>

          {/* Return arrow: Response back through channels */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.5 }}
            className="flex justify-center mt-6 mb-3"
          >
            <div className="flex flex-col items-center" style={{ width: 500 }}>
              <svg width="500" height="28" viewBox="0 0 500 28" fill="none" className="mx-auto">
                <motion.path
                  d="M400 3C400 20 100 20 100 3"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="5 4"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.6, duration: 0.6 }}
                />
                <motion.path
                  d="M100 3L95 10M100 3L106 9"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 2.1 }}
                />
              </svg>
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.9 }}
                className="rounded-full px-4 py-1.5 text-xs font-semibold mt-2"
                style={{ background: "#10b98118", color: "#10b981", border: "1px solid #10b98130" }}
              >
                ✅ Response sent back through original channel
              </motion.span>
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 2.2 }}
            className="mt-6 flex justify-center"
          >
            <div className="flex flex-wrap items-center gap-5 rounded-full border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-5 rounded bg-indigo-500" />
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">AI Pipeline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-5 rounded bg-emerald-500" />
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">Response</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="16" height="6" viewBox="0 0 16 6"><line x1="0" y1="3" x2="16" y2="3" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">Escalation</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-2 w-2 rounded-full bg-indigo-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">Active Node</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ═══ MOBILE ═══ */}
        <div className="lg:hidden space-y-0">
          {/* Channels */}
          <div className="grid grid-cols-2 gap-2 mb-1">
            {channelNodes.map((node, i) => (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-3 p-3"
              >
                <span className="text-xl">{node.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{node.label}</p>
                  <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{node.sublabel}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <VArrow delay={0.3} color="#6366f1" />

          {/* Pipeline steps */}
          {pipelineNodes.map((node, i) => (
            <div key={node.label}>
              {i > 0 && <VArrow delay={0.4 + i * 0.08} />}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
                className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl flex items-center gap-4 p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${node.color}15` }}>
                  {node.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{node.label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{node.sublabel}</p>
                </div>
              </motion.div>
            </div>
          ))}

          <VArrow delay={0.9} color="#10b981" />

          {/* Response */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.95 }}
            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-4 p-4"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg bg-emerald-100 dark:bg-emerald-900/40">
              ✅
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Response Sent</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Back through the original channel</p>
            </div>
          </motion.div>

          {/* Escalation */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.0 }}
            className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚨</span>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Escalation Path</p>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400/80">
              If confidence &lt; 70%, negative sentiment, or human requested → ticket goes to Dashboard for agent review.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
