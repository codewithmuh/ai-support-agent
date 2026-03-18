"use client";

import { useState } from "react";
import Link from "next/link";

interface Step {
  title: string;
  content: React.ReactNode;
}

const SECTIONS: { title: string; icon: string; steps: Step[] }[] = [
  {
    title: "1. Prerequisites",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    steps: [
      {
        title: "Install Docker & Docker Compose",
        content: (
          <>
            <p>Make sure you have Docker Desktop installed and running.</p>
            <Code>{`# Verify installation\ndocker --version\ndocker compose version`}</Code>
            <p className="mt-2">
              Download from{" "}
              <A href="https://docs.docker.com/get-docker/">docker.com</A> if
              not installed.
            </p>
          </>
        ),
      },
      {
        title: "Install ngrok (for webhooks)",
        content: (
          <>
            <p>Ngrok creates a public URL so WhatsApp/Telegram can reach your local server.</p>
            <Code>{`# macOS\nbrew install ngrok\n\n# Or download from https://ngrok.com/download\nngrok authtoken YOUR_AUTH_TOKEN`}</Code>
          </>
        ),
      },
      {
        title: "Get an Anthropic API Key",
        content: (
          <>
            <p>Sign up at <A href="https://console.anthropic.com/">console.anthropic.com</A> and create an API key.</p>
            <p className="mt-2">This powers the AI classification (Haiku) and response generation (Sonnet).</p>
          </>
        ),
      },
    ],
  },
  {
    title: "2. Project Setup",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    steps: [
      {
        title: "Clone the repository",
        content: <Code>{`git clone https://github.com/codewithmuh/ai-support-agent.git\ncd ai-support-agent`}</Code>,
      },
      {
        title: "Configure environment variables",
        content: (
          <>
            <p>Copy the example env file and fill in your values:</p>
            <Code>{`cp .env.example .env`}</Code>
            <p className="mt-3 font-medium">Required variables:</p>
            <Table
              rows={[
                ["SECRET_KEY", "Any random string", "django-insecure-change-me"],
                ["ANTHROPIC_API_KEY", "From Anthropic console", "sk-ant-api03-..."],
                ["POSTGRES_PASSWORD", "Database password", "changeme"],
                ["DATABASE_URL", "PostgreSQL connection", "postgres://postgres:changeme@db:5432/support_agent"],
              ]}
            />
            <p className="mt-3 font-medium">Optional (add channels later):</p>
            <Table
              rows={[
                ["WHATSAPP_ACCESS_TOKEN", "From Meta Developer Dashboard", "EAA..."],
                ["WHATSAPP_PHONE_NUMBER_ID", "From WhatsApp API Setup", "100956..."],
                ["WHATSAPP_VERIFY_TOKEN", "Any string you make up", "my-verify-token"],
                ["TELEGRAM_BOT_TOKEN", "From @BotFather on Telegram", "123456:ABC..."],
                ["OPENAI_API_KEY", "For real embeddings (optional)", "sk-..."],
              ]}
            />
          </>
        ),
      },
      {
        title: "Start all services",
        content: (
          <>
            <Code>{`docker compose up -d --build`}</Code>
            <p className="mt-2">This starts 4 containers:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>db</strong> — PostgreSQL + pgvector</li>
              <li><strong>redis</strong> — Channel layer for WebSockets</li>
              <li><strong>backend</strong> — Django API server (port 8000)</li>
              <li><strong>frontend</strong> — Next.js dashboard (port 3000)</li>
            </ul>
          </>
        ),
      },
      {
        title: "Run database migrations",
        content: (
          <>
            <Code>{`docker compose exec backend python manage.py migrate`}</Code>
            <p className="mt-2">This creates all the tables: conversations, messages, knowledge_base, escalations, teams, etc.</p>
          </>
        ),
      },
      {
        title: "Create your admin account",
        content: (
          <>
            <Code>{`docker compose exec backend python -c "\nimport os, django\nos.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'\ndjango.setup()\nfrom django.contrib.auth.models import User\nfrom teams.models import Team, TeamMembership\nteam = Team.objects.create(name='My Team', slug='my-team')\nuser = User.objects.create_user(\n    username='admin@example.com',\n    email='admin@example.com',\n    password='admin123'\n)\nTeamMembership.objects.create(user=user, team=team, role='owner')\nprint('Done! Login with admin@example.com / admin123')\n"`}</Code>
          </>
        ),
      },
      {
        title: "Open the dashboard",
        content: (
          <>
            <p>Go to <A href="http://localhost:3000">http://localhost:3000</A> and login with your credentials.</p>
            <Callout type="tip">Enable <strong>Sandbox mode</strong> on the dashboard to see it populated with demo data.</Callout>
          </>
        ),
      },
    ],
  },
  {
    title: "3. Connect WhatsApp",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    steps: [
      {
        title: "Create a Meta Developer App",
        content: (
          <>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <A href="https://developers.facebook.com/">developers.facebook.com</A></li>
              <li>Click <strong>My Apps &rarr; Create App</strong></li>
              <li>Choose <strong>&quot;Connect with customers through WhatsApp&quot;</strong></li>
              <li>Fill in app name and email, click <strong>Create App</strong></li>
            </ol>
          </>
        ),
      },
      {
        title: "Get your credentials",
        content: (
          <>
            <ol className="list-decimal list-inside space-y-2">
              <li>In the app dashboard, go to <strong>WhatsApp &rarr; API Setup</strong></li>
              <li>Copy the <strong>Temporary Access Token</strong> (starts with &quot;EAA...&quot;)</li>
              <li>Copy the <strong>Phone Number ID</strong> (numeric)</li>
              <li>Add these to your <code>.env</code> file or enter them in <strong>Settings &rarr; WhatsApp</strong> in the dashboard</li>
            </ol>
          </>
        ),
      },
      {
        title: "Start ngrok and configure webhook",
        content: (
          <>
            <Code>{`ngrok http 8000`}</Code>
            <p className="mt-2">Copy the ngrok URL (e.g. <code>https://abc123.ngrok-free.app</code>), then:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Go to <strong>WhatsApp &rarr; Configuration</strong> in Meta dashboard</li>
              <li>Set <strong>Callback URL</strong>: <code>{`{ngrok-url}/api/webhooks/whatsapp/`}</code></li>
              <li>Set <strong>Verify Token</strong>: same value as your <code>WHATSAPP_VERIFY_TOKEN</code> env var</li>
              <li>Click <strong>Verify and Save</strong></li>
              <li>Subscribe to the <strong>messages</strong> webhook field</li>
            </ol>
            <Callout type="warning">The ngrok URL changes every time you restart it. Update the webhook URL each time.</Callout>
          </>
        ),
      },
      {
        title: "Test it!",
        content: (
          <>
            <p>Send a message from your phone to the test WhatsApp number. You should see:</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Message logged in backend container (<code>docker compose logs backend -f</code>)</li>
              <li>AI response sent back to your phone</li>
              <li>Conversation appears in the dashboard Tickets page</li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    title: "4. Connect Telegram",
    icon: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    steps: [
      {
        title: "Create a Telegram bot",
        content: (
          <>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code>/newbot</code></li>
              <li>Choose a name and username for your bot</li>
              <li>Copy the <strong>bot token</strong> (looks like <code>123456:ABC-DEF...</code>)</li>
            </ol>
          </>
        ),
      },
      {
        title: "Configure the bot token",
        content: (
          <>
            <p>Either add to <code>.env</code>:</p>
            <Code>{`TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`}</Code>
            <p className="mt-2">Or enter it in <strong>Settings &rarr; Telegram</strong> in the dashboard.</p>
          </>
        ),
      },
      {
        title: "Set the webhook",
        content: (
          <>
            <p>Make sure ngrok is running, then set the webhook URL:</p>
            <Code>{`curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/setWebhook?url={NGROK_URL}/api/webhooks/telegram/"`}</Code>
            <p className="mt-2">You should get: <code>{`{"ok":true,"description":"Webhook was set"}`}</code></p>
          </>
        ),
      },
      {
        title: "Test it!",
        content: (
          <p>Search for your bot on Telegram and send a message. The AI will respond automatically.</p>
        ),
      },
    ],
  },
  {
    title: "5. Connect Gmail",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    steps: [
      {
        title: "Set up Google Cloud credentials",
        content: (
          <>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <A href="https://console.cloud.google.com/">Google Cloud Console</A></li>
              <li>Create a project and enable the <strong>Gmail API</strong></li>
              <li>Go to <strong>APIs &amp; Services &rarr; Credentials</strong></li>
              <li>Create <strong>OAuth client ID</strong> (Desktop app type)</li>
              <li>Download the JSON file and place it at <code>google-credentials.json</code> in the project root</li>
            </ol>
          </>
        ),
      },
      {
        title: "Configure environment",
        content: (
          <>
            <Code>{`GOOGLE_CREDENTIALS_PATH=/app/google-credentials.json\nGMAIL_WATCH_ADDRESS=your-email@gmail.com`}</Code>
            <p className="mt-2">Or configure via <strong>Settings &rarr; Gmail</strong> in the dashboard.</p>
          </>
        ),
      },
      {
        title: "Poll for emails",
        content: (
          <>
            <p>Gmail uses polling (not webhooks). Trigger it manually or set up a cron:</p>
            <Code>{`# Manual poll\ncurl -X POST http://localhost:8000/api/email/poll/\n\n# Or set up a cron job to poll every 2 minutes`}</Code>
          </>
        ),
      },
    ],
  },
  {
    title: "6. Add Knowledge Base",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    steps: [
      {
        title: "Why knowledge base matters",
        content: (
          <p>The AI only answers from your knowledge base context. Without it, every query will be escalated or get a generic response. Add your FAQs, product docs, and policies.</p>
        ),
      },
      {
        title: "Upload via dashboard",
        content: (
          <>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>Knowledge Base</strong> in the sidebar</li>
              <li>Click <strong>Upload Document</strong></li>
              <li>Select a <code>.txt</code>, <code>.md</code>, or <code>.pdf</code> file</li>
              <li>Choose a category (billing, technical, account, general)</li>
              <li>The file is auto-chunked and embedded for semantic search</li>
            </ol>
          </>
        ),
      },
      {
        title: "Upload via API",
        content: (
          <Code>{`curl -X POST http://localhost:8000/api/knowledge-base/upload/ \\\n  -F "file=@faq.txt" \\\n  -F "category=general"`}</Code>
        ),
      },
      {
        title: "Verify it works",
        content: (
          <p>Send a message that matches your knowledge base content. The AI should respond with accurate information from the KB instead of escalating.</p>
        ),
      },
    ],
  },
  {
    title: "7. How It Works (Architecture)",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    steps: [
      {
        title: "Message flow",
        content: (
          <div className="space-y-3">
            <FlowStep n={1} title="Customer sends message" desc="Via WhatsApp, Telegram, Email, or Web Chat" />
            <FlowArrow />
            <FlowStep n={2} title="Backend normalizes message" desc="All channels feed into a UnifiedMessage format" />
            <FlowArrow />
            <FlowStep n={3} title="Claude Haiku classifies" desc="Determines category (billing/technical/account/general) with confidence score" />
            <FlowArrow />
            <FlowStep n={4} title="Escalation check" desc="If confidence < 0.7, negative sentiment, or human requested → escalate to dashboard" />
            <FlowArrow />
            <FlowStep n={5} title="Knowledge base search" desc="pgvector finds the most relevant FAQ/doc chunks via semantic search" />
            <FlowArrow />
            <FlowStep n={6} title="Claude Sonnet generates response" desc="Using KB context only — constrained to not hallucinate" />
            <FlowArrow />
            <FlowStep n={7} title="Guardrail check" desc="Verifies no fabricated policies, prices, or guarantees" />
            <FlowArrow />
            <FlowStep n={8} title="Response sent back" desc="Via the same channel the customer used" />
          </div>
        ),
      },
      {
        title: "Escalation triggers",
        content: (
          <ul className="space-y-2">
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">1.</span> Classification confidence below 0.7</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">2.</span> Negative/frustrated customer sentiment detected</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">3.</span> Customer explicitly asks for a human (&quot;talk to a person&quot;, &quot;speak to manager&quot;)</li>
          </ul>
        ),
      },
    ],
  },
  {
    title: "8. API Reference",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    steps: [
      {
        title: "Core endpoints",
        content: (
          <EndpointTable
            rows={[
              ["POST", "/api/process/", "Send a message through the AI pipeline"],
              ["GET", "/api/conversations/", "List all conversations"],
              ["GET", "/api/conversations/:id/", "Get conversation with messages"],
              ["POST", "/api/conversations/:id/reply/", "Send manual agent reply"],
              ["GET", "/api/knowledge/", "List knowledge base entries"],
              ["POST", "/api/knowledge-base/upload/", "Upload a document to KB"],
            ]}
          />
        ),
      },
      {
        title: "Escalation endpoints",
        content: (
          <EndpointTable
            rows={[
              ["GET", "/api/escalations/", "List all escalations"],
              ["POST", "/api/escalations/:id/resolve/", "Resolve an escalation"],
              ["GET", "/api/escalations/dashboard/stats/", "Dashboard statistics"],
            ]}
          />
        ),
      },
      {
        title: "Auth & team endpoints",
        content: (
          <EndpointTable
            rows={[
              ["POST", "/api/auth/signup/", "Create account + team"],
              ["POST", "/api/auth/login/", "Login, get JWT token"],
              ["POST", "/api/auth/refresh/", "Refresh JWT token"],
              ["GET", "/api/team/", "Get current team"],
              ["GET/POST/PUT", "/api/team/whatsapp/", "WhatsApp config"],
              ["GET/POST/PUT", "/api/team/telegram/", "Telegram config"],
              ["GET/POST/PUT", "/api/team/gmail/", "Gmail config"],
            ]}
          />
        ),
      },
      {
        title: "Webhook endpoints (no auth required)",
        content: (
          <EndpointTable
            rows={[
              ["GET/POST", "/api/webhooks/whatsapp/", "WhatsApp Cloud API webhook"],
              ["POST", "/api/webhooks/telegram/", "Telegram Bot API webhook"],
              ["POST", "/api/webhooks/email/", "Email webhook (if using push)"],
            ]}
          />
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300">
      {children}
    </a>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 bg-gray-900 dark:bg-slate-950 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Variable</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Description</th>
            <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([v, d, e]) => (
            <tr key={v} className="border-b border-gray-50 dark:border-slate-700/50">
              <td className="py-2 pr-4 font-mono text-indigo-600 dark:text-indigo-400">{v}</td>
              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{d}</td>
              <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{e}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-24">Method</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Path</th>
            <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([m, p, d]) => (
            <tr key={p} className="border-b border-gray-50 dark:border-slate-700/50">
              <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-mono font-medium">{m}</span></td>
              <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">{p}</td>
              <td className="py-2 text-gray-500 dark:text-gray-400">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ type, children }: { type: "tip" | "warning"; children: React.ReactNode }) {
  const styles = {
    tip: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
  };
  const icons = {
    tip: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  };
  return (
    <div className={`mt-3 p-3 rounded-lg border text-xs ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
        </svg>
        <div>{children}</div>
      </div>
    </div>
  );
}

function FlowStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
        {n}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center">
      <svg className="w-4 h-4 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function Section({ section, defaultOpen }: { section: (typeof SECTIONS)[number]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={section.icon} />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{section.title}</h3>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          {section.steps.map((step, i) => (
            <div key={i} className="pl-12">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-slate-700 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center justify-center">
                  {i + 1}
                </span>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{step.title}</h4>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Architecture flow diagram — lightweight arrow-based
// ---------------------------------------------------------------------------

function FlowDiagram() {
  const nodes: { label: string; color: string; dot: string }[] = [
    { label: "Customer Message", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    { label: "Normalize", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
    { label: "Classify (Haiku)", color: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
    { label: "Escalation Check", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    { label: "KB Search", color: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500" },
    { label: "Generate (Sonnet)", color: "text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500" },
    { label: "Guardrails", color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
    { label: "Send Response", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  ];

  return (
    <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-5">Message Flow</h2>

      {/* Main flow — single horizontal line with dots */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-[11px] left-3 right-3 h-[2px] bg-gray-200 dark:bg-slate-700" />

        <div className="relative flex justify-between">
          {nodes.map((node, i) => (
            <div key={i} className="flex flex-col items-center w-0 flex-1">
              <div className={`w-6 h-6 rounded-full ${node.dot} border-[3px] border-white dark:border-slate-800 relative z-10 shadow-sm`} />
              <p className={`text-[10px] font-semibold mt-2 text-center leading-tight ${node.color}`}>
                {node.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation branch */}
      <div className="mt-6 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
          </svg>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          At step 4: if confidence &lt; 0.7, angry customer, or human requested →
          <span className="font-semibold text-amber-600 dark:text-amber-400"> escalates to human agent dashboard</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel cards
// ---------------------------------------------------------------------------

function ChannelCards() {
  const channels = [
    { name: "WhatsApp", icon: "💚", color: "from-green-400 to-emerald-500", desc: "Business Cloud API" },
    { name: "Telegram", icon: "💙", color: "from-sky-400 to-blue-500", desc: "Bot API" },
    { name: "Email", icon: "📧", color: "from-red-400 to-rose-500", desc: "Gmail API" },
    { name: "Web Chat", icon: "🌐", color: "from-violet-400 to-purple-500", desc: "WebSocket" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
      {channels.map((ch) => (
        <div key={ch.name} className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center group hover:shadow-md transition-shadow">
          <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ch.color}`} />
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{ch.icon}</div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ch.name}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{ch.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <div className="p-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documentation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Setup, configure, and start using the AI Support Agent</p>
          </div>
        </div>
      </div>

      {/* Architecture Flow Diagram */}
      <FlowDiagram />

      {/* Supported Channels */}
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Supported Channels</h3>
      <ChannelCards />

      {/* Quick start */}
      <div className="mb-6 rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-800">
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-500">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Start — 3 Commands
          </h2>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5">
          <pre className="bg-gray-900 dark:bg-slate-950 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">{`cp .env.example .env    # Edit with your ANTHROPIC_API_KEY\ndocker compose up -d --build\ndocker compose exec backend python manage.py migrate`}</pre>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Then open <A href="http://localhost:3000">localhost:3000</A>, create an account, and you&apos;re ready to go.
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Guide Sections</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SECTIONS.map((s, i) => {
            const colors = [
              "text-emerald-600 dark:text-emerald-400",
              "text-blue-600 dark:text-blue-400",
              "text-green-600 dark:text-green-400",
              "text-sky-600 dark:text-sky-400",
              "text-red-600 dark:text-red-400",
              "text-violet-600 dark:text-violet-400",
              "text-indigo-600 dark:text-indigo-400",
              "text-amber-600 dark:text-amber-400",
            ];
            return (
              <span key={i} className={`text-sm font-medium ${colors[i] || "text-gray-600 dark:text-gray-400"}`}>
                {s.title}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map((section, i) => (
          <Section key={i} section={section} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center py-6 border-t border-gray-100 dark:border-slate-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Built for the <strong>CodeWithMuh</strong> YouTube tutorial.{" "}
          <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}
