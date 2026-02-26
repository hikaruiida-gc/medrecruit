import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InterviewType, InterviewStatus } from "@prisma/client";

async function verifyInterviewAccess(interviewId: string, organizationId: string) {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      applicant: {
        select: { organizationId: true },
      },
    },
  });

  if (!interview) {
    return { error: "面接が見つかりません", status: 404 as const, interview: null };
  }

  if (interview.applicant.organizationId !== organizationId) {
    return { error: "アクセス権限がありません", status: 403 as const, interview: null };
  }

  return { error: null, status: 200 as const, interview };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const { id } = await params;
    const result = await verifyInterviewAccess(id, organizationId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.interview);
  } catch (error) {
    console.error("面接取得エラー:", error);
    return NextResponse.json(
      { error: "面接の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const { id } = await params;
    const result = await verifyInterviewAccess(id, organizationId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await req.json();
    const { scheduledAt, type, interviewerName, notes, rating, status } = body;

    if (
      type !== undefined &&
      !Object.values(InterviewType).includes(type as InterviewType)
    ) {
      return NextResponse.json(
        { error: "無効な面接タイプです" },
        { status: 400 }
      );
    }

    if (
      status !== undefined &&
      !Object.values(InterviewStatus).includes(status as InterviewStatus)
    ) {
      return NextResponse.json(
        { error: "無効なステータスです" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (type !== undefined) updateData.type = type as InterviewType;
    if (interviewerName !== undefined)
      updateData.interviewerName = interviewerName || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (rating !== undefined)
      updateData.rating = rating != null ? parseInt(String(rating), 10) : null;
    if (status !== undefined) updateData.status = status as InterviewStatus;

    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(interview);
  } catch (error) {
    console.error("面接更新エラー:", error);
    return NextResponse.json(
      { error: "面接の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const { id } = await params;
    const result = await verifyInterviewAccess(id, organizationId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.interview.delete({ where: { id } });

    return NextResponse.json({ message: "面接を削除しました" });
  } catch (error) {
    console.error("面接削除エラー:", error);
    return NextResponse.json(
      { error: "面接の削除に失敗しました" },
      { status: 500 }
    );
  }
}
