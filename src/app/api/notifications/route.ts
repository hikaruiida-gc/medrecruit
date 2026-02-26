import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "20", 10))
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10)
    );

    const where: Record<string, unknown> = { organizationId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.notification.count({
        where: { organizationId, isRead: false },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ notifications, unreadCount, total });
  } catch (error) {
    console.error("通知一覧取得エラー:", error);
    return NextResponse.json(
      { error: "通知一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const body = await req.json();
    const { notificationIds, markAllRead } = body;

    let updatedCount = 0;

    if (markAllRead) {
      const result = await prisma.notification.updateMany({
        where: { organizationId, isRead: false },
        data: { isRead: true },
      });
      updatedCount = result.count;
    } else if (
      Array.isArray(notificationIds) &&
      notificationIds.length > 0
    ) {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          organizationId,
        },
        data: { isRead: true },
      });
      updatedCount = result.count;
    } else {
      return NextResponse.json(
        { error: "notificationIds または markAllRead を指定してください" },
        { status: 400 }
      );
    }

    return NextResponse.json({ updatedCount });
  } catch (error) {
    console.error("通知更新エラー:", error);
    return NextResponse.json(
      { error: "通知の更新に失敗しました" },
      { status: 500 }
    );
  }
}
