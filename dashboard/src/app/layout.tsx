import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { NotificationProvider } from "@/lib/notifications";
import { LayoutShell } from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Support Agent Dashboard",
  description: "AI Support Agent Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <LayoutShell>{children}</LayoutShell>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
