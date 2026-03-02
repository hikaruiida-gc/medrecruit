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
    const { applicantIds, positionId } = body as {
      applicantIds: string[];
      positionId?: string;
    };

    if (!applicantIds || !Array.isArray(applicantIds) || applicantIds.length === 0) {
      return NextResponse.json(
        { error: "applicantIdsは必須です" },
        { status: 400 }
      );
    }

    // Fetch shared data once for all applicants
    const allQuestions = await prisma.matchingQuestion.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
    });

    // Employer answers: position-specific first, fallback to null
    let employerAnswers = positionId
      ? await prisma.employerMatchingAnswer.findMany({
          where: { organizationId, positionId },
        })
      : [];

    if (employerAnswers.length === 0) {
      employerAnswers = await prisma.employerMatchingAnswer.findMany({
        where: { organizationId, positionId: null },
      });
    }

    const employerAnswerMap = new Map(
      employerAnswers.map((a) => [a.questionId, a.answerValue])
    );

    const questionByCode = new Map(
      allQuestions.map((q) => [q.code, q])
    );

    const employerQuestions = allQuestions.filter((q) => q.side === "EMPLOYER");

    const results: { applicantId: string; totalScore: number; error?: string }[] = [];

    for (const applicantId of applicantIds) {
      try {
        // Verify applicant belongs to org
        const applicant = await prisma.applicant.findFirst({
          where: { id: applicantId, organizationId },
        });
        if (!applicant) {
          results.push({ applicantId, totalScore: 0, error: "応募者が見つかりません" });
          continue;
        }

        // Fetch jobseeker answers for this applicant
        const jobseekerAnswers = await prisma.jobseekerMatchingAnswer.findMany({
          where: { applicantId },
        });

        const jobseekerAnswerMap = new Map(
          jobseekerAnswers.map((a) => [a.questionId, a.answerValue])
        );

        // Build QuestionPair[]
        const pairs: QuestionPair[] = [];

        for (const empQ of employerQuestions) {
          if (!empQ.pairCode) continue;
          const jsQ = questionByCode.get(empQ.pairCode);
          if (!jsQ) continue;

          pairs.push({
            questionId: empQ.id,
            dimension: toDimensionId(empQ.dimension),
            scaleType: toScaleType(empQ.inputType),
            employerAnswer: (employerAnswerMap.get(empQ.id) as Record<string, unknown>) ?? null,
            jobseekerAnswer: (jobseekerAnswerMap.get(jsQ.id) as Record<string, unknown>) ?? null,
          });
        }

        // Calculate
        const result = calculateMatchingResult(pairs);
        const comments = generateReportComments(result);

        // Find existing or create MatchingResult
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

        if (existing) {
          await prisma.matchingResult.update({
            where: { id: existing.id },
            data: scoreData,
          });
        } else {
          await prisma.matchingResult.create({
            data: {
              organizationId,
              applicantId,
              positionId: positionId ?? null,
              ...scoreData,
            },
          });
        }

        // Update backward-compat field
        await prisma.applicant.update({
          where: { id: applicantId },
          data: { compatibilityScore: result.totalScore },
        });

        results.push({ applicantId, totalScore: result.totalScore });
      } catch (err) {
        console.error(`マッチング計算エラー (applicant: ${applicantId}):`, err);
        results.push({
          applicantId,
          totalScore: 0,
          error: "計算中にエラーが発生しました",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("バッチマッチング計算エラー:", error);
    return NextResponse.json(
      { error: "バッチマッチング計算に失敗しました" },
      { status: 500 }
    );
  }
}
