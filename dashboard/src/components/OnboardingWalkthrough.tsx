"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OnboardingWalkthroughProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

export function OnboardingWalkthrough({ onComplete }: OnboardingWalkthroughProps) {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  function handleClose() {
    localStorage.setItem("onboarding_completed", "true");
    setVisible(false);
    setTimeout(onComplete, 200);
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  function handleFinish() {
    handleClose();
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />

      {/* Card */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          title="Skip onboarding"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-slate-700">
          <div
            className="h-1 bg-indigo-600 transition-all duration-300 ease-in-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-8 pt-6 pb-2 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 === step
                    ? "bg-indigo-600"
                    : i + 1 < step
                    ? "bg-indigo-300 dark:bg-indigo-700"
                    : "bg-gray-200 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {step === 1 && <StepWelcome />}
          {step === 2 && <StepConnectChannel />}
          {step === 3 && <StepKnowledgeBase />}
          {step === 4 && <StepConfigureAI />}
          {step === 5 && <StepReady />}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 1 && step < 5 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 1 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Get Started
                </button>
              )}
              {step >= 2 && step <= 4 && (
                <>
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {step === 2
                      ? "I've connected a channel"
                      : step === 3
                      ? "I've uploaded docs"
                      : "I've added my keys"}
                  </button>
                </>
              )}
              {step === 5 && (
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step Components ---

function StepWelcome() {
  return (
    <div className="text-center pt-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Support AI!</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Let&apos;s get your AI support agent up and running in 5 minutes
      </p>
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-left">
        <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium mb-2">The 80/20 Approach</p>
        <p className="text-xs text-indigo-700 dark:text-indigo-400/80 leading-relaxed">
          Your AI agent handles 80% of routine support tickets automatically &mdash; billing questions, common technical issues, account inquiries. The remaining 20% of complex cases get escalated to your human team with full context and suggested responses.
        </p>
      </div>
    </div>
  );
}

function StepConnectChannel() {
  const channels = [
    {
      name: "WhatsApp",
      href: "/settings/whatsapp",
      description: "WhatsApp Business Cloud API",
      iconBg: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      href: "/settings/telegram",
      description: "Telegram Bot API",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-500 dark:text-blue-400",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      name: "Gmail",
      href: "/settings/gmail",
      description: "Google Gmail API",
      iconBg: "bg-red-50 dark:bg-red-900/30",
      iconColor: "text-red-500 dark:text-red-400",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Messenger",
      href: "/settings/messenger",
      description: "Facebook Messenger & Instagram",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.076 12.457l-2.55-2.72-4.98 2.72 5.476-5.814 2.613 2.72 4.916-2.72-5.475 5.814z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="pt-2">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connect Your First Channel</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Choose a messaging channel to start receiving customer messages.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {channels.map((ch) => (
          <Link
            key={ch.name}
            href={ch.href}
            onClick={() => localStorage.setItem("onboarding_completed", "true")}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center shrink-0`}>
              <span className={ch.iconColor}>{ch.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{ch.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{ch.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StepKnowledgeBase() {
  return (
    <div className="text-center pt-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Teach Your AI</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Upload your FAQs, docs, and knowledge base articles. The AI will <strong>only</strong> answer from this content &mdash; no hallucinated responses.
      </p>
      <Link
        href="/knowledge-base"
        onClick={() => localStorage.setItem("onboarding_completed", "true")}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload Knowledge Base
      </Link>
    </div>
  );
}

function StepConfigureAI() {
  return (
    <div className="text-center pt-4">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add Your AI Keys</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        An Anthropic API key is required for the AI to classify tickets and generate responses. You can also add an OpenAI key for embeddings.
      </p>
      <Link
        href="/settings/ai"
        onClick={() => localStorage.setItem("onboarding_completed", "true")}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        Configure AI Keys
      </Link>
    </div>
  );
}

function StepReady() {
  return (
    <div className="text-center pt-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Set!</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Your AI support agent is ready to go. Here&apos;s a quick summary:
      </p>
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Channels</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configure in Settings &gt; Channel Integrations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Knowledge Base</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload docs so the AI knows your product</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">AI Configuration</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add your Anthropic API key in Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
