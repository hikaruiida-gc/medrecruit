import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const defaultSettings = {
  NEW_APPLICANT: true,
  STATUS_CHANGED: true,
  INTERVIEW_SCHEDULED: true,
  INTERVIEW_COMPLETED: true,
  COMPATIBILITY_CALCULATED: true,
};

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  // For now, return default settings.
  // In the future, these would be stored per organization.
  return NextResponse.json({ settings: defaultSettings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const body = await req.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "設定データが無効です" },
        { status: 400 }
      );
    }

    // For now, just acknowledge the settings.
    // In the future, save to database.
    console.log("通知設定保存（未実装）:", settings);

    return NextResponse.json({
      success: true,
      settings: { ...defaultSettings, ...settings },
    });
  } catch (error) {
    console.error("通知設定保存エラー:", error);
    return NextResponse.json(
      { error: "通知設定の保存に失敗しました" },
      { status: 500 }
    );
  }
}
