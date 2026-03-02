import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMatchingResult } from "@/lib/matching/scoring";
import { generateReportComments } from "@/lib/matching/report";
import type { DimensionId, QuestionPair, ScaleType } from "@/lib/matching/types";

/** Convert Prisma enum QuestionInputType to lowercase ScaleType */
function toScaleType(inputType: string): ScaleType {
  const map: Record<string, ScaleType> = {
    LIKERT7: "likert7",
    PRIORITY: "priority",
    RANGE_SELECT: "range_select",
    NUMERIC: "numeric",
  };
  return map[inputType] ?? "likert7";
}

/** Convert Prisma MatchingDimension enum to lowercase DimensionId */
function toDimensionId(dimension: string): DimensionId {
  const map: Record<string, DimensionId> = {
    PO: "po",
    PJ_DA: "pj_da",
    PJ_NS: "pj_ns",
    PG: "pg",
    PS: "ps",
  };
  return map[dimension] ?? "po";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const body = await req.json();
    const { applicantId, positionId } = body as {
      applicantId: string;
      positionId?: string;
    };

    if (!applicantId) {
      return NextResponse.json(
        { error: "applicantIdは必須です" },
        { status: 400 }
      );
    }

    // 1. Verify applicant belongs to org
    const applicant = await prisma.applicant.findFirst({
      where: { id: applicantId, organizationId },
    });
    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    // 2. Fetch all active matching questions
    const allQuestions = await prisma.matchingQuestion.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    // 3. Fetch employer answers (position-specific first, fallback to positionId=null)
    let employerAnswers = positionId
      ? await prisma.employerMatchingAnswer.findMany({
          where: { organizationId, positionId },
        })
      : [];

    // If no position-specific answers found, or no positionId, fallback to default (null)
    if (employerAnswers.length === 0) {
      employerAnswers = await prisma.employerMatchingAnswer.findMany({
        where: { organizationId, positionId: null },
      });
    }

    // 4. Fetch jobseeker answers for applicant
    const jobseekerAnswers = await prisma.jobseekerMatchingAnswer.findMany({
      where: { applicantId },
    });

    // Build lookup maps
    const employerAnswerMap = new Map(
      employerAnswers.map((a) => [a.questionId, a.answerValue])
    );
    const jobseekerAnswerMap = new Map(
      jobseekerAnswers.map((a) => [a.questionId, a.answerValue])
    );

    // Build question lookup by code
    const questionByCode = new Map(
      allQuestions.map((q) => [q.code, q])
    );

    // 5. Build QuestionPair[] by matching employer/jobseeker questions via pairCode
    const pairs: QuestionPair[] = [];

    // Get employer-side questions
    const employerQuestions = allQuestions.filter((q) => q.side === "EMPLOYER");

    for (const empQ of employerQuestions) {
      if (!empQ.pairCode) continue;

      // Find the paired jobseeker question by code matching the pairCode
      const jsQ = questionByCode.get(empQ.pairCode);
      if (!jsQ) continue;

      const pair: QuestionPair = {
        questionId: empQ.id,
        dimension: toDimensionId(empQ.dimension),
        scaleType: toScaleType(empQ.inputType),
        employerAnswer: (employerAnswerMap.get(empQ.id) as Record<string, unknown>) ?? null,
        jobseekerAnswer: (jobseekerAnswerMap.get(jsQ.id) as Record<string, unknown>) ?? null,
      };

      pairs.push(pair);
    }

    // 6. Calculate matching result
    const result = calculateMatchingResult(pairs);

    // 7. Generate report comments
    const comments = generateReportComments(result);

    // 8. Find existing or create MatchingResult in DB
    const scoreData = {
      totalScore: result.totalScore,
      poScore: result.dimensionScores.po.score,
      pjDaScore: result.dimensionScores.pj_da.score,
      pjNsScore: result.dimensionScores.pj_ns.score,
      pgScore: result.dimensionScores.pg.score,
      psScore: result.dimensionScores.ps.score,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dimensionDetail: result as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      comments: comments as any,
      calculatedAt: new Date(),
    };

    const existing = await prisma.matchingResult.findFirst({
      where: {
        organizationId,
        applicantId,
        positionId: positionId ?? null,
      },
    });

    const matchingResult = existing
      ? await prisma.matchingResult.update({
          where: { id: existing.id },
          data: scoreData,
        })
      : await prisma.matchingResult.create({
          data: {
            organizationId,
            applicantId,
            positionId: positionId ?? null,
            ...scoreData,
          },
        });

    // 9. Update Applicant.compatibilityScore for backward compat
    await prisma.applicant.update({
      where: { id: applicantId },
      data: { compatibilityScore: result.totalScore },
    });

    return NextResponse.json({
      ...matchingResult,
      level: result.level,
      strengths: result.strengths,
      concerns: result.concerns,
    });
  } catch (error) {
    console.error("マッチング計算エラー:", error);
    return NextResponse.json(
      { error: "マッチングスコアの計算に失敗しました" },
      { status: 500 }
    );
  }
}
