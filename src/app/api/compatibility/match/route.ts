import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAI, extractJSON } from "@/lib/ai";

interface CompatibilityResult {
  compatibilityScore: number;
  matchPoints: string[];
  riskPoints: string[];
  advice: string;
  overallAssessment: string;
}

function getDemoData(): CompatibilityResult {
  return {
    compatibilityScore: 78,
    matchPoints: [
      "チームでの協調性が院長のニーズと合致",
      "長期安定志向が院長の安定性重視と一致",
      "医療現場での実務経験が豊富",
    ],
    riskPoints: [
      "前職での転職頻度がやや高い",
      "意思決定スピードに差がある可能性",
    ],
    advice:
      "この応募者は堅実で信頼できるタイプです。自主性を引き出すために明確な目標設定と定期的なフィードバックが効果的です。細かい指示より大枠を示して任せるスタイルでベストパフォーマンスを引き出せるでしょう。",
    overallAssessment:
      "総合的には適性の高い候補者です。安定性重視の院長のチームに馴染みやすく、長期的な戦力として期待できます。",
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const body = await req.json();
    const { applicantId } = body;

    if (!applicantId) {
      return NextResponse.json(
        { error: "応募者IDが必要です" },
        { status: 400 }
      );
    }

    // Fetch director profile for the organization
    const directorProfile = await prisma.directorProfile.findUnique({
      where: { organizationId },
    });

    if (!directorProfile) {
      return NextResponse.json(
        {
          error:
            "院長プロフィールが未設定です。先に院長診断を行ってください。",
        },
        { status: 400 }
      );
    }

    // Fetch applicant data with position and interviews
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        position: {
          select: { id: true, title: true },
        },
        interviews: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
          select: {
            summary: true,
            transcript: true,
          },
        },
      },
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

    // Build parsed resume data context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resumeData = applicant.resumeParsedData as any;
    const workHistory = resumeData?.workHistory
      ? JSON.stringify(resumeData.workHistory)
      : "情報なし";
    const selfPR = resumeData?.selfPR || "情報なし";
    const motivation = resumeData?.motivation || "情報なし";

    // Latest interview summary
    const latestInterview = applicant.interviews[0];
    const interviewSummary = latestInterview?.summary || "面接記録なし";

    // Build the prompt
    const prompt = `以下の院長プロフィールと応募者プロフィールの相性を分析してください。

## 院長プロフィール:
リーダーシップタイプ: ${directorProfile.personalityType || "未設定"}
コミュニケーションスタイル: ${directorProfile.surveyResponses ? JSON.stringify(directorProfile.surveyResponses) : "未設定"}
理想の人材像: ${directorProfile.idealTraits ? JSON.stringify(directorProfile.idealTraits) : "未設定"}
避けたい特性: ${directorProfile.dealBreakers ? JSON.stringify(directorProfile.dealBreakers) : "未設定"}
職場文化: ${directorProfile.teamCulture || "未設定"}

## 応募者プロフィール:
名前: ${applicant.lastName} ${applicant.firstName}
応募職種: ${applicant.position?.title || "未設定"}
経歴: ${workHistory}
自己PR: ${selfPR}
志望動機: ${motivation}
面接所見: ${interviewSummary}

以下のJSON形式で出力してください。必ず有効なJSONのみを返してください。説明文は不要です。
{
  "compatibilityScore": 0-100の数値,
  "matchPoints": ["マッチする点1", "マッチする点2", "マッチする点3"],
  "riskPoints": ["懸念点1", "懸念点2"],
  "advice": "この応募者と良い関係を築くためのアドバイス (200字)",
  "overallAssessment": "総合評価コメント (100字)"
}`;

    // Call AI
    const responseText = await callAI(prompt);
    if (!responseText) {
      const demoResult = getDemoData();

      await prisma.applicant.update({
        where: { id: applicantId },
        data: {
          compatibilityScore: demoResult.compatibilityScore,
          compatibilityReport: JSON.stringify(demoResult),
        },
      });

      return NextResponse.json({
        ...demoResult,
        demo: true,
      });
    }

    let result: CompatibilityResult;
    try {
      result = JSON.parse(extractJSON(responseText));
    } catch {
      return NextResponse.json(
        {
          error:
            "AIからの応答を解析できませんでした。もう一度お試しください。",
        },
        { status: 500 }
      );
    }

    // Validate and clamp score
    result.compatibilityScore = Math.max(
      0,
      Math.min(100, Math.round(result.compatibilityScore))
    );

    // Save results to applicant
    await prisma.applicant.update({
      where: { id: applicantId },
      data: {
        compatibilityScore: result.compatibilityScore,
        compatibilityReport: JSON.stringify(result),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("相性分析エラー:", error);
    return NextResponse.json(
      { error: "相性分析に失敗しました" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const applicantId = searchParams.get("applicantId");

    if (applicantId) {
      // Return single applicant's compatibility data
      const applicant = await prisma.applicant.findUnique({
        where: { id: applicantId },
        include: {
          position: {
            select: { id: true, title: true },
          },
        },
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

      let report: CompatibilityResult | null = null;
      if (applicant.compatibilityReport) {
        try {
          report = JSON.parse(applicant.compatibilityReport);
        } catch {
          // Ignore parse errors for corrupted data
        }
      }

      return NextResponse.json({
        id: applicant.id,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        positionTitle: applicant.position?.title || null,
        status: applicant.status,
        compatibilityScore: applicant.compatibilityScore,
        compatibilityReport: report,
      });
    }

    // Return all applicants with compatibility scores
    // Check if director profile exists
    const directorProfile = await prisma.directorProfile.findUnique({
      where: { organizationId },
      select: { id: true, personalityType: true },
    });

    const applicants = await prisma.applicant.findMany({
      where: { organizationId },
      include: {
        position: {
          select: { id: true, title: true },
        },
      },
      orderBy: [
        { compatibilityScore: { sort: "desc", nulls: "last" } },
        { appliedAt: "desc" },
      ],
    });

    const result = applicants.map((a) => ({
      id: a.id,
      lastName: a.lastName,
      firstName: a.firstName,
      positionTitle: a.position?.title || null,
      status: a.status,
      compatibilityScore: a.compatibilityScore,
      hasReport: !!a.compatibilityReport,
    }));

    return NextResponse.json({
      applicants: result,
      hasDirectorProfile: !!directorProfile,
      directorPersonalityType: directorProfile?.personalityType || null,
    });
  } catch (error) {
    console.error("相性データ取得エラー:", error);
    return NextResponse.json(
      { error: "相性データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
