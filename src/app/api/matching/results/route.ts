import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const VALID_SORT_FIELDS = [
  "totalScore",
  "poScore",
  "pjDaScore",
  "pjNsScore",
  "pgScore",
  "psScore",
  "calculatedAt",
] as const;

type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const positionId = searchParams.get("positionId");
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const sort = searchParams.get("sort") || "totalScore";
    const order = searchParams.get("order") || "desc";

    // Build where clause
    const where: Prisma.MatchingResultWhereInput = { organizationId };

    if (positionId) {
      where.positionId = positionId;
    }

    if (minScore || maxScore) {
      where.totalScore = {};
      if (minScore) {
        (where.totalScore as Prisma.FloatFilter).gte = parseFloat(minScore);
      }
      if (maxScore) {
        (where.totalScore as Prisma.FloatFilter).lte = parseFloat(maxScore);
      }
    }

    // Validate sort field
    const sortField: SortField = VALID_SORT_FIELDS.includes(sort as SortField)
      ? (sort as SortField)
      : "totalScore";
    const sortOrder: "asc" | "desc" = order === "asc" ? "asc" : "desc";

    const matchingResults = await prisma.matchingResult.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { [sortField]: sortOrder },
    });

    const results = matchingResults.map((r) => ({
      applicantId: r.applicantId,
      applicantName: `${r.applicant.lastName} ${r.applicant.firstName}`,
      positionTitle: r.position?.title ?? null,
      status: r.applicant.status,
      totalScore: r.totalScore,
      poScore: r.poScore,
      pjDaScore: r.pjDaScore,
      pjNsScore: r.pjNsScore,
      pgScore: r.pgScore,
      psScore: r.psScore,
      calculatedAt: r.calculatedAt,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("マッチング結果一覧取得エラー:", error);
    return NextResponse.json(
      { error: "マッチング結果一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
