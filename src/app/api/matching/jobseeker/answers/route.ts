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
    const applicantId = searchParams.get("applicantId");

    if (!applicantId) {
      return NextResponse.json(
        { error: "applicantIdは必須です" },
        { status: 400 }
      );
    }

    // Verify applicant belongs to organization
    const applicant = await prisma.applicant.findFirst({
      where: { id: applicantId, organizationId },
    });
    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    const answers = await prisma.jobseekerMatchingAnswer.findMany({
      where: { applicantId },
      select: {
        questionId: true,
        answerValue: true,
      },
    });

    return NextResponse.json({
      answers: answers.map((a) => ({
        questionId: a.questionId,
        answerValue: a.answerValue,
      })),
    });
  } catch (error) {
    console.error("求職者回答取得エラー:", error);
    return NextResponse.json(
      { error: "求職者回答の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const body = await req.json();
    const { applicantId, answers } = body as {
      applicantId: string;
      answers: { questionId: string; answerValue: unknown }[];
    };

    if (!applicantId) {
      return NextResponse.json(
        { error: "applicantIdは必須です" },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "回答データが必要です" },
        { status: 400 }
      );
    }

    // Verify applicant belongs to organization
    const applicant = await prisma.applicant.findFirst({
      where: { id: applicantId, organizationId },
    });
    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    // Upsert each answer
    const upserts = answers.map((answer) =>
      prisma.jobseekerMatchingAnswer.upsert({
        where: {
          applicantId_questionId: {
            applicantId,
            questionId: answer.questionId,
          },
        },
        update: {
          answerValue: answer.answerValue as Parameters<typeof prisma.jobseekerMatchingAnswer.update>[0]["data"]["answerValue"],
        },
        create: {
          applicantId,
          questionId: answer.questionId,
          answerValue: answer.answerValue as Parameters<typeof prisma.jobseekerMatchingAnswer.create>[0]["data"]["answerValue"],
        },
      })
    );

    await prisma.$transaction(upserts);

    return NextResponse.json({ success: true, savedCount: answers.length });
  } catch (error) {
    console.error("求職者回答保存エラー:", error);
    return NextResponse.json(
      { error: "求職者回答の保存に失敗しました" },
      { status: 500 }
    );
  }
}
