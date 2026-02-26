"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NotificationSettings {
  NEW_APPLICANT: boolean;
  STATUS_CHANGED: boolean;
  INTERVIEW_SCHEDULED: boolean;
  INTERVIEW_COMPLETED: boolean;
  COMPATIBILITY_CALCULATED: boolean;
}

const settingLabels: Record<keyof NotificationSettings, { label: string; description: string }> = {
  NEW_APPLICANT: {
    label: "新規応募者",
    description: "新しい応募者が登録された時に通知します",
  },
  STATUS_CHANGED: {
    label: "ステータス変更",
    description: "応募者のステータスが変更された時に通知します",
  },
  INTERVIEW_SCHEDULED: {
    label: "面接予定",
    description: "新しい面接が予定された時に通知します",
  },
  INTERVIEW_COMPLETED: {
    label: "面接完了",
    description: "面接が完了した時に通知します",
  },
  COMPATIBILITY_CALCULATED: {
    label: "相性診断完了",
    description: "応募者の相性診断が完了した時に通知します",
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    NEW_APPLICANT: true,
    STATUS_CHANGED: true,
    INTERVIEW_SCHEDULED: true,
    INTERVIEW_COMPLETED: true,
    COMPATIBILITY_CALCULATED: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notifications/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("通知設定取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        toast.success("通知設定を保存しました");
      } else {
        toast.error("通知設定の保存に失敗しました");
      }
    } catch (error) {
      console.error("通知設定保存エラー:", error);
      toast.error("通知設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#769FCD]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">通知設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          受け取る通知の種類を設定できます
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-[#769FCD]" />
            アプリ内通知
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(
            Object.keys(settingLabels) as Array<keyof NotificationSettings>
          ).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between py-2"
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor={key}
                  className="text-sm font-medium text-gray-800 cursor-pointer"
                >
                  {settingLabels[key].label}
                </Label>
                <p className="text-xs text-gray-500">
                  {settingLabels[key].description}
                </p>
              </div>
              <Switch
                id={key}
                checked={settings[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-400 mb-4">
              ※
              メール通知は今後対応予定です。現在はアプリ内通知のみです。
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
