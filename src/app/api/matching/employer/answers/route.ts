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
    const positionId = searchParams.get("positionId");

    const answers = await prisma.employerMatchingAnswer.findMany({
      where: {
        organizationId,
        positionId: positionId || null,
      },
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
    console.error("雇用者回答取得エラー:", error);
    return NextResponse.json(
      { error: "雇用者回答の取得に失敗しました" },
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
    const { positionId, answers } = body as {
      positionId?: string;
      answers: { questionId: string; answerValue: unknown }[];
    };

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "回答データが必要です" },
        { status: 400 }
      );
    }

    // Verify positionId belongs to organization if provided
    if (positionId) {
      const position = await prisma.position.findFirst({
        where: { id: positionId, organizationId },
      });
      if (!position) {
        return NextResponse.json(
          { error: "指定された募集職種が見つかりません" },
          { status: 400 }
        );
      }
    }

    // Save each answer (find existing + create/update)
    for (const answer of answers) {
      const existing = await prisma.employerMatchingAnswer.findFirst({
        where: {
          organizationId,
          positionId: positionId ?? null,
          questionId: answer.questionId,
        },
      });

      if (existing) {
        await prisma.employerMatchingAnswer.update({
          where: { id: existing.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { answerValue: answer.answerValue as any },
        });
      } else {
        await prisma.employerMatchingAnswer.create({
          data: {
            organizationId,
            positionId: positionId ?? null,
            questionId: answer.questionId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            answerValue: answer.answerValue as any,
          },
        });
      }
    }

    return NextResponse.json({ success: true, savedCount: answers.length });
  } catch (error) {
    console.error("雇用者回答保存エラー:", error);
    return NextResponse.json(
      { error: "雇用者回答の保存に失敗しました" },
      { status: 500 }
    );
  }
}
