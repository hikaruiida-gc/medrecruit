import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MatchingDimension, QuestionSide } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const side = searchParams.get("side");
    const dimension = searchParams.get("dimension");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { isActive: true };

    if (side) {
      if (!Object.values(QuestionSide).includes(side as QuestionSide)) {
        return NextResponse.json(
          { error: "無効なsideです。EMPLOYER または JOBSEEKER を指定してください" },
          { status: 400 }
        );
      }
      where.side = side as QuestionSide;
    }

    if (dimension) {
      if (
        !Object.values(MatchingDimension).includes(
          dimension as MatchingDimension
        )
      ) {
        return NextResponse.json(
          { error: "無効なdimensionです" },
          { status: 400 }
        );
      }
      where.dimension = dimension as MatchingDimension;
    }

    const questions = await prisma.matchingQuestion.findMany({
      where,
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("マッチング質問取得エラー:", error);
    return NextResponse.json(
      { error: "マッチング質問の取得に失敗しました" },
      { status: 500 }
    );
  }
}
