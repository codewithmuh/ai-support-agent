"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import SupportFlowDiagram from "./SupportFlowDiagram";

/* ── Fake chat demo messages ── */
const DEMO_MESSAGES = [
  { role: "customer", text: "Hi, I was charged twice for my subscription last month. Can you help?" },
  { role: "ai", text: "I understand how frustrating that must be. Let me look into your billing records right away. Could you share your account email so I can pull up the details?" },
  { role: "customer", text: "Sure, it's sarah@example.com" },
  { role: "ai", text: "Thanks Sarah! I found the duplicate charge of $29.99 on March 3rd. I've initiated a refund — you should see it in 3-5 business days. Is there anything else I can help with?" },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [demoChatVisible, setDemoChatVisible] = useState(3); // show first N messages

  // Animate showing messages
  const showNextMessage = () => {
    if (demoChatVisible < DEMO_MESSAGES.length) {
      setDemoChatVisible((p) => p + 1);
    } else {
      setDemoChatVisible(1);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* ═══ Navigation ═══ */}
      <nav className="border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">Support AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#tech-stack" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Tech Stack</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Link href="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 transition-colors">Login</Link>
            <Link href="/signup" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ═══ Hero — Split: Left text, Right chat demo ═══ */}
      <section className="pt-16 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Open Source &middot; Self-Hosted &middot; Multi-Channel
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              AI Customer Support<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">That Actually Works</span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-lg">
              Handle <strong className="text-gray-900 dark:text-white">80% of support tickets</strong> automatically.
              WhatsApp, Telegram, Email &amp; Web Chat — all feeding into one AI brain.
              Replace <span className="line-through text-gray-400">$1,500/mo</span> tools for <strong className="text-emerald-600 dark:text-emerald-400">~$85/mo</strong>.
            </p>

            {/* Key stats */}
            <div className="flex gap-6 mb-8">
              {[
                { value: "80%", label: "Auto-resolved" },
                { value: "<2s", label: "Response time" },
                { value: "4", label: "Channels" },
                { value: "$85", label: "Monthly cost" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-8">
              <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                Start Free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                See How It Works
              </a>
            </div>

            {/* Channel badges */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { name: "WhatsApp", color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
                { name: "Telegram", color: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
                { name: "Email", color: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" },
                { name: "Web Chat", color: "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
              ].map((ch) => (
                <span key={ch.name} className={`px-3 py-1 rounded-full text-xs font-medium border ${ch.color}`}>{ch.name}</span>
              ))}
            </div>
          </div>

          {/* Right: Chat demo widget */}
          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden max-w-md mx-auto">
              {/* Chat header */}
              <div className="px-5 py-3.5 bg-indigo-600 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Support AI</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[11px] text-indigo-200">Online &middot; Replies in seconds</p>
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="px-4 py-5 space-y-3 min-h-[320px] bg-gray-50 dark:bg-slate-900/50">
                {DEMO_MESSAGES.slice(0, demoChatVisible).map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === "ai"
                        ? "bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-bl-md"
                        : "bg-indigo-600 text-white rounded-br-md"
                    }`}>
                      {msg.role === "ai" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">AI Agent</span>
                          <span className="text-[10px] text-gray-400">just now</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}

                {demoChatVisible < DEMO_MESSAGES.length && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <button
                  onClick={showNextMessage}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <span>{demoChatVisible >= DEMO_MESSAGES.length ? "Restart demo..." : "Click to see AI respond..."}</span>
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg hidden lg:block">
              Classified as: Billing
            </div>
            <div className="absolute -top-3 -right-3 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg hidden lg:block">
              Confidence: 94%
            </div>
          </div>
        </div>
      </section>

      {/* ═══ "The Problem" section — why this exists ═══ */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-slate-800/50 border-y border-gray-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">The 80/20 Approach to Support</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            80% of support tickets are repetitive — billing questions, password resets, shipping status.
            AI handles those instantly. Humans focus on the complex 20% that actually needs them.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: "🤖", title: "AI Handles 80%", desc: "Billing, shipping, FAQs, account questions — answered in seconds from your knowledge base", color: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20" },
              { icon: "👤", title: "Humans Handle 20%", desc: "Complex issues, angry customers, edge cases — with full AI-generated context & suggested replies", color: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20" },
              { icon: "🛡️", title: "3 Safety Layers", desc: "Anti-hallucination guardrails ensure AI never makes up policies, prices, or guarantees", color: "border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/20" },
            ].map((item) => (
              <div key={item.title} className={`rounded-xl p-6 border ${item.color}`}>
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium mb-4">Key Features</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Everything You Need</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Built with modern tools — no bloat, no vendor lock-in, fully open source.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.iconBg} group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works — Animated Flow Diagram ═══ */}
      <div className="bg-gray-50/50 dark:bg-slate-800/30">
        <SupportFlowDiagram />
      </div>

      {/* ═══ Tech Stack ═══ */}
      <section id="tech-stack" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-xs font-medium mb-4">Under The Hood</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Built With</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TECH_STACK.map((tech) => (
              <div key={tech.name} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center hover:shadow-md transition-shadow">
                <span className="text-2xl mb-2 block">{tech.icon}</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{tech.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{tech.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing Comparison ═══ */}
      <section id="pricing" className="py-20 px-6 bg-gray-50/50 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-4">Save 90%+</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Stop Overpaying for Support Tools</h2>
            <p className="text-gray-500 dark:text-gray-400">Self-hosted means no per-seat fees, no per-resolution charges, no surprises.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white px-6 py-4">Platform</th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white px-6 py-4">Pricing</th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20"><td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">Intercom</td><td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">$79/seat/mo + $0.99/resolution</td><td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">Costs balloon with volume</td></tr>
                <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20"><td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">Zendesk</td><td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">$55 - $115/agent/mo</td><td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">AI add-on costs extra</td></tr>
                <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-700/20"><td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">Freshdesk</td><td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">$49 - $79/agent/mo</td><td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">Limited AI features</td></tr>
                <tr className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-600">
                  <td className="px-6 py-5 text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                    Support AI
                  </td>
                  <td className="px-6 py-5 text-lg font-bold text-indigo-700 dark:text-indigo-400">~$85/mo <span className="text-xs font-normal">total</span></td>
                  <td className="px-6 py-5 text-sm text-indigo-600 dark:text-indigo-400 font-medium">Self-hosted, unlimited agents, unlimited tickets</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">Claude API ~$50-60/mo + VPS hosting ~$20/mo + domain ~$5/mo. No per-seat or per-resolution fees.</p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Ready to build your AI support agent?</h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-lg mx-auto">3 commands to deploy. Connect WhatsApp, Telegram, or Email in minutes.</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md text-base">
              Get Started Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link href="/docs" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-base">
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 pt-12 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Support AI</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">AI-powered multi-channel customer support. Handle 80% of tickets automatically.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">How It Works</a></li>
                <li><Link href="/docs" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Channels</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-gray-500 dark:text-gray-400">WhatsApp Business</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">Telegram</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">Gmail / Email</span></li>
                <li><span className="text-sm text-gray-500 dark:text-gray-400">Web Chat Widget</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">&copy; {new Date().getFullYear()} Support AI. Built for <strong>CodeWithMuh</strong> YouTube tutorial.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Feature data ── */
const FEATURES = [
  { title: "Multi-Channel Support", description: "WhatsApp, Telegram, Email, and Web Chat — all conversations flow into one unified dashboard.", iconBg: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg> },
  { title: "AI Classification", description: "Claude Haiku auto-routes tickets — billing, technical, account, or complaint — with confidence scoring.", iconBg: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
  { title: "RAG Responses", description: "Claude Sonnet generates answers using your knowledge base via pgvector semantic search. No hallucinations.", iconBg: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { title: "Smart Escalation", description: "Auto-escalates when confidence < 70%, customer is frustrated, or asks for a human. Full context handoff.", iconBg: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { title: "Agent Dashboard", description: "Real-time ticket queue, conversation view, AI sidebar with suggestions, analytics — all in one place.", iconBg: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { title: "Anti-Hallucination", description: "3-layer guardrails: system prompt constraints, empty RAG fallback, post-generation policy/price check.", iconBg: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
];

/* ── Tech stack data ── */
const TECH_STACK = [
  { icon: "🐍", name: "Django", role: "Backend + REST API" },
  { icon: "⚛️", name: "Next.js", role: "Agent Dashboard" },
  { icon: "🧠", name: "Claude AI", role: "Haiku + Sonnet" },
  { icon: "🐘", name: "PostgreSQL", role: "Database + pgvector" },
  { icon: "🔴", name: "Redis", role: "WebSocket Channels" },
  { icon: "🐳", name: "Docker", role: "One-command deploy" },
  { icon: "📡", name: "ngrok", role: "Webhook tunneling" },
  { icon: "🔑", name: "JWT Auth", role: "Team authentication" },
];
