import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicantStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!status) {
      return NextResponse.json({ error: "ステータスは必須項目です" }, { status: 400 });
    }

    if (!Object.values(ApplicantStatus).includes(status as ApplicantStatus)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    const existing = await prisma.applicant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "応募者が見つかりません" }, { status: 404 });
    }
    if (existing.organizationId !== organizationId) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    if (existing.status === status) {
      return NextResponse.json({ error: "現在のステータスと同じです" }, { status: 400 });
    }

    const userName = session.user.name || "システム";

    const applicant = await prisma.$transaction(async (tx) => {
      await tx.statusHistory.create({
        data: {
          applicantId: id,
          fromStatus: existing.status,
          toStatus: status as ApplicantStatus,
          changedBy: userName,
          note: note || null,
        },
      });

      return tx.applicant.update({
        where: { id },
        data: { status: status as ApplicantStatus },
        include: {
          position: {
            select: { id: true, title: true },
          },
          interviews: {
            orderBy: { scheduledAt: "desc" },
          },
          statusHistory: {
            orderBy: { changedAt: "desc" },
          },
        },
      });
    });

    await createNotification({
      organizationId,
      type: "STATUS_CHANGED",
      title: "ステータス変更",
      message: `${applicant.lastName} ${applicant.firstName}さんのステータスが変更されました`,
      relatedId: id,
      relatedType: "applicant",
    });

    return NextResponse.json(applicant);
  } catch (error) {
    console.error("ステータス更新エラー:", error);
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 });
  }
}
