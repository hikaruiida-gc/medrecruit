import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InterviewType } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const applicantId = searchParams.get("applicantId");

    if (!applicantId) {
      return NextResponse.json(
        { error: "applicantIdは必須パラメータです" },
        { status: 400 }
      );
    }

    // Verify applicant belongs to user's organization
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { organizationId: true },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    if (applicant.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const interviews = await prisma.interview.findMany({
      where: { applicantId },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("面接一覧取得エラー:", error);
    return NextResponse.json(
      { error: "面接一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const body = await req.json();
    const { applicantId, scheduledAt, type, interviewerName } = body;

    if (!applicantId || !scheduledAt) {
      return NextResponse.json(
        { error: "応募者IDと面接日時は必須です" },
        { status: 400 }
      );
    }

    if (
      type &&
      !Object.values(InterviewType).includes(type as InterviewType)
    ) {
      return NextResponse.json(
        { error: "無効な面接タイプです" },
        { status: 400 }
      );
    }

    // Verify applicant belongs to user's organization
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { organizationId: true, lastName: true, firstName: true },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    if (applicant.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const interview = await prisma.interview.create({
      data: {
        applicantId,
        scheduledAt: new Date(scheduledAt),
        type: (type as InterviewType) || "IN_PERSON",
        interviewerName: interviewerName || null,
        status: "SCHEDULED",
      },
    });

    await createNotification({
      organizationId: applicant.organizationId,
      type: "INTERVIEW_SCHEDULED",
      title: "面接予定",
      message: `${applicant.lastName} ${applicant.firstName}さんの面接が予定されました`,
      relatedId: interview.id,
      relatedType: "interview",
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    console.error("面接作成エラー:", error);
    return NextResponse.json(
      { error: "面接の作成に失敗しました" },
      { status: 500 }
    );
  }
}
