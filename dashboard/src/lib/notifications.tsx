"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { API_URL } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: "new_ticket" | "new_message" | "escalation";
  conversationId?: string;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Simple notification sound (base64 encoded short beep)
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.stop(audioCtx.currentTime + 0.3);

    // Second beep
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.value = 1000;
      osc2.type = "sine";
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc2.stop(audioCtx.currentTime + 0.3);
    }, 150);
  } catch {
    // Audio not available
  }
}

function requestBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    });
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastTicketCountRef = useRef<number | null>(null);
  const lastEscalatedCountRef = useRef<number | null>(null);

  // Load sound preference
  useEffect(() => {
    const saved = localStorage.getItem("notif_sound");
    if (saved !== null) setSoundEnabled(saved === "true");

    // Request browser notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("notif_sound", String(next));
      return next;
    });
  }, []);

  const addNotification = useCallback(
    (notif: Omit<Notification, "id" | "timestamp">) => {
      const newNotif: Notification = {
        ...notif,
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
      };

      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));

      if (soundEnabled) playNotificationSound();

      // Browser notification if tab not focused
      if (document.hidden) {
        requestBrowserNotification(notif.title, notif.body);
      }
    },
    [soundEnabled]
  );

  // Poll for new tickets/escalations every 10 seconds
  useEffect(() => {
    const poll = () => {
      fetch(`${API_URL}/api/escalations/dashboard/stats/`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;

          const totalOpen = (data.total_open || 0) + (data.total_escalated || 0);
          const escalated = data.total_escalated || 0;

          // First load — just set the baseline
          if (lastTicketCountRef.current === null) {
            lastTicketCountRef.current = totalOpen;
            lastEscalatedCountRef.current = escalated;
            return;
          }

          // New ticket
          if (totalOpen > lastTicketCountRef.current) {
            const diff = totalOpen - lastTicketCountRef.current;
            addNotification({
              title: "New Ticket",
              body: `${diff} new ticket${diff > 1 ? "s" : ""} received`,
              type: "new_ticket",
            });
          }

          // New escalation
          if (escalated > lastEscalatedCountRef.current!) {
            const diff = escalated - lastEscalatedCountRef.current!;
            addNotification({
              title: "Escalation Alert",
              body: `${diff} ticket${diff > 1 ? "s" : ""} escalated — needs human attention`,
              type: "escalation",
            });
          }

          lastTicketCountRef.current = totalOpen;
          lastEscalatedCountRef.current = escalated;
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [addNotification]);

  // Update page title with unread count
  useEffect(() => {
    const unread = notifications.length;
    if (unread > 0) {
      document.title = `(${unread}) Support Agent Dashboard`;
    } else {
      document.title = "Support Agent Dashboard";
    }
  }, [notifications]);

  const clearNotifications = useCallback(() => setNotifications([]), []);
  const dismissNotification = useCallback(
    (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id)),
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        clearNotifications,
        dismissNotification,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
