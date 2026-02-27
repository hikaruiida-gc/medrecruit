import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAI, extractJSON } from "@/lib/ai";

interface KeyPoints {
  strengths: string[];
  concerns: string[];
  followUp: string[];
}

interface Evaluation {
  expertise: number;
  communication: number;
  teamwork: number;
  motivation: number;
  cultureFit: number;
}

const DEMO_SUMMARY = `山田花子氏は、総合病院での5年間の看護経験を持つ候補者です。面接では終始落ち着いた態度で、明確かつ具体的な回答をされていました。内科病棟での実務経験に加え、新人指導の経験もあり、即戦力として期待できます。地域密着型医療への関心が転職動機であり、当院の理念との親和性が高いと感じられました。患者様とのエピソードからは、観察力とコミュニケーション能力の高さが伺えます。`;

const DEMO_KEY_POINTS: KeyPoints = {
  strengths: [
    "5年間の内科病棟での実務経験",
    "新人看護師の指導経験あり",
    "多職種連携に積極的な姿勢",
    "患者の細かな変化に気づく観察力",
    "電子カルテの操作スキルとテンプレート作成経験",
    "シフト制勤務に対応可能",
  ],
  concerns: [
    "クリニック勤務の経験がなく、病院との業務差への適応が必要",
    "地域密着型医療の具体的なイメージがやや抽象的",
  ],
  followUp: [
    "前職の退職理由の詳細確認",
    "給与面での希望条件の確認",
    "通勤時間・方法の確認",
    "認定看護師取得の具体的な計画",
  ],
};

const DEMO_EVALUATION: Evaluation = {
  expertise: 4,
  communication: 5,
  teamwork: 4,
  motivation: 5,
  cultureFit: 4,
};

export async function POST(
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

    // Verify interview access and get related data
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        applicant: {
          select: {
            organizationId: true,
            lastName: true,
            firstName: true,
            position: {
              select: { title: true },
            },
          },
        },
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "面接が見つかりません" },
        { status: 404 }
      );
    }

    if (interview.applicant.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    if (!interview.transcript) {
      return NextResponse.json(
        { error: "文字起こしデータがありません。先に文字起こしを実行してください。" },
        { status: 400 }
      );
    }

    let summary: string;
    let keyPoints: KeyPoints;
    let evaluation: Evaluation;

    const applicantName = `${interview.applicant.lastName} ${interview.applicant.firstName}`;
    const positionTitle = interview.applicant.position?.title || "未設定";
    const scheduledAt = interview.scheduledAt.toLocaleDateString("ja-JP");

    const prompt = `以下は医療機関の採用面接の文字起こしです。

応募者名: ${applicantName}
応募職種: ${positionTitle}
面接日: ${scheduledAt}

## 文字起こし内容:
${interview.transcript}

以下のJSON形式で面接内容を分析してください。必ず有効なJSONのみを返してください。説明文は不要です。
{
  "summary": "面接の要約 (200-300字)",
  "keyPoints": {
    "strengths": ["強み1", "強み2"],
    "concerns": ["懸念1", "懸念2"],
    "followUp": ["確認点1", "確認点2"]
  },
  "evaluation": {
    "expertise": 1-5の数値,
    "communication": 1-5の数値,
    "teamwork": 1-5の数値,
    "motivation": 1-5の数値,
    "cultureFit": 1-5の数値
  }
}`;

    const responseText = await callAI(prompt);
    if (responseText) {
      try {
        const parsed = JSON.parse(extractJSON(responseText));
        summary = parsed.summary || DEMO_SUMMARY;
        keyPoints = parsed.keyPoints || DEMO_KEY_POINTS;
        evaluation = parsed.evaluation || DEMO_EVALUATION;
      } catch {
        console.error("AI response parse error");
        summary = DEMO_SUMMARY;
        keyPoints = DEMO_KEY_POINTS;
        evaluation = DEMO_EVALUATION;
      }
    } else {
      // Demo mode
      summary = DEMO_SUMMARY;
      keyPoints = DEMO_KEY_POINTS;
      evaluation = DEMO_EVALUATION;
    }

    // Save to database
    await prisma.interview.update({
      where: { id },
      data: {
        summary,
        keyPoints: keyPoints as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        evaluation: evaluation as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });

    return NextResponse.json({ summary, keyPoints, evaluation });
  } catch (error) {
    console.error("要約生成エラー:", error);
    return NextResponse.json(
      { error: "要約の生成に失敗しました" },
      { status: 500 }
    );
  }
}
