"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  UserPlus,
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Heart,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  relatedType: string | null;
  isRead: boolean;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "NEW_APPLICANT":
      return <UserPlus className="w-4 h-4 text-[#4A7FB5]" />;
    case "STATUS_CHANGED":
      return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
    case "INTERVIEW_SCHEDULED":
      return <Calendar className="w-4 h-4 text-green-500" />;
    case "INTERVIEW_COMPLETED":
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case "COMPATIBILITY_CALCULATED":
      return <Heart className="w-4 h-4 text-pink-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 30) return `${diffDays}日前`;
  return `${Math.floor(diffDays / 30)}ヶ月前`;
}

function getNotificationLink(notification: Notification): string | null {
  if (!notification.relatedId || !notification.relatedType) return null;
  switch (notification.relatedType) {
    case "applicant":
      return `/applicants/${notification.relatedId}`;
    case "interview":
      return null; // Interviews are viewed within applicant detail
    case "position":
      return `/positions`;
    default:
      return null;
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("通知取得エラー:", error);
    }
  }, []);

  // Initial fetch and polling every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refresh when popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("既読処理エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("既読処理エラー:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="通知"
        >
          <Bell className="w-5 h-5 text-[#769FCD]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#F7FBFC]">
          <h3 className="text-sm font-semibold text-gray-800">通知</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={markAllRead}
              disabled={loading}
              className="text-xs text-[#4A7FB5] hover:text-[#769FCD]"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "すべて既読にする"
              )}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Bell className="w-8 h-8 mb-2" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#F7FBFC] cursor-pointer ${
                      !notification.isRead ? "bg-[#D6E6F2]/30" : ""
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#4A7FB5] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1" suppressHydrationWarning>
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                if (link) {
                  return (
                    <Link
                      key={notification.id}
                      href={link}
                      onClick={() => setOpen(false)}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="border-t px-4 py-2 bg-[#F7FBFC]">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="text-xs text-[#4A7FB5] hover:text-[#769FCD] hover:underline"
          >
            通知設定
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
