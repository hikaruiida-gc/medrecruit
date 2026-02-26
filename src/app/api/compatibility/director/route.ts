import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Survey questions (mirrored in page component)
// ---------------------------------------------------------------------------

const QUESTIONS: Record<string, string> = {
  Q1: "チームの意思決定は、最終的に自分が判断するのが最も良い",
  Q2: "細かい指示を出すよりも、大きな方向性を示して任せたい",
  Q3: "問題が発生したとき、まず自分が率先して動いて解決する",
  Q4: "新しいことへの挑戦を楽しめる",
  Q5: "ルールや手順を大切にする",
  Q6: "スタッフとの雑談は大切だと思う",
  Q7: "フィードバックや注意は率直に伝える方だ",
  Q8: "スタッフの個人的な事情も考慮する",
  Q9: "会議は要点を絞って短時間で行いたい",
  Q10: "人を褒めるのは得意な方だ",
  Q11: "職場はアットホームな雰囲気が良い",
  Q12: "仕事とプライベートは明確に分けるべきだ",
  Q13: "スキルアップや技術習得への投資は惜しまない",
  Q14: "残業は極力させたくない",
  Q15: "チームイベントや懇親会は重要だ",
  Q16: "経験よりもやる気・ポテンシャルを重視する",
  Q17: "報連相をこまめにしてくれるスタッフが良い",
  Q18: "自分で考えて動ける自律型人材が理想",
  Q19: "長期的に安定して働いてくれることが最も大切",
  Q20: "専門性・技術力が最も重要",
};

const SCALE_LABELS: Record<number, string> = {
  1: "全くそう思わない",
  2: "あまりそう思わない",
  3: "どちらともいえない",
  4: "ややそう思う",
  5: "非常にそう思う",
};

// ---------------------------------------------------------------------------
// Demo data (returned when ANTHROPIC_API_KEY is not set)
// ---------------------------------------------------------------------------

const DEMO_RESULT = {
  leadershipType: "コーチング型",
  communicationStyle: {
    directness: 7,
    logicVsEmotion: 4,
    taskVsRelation: 6,
  },
  idealTraits: [
    "コミュニケーション能力が高い",
    "チームワークを大切にする",
    "学ぶ意欲がある",
  ],
  dealBreakers: [
    "無断欠勤・遅刻が多い",
    "報告・連絡・相談ができない",
    "協調性がない",
  ],
  cultureType: "家族型",
  summary:
    "コーチング型のリーダーシップを持ち、スタッフの成長を重視する院長です。温かいコミュニケーションで信頼関係を築きながら、専門性の向上も求めます。アットホームな職場環境を大切にし、チームの一体感を重要視しています。直接的なフィードバックは控えめですが、褒めることで動機付けを行う傾向があります。",
};

// ---------------------------------------------------------------------------
// Analysis result type
// ---------------------------------------------------------------------------

interface AnalysisResult {
  leadershipType: string;
  communicationStyle: {
    directness: number;
    logicVsEmotion: number;
    taskVsRelation: number;
  };
  idealTraits: string[];
  dealBreakers: string[];
  cultureType: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// GET  – fetch existing director profile
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const profile = await prisma.directorProfile.findUnique({
    where: { organizationId },
  });

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile });
}

// ---------------------------------------------------------------------------
// POST – submit survey & run analysis
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  let body: { surveyResponses: Record<string, number> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 }
    );
  }

  const { surveyResponses } = body;

  // Validate survey responses
  if (!surveyResponses || typeof surveyResponses !== "object") {
    return NextResponse.json(
      { error: "surveyResponses が必要です" },
      { status: 400 }
    );
  }

  for (let i = 1; i <= 20; i++) {
    const key = `Q${i}`;
    const value = surveyResponses[key];
    if (typeof value !== "number" || value < 1 || value > 5) {
      return NextResponse.json(
        { error: `${key} は1〜5の数値が必要です` },
        { status: 400 }
      );
    }
  }

  // Build analysis result
  let analysis: AnalysisResult;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    // ---- Call Claude API ----
    const qaText = Object.entries(surveyResponses)
      .sort(([a], [b]) => {
        const numA = parseInt(a.replace("Q", ""), 10);
        const numB = parseInt(b.replace("Q", ""), 10);
        return numA - numB;
      })
      .map(([key, value]) => {
        const question = QUESTIONS[key] || key;
        const label = SCALE_LABELS[value] || String(value);
        return `${key}: ${question} → ${value}（${label}）`;
      })
      .join("\n");

    const prompt = `以下は医療機関の院長が回答した性格診断アンケートの結果です。

${qaText}

以下の分析を行ってください:

1. リーダーシップタイプ (以下から最も近いものを1つ選択):
   - ビジョナリー型: 目標を示して任せる
   - コーチング型: 育成重視で伴走する
   - ペースセッター型: 自ら高い基準を示す
   - 民主型: チームの意見を尊重する
   - 指示型: 明確な指示で統率する

2. コミュニケーションスタイル:
   - 直接的 ↔ 間接的 (1-10)
   - 論理重視 ↔ 感情重視 (1-10)
   - タスク志向 ↔ 関係志向 (1-10)

3. 理想の人材像:
   - 求める上位3つの資質
   - 避けたい上位3つの特性

4. 職場文化タイプ:
   - 家族型 / 革新型 / 市場型 / 官僚型

JSON形式で出力:
{
  "leadershipType": "string",
  "communicationStyle": {
    "directness": 1-10,
    "logicVsEmotion": 1-10,
    "taskVsRelation": 1-10
  },
  "idealTraits": ["string"],
  "dealBreakers": ["string"],
  "cultureType": "string",
  "summary": "200字程度の総合分析"
}

JSONのみを出力してください。説明文は不要です。`;

    try {
      const anthropic = new Anthropic({ apiKey });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude API returned no text content");
      }

      // Extract JSON from the response (handle potential markdown fences)
      let jsonStr = textBlock.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      analysis = JSON.parse(jsonStr) as AnalysisResult;
    } catch (err) {
      console.error("Claude API error, falling back to demo data:", err);
      analysis = DEMO_RESULT;
    }
  } else {
    // ---- No API key → use demo data ----
    analysis = DEMO_RESULT;
  }

  // Upsert the director profile
  const profile = await prisma.directorProfile.upsert({
    where: { organizationId },
    create: {
      organizationId,
      personalityType: analysis.leadershipType,
      workStyleType: analysis.cultureType,
      surveyResponses: surveyResponses as Record<string, number>,
      idealTraits: analysis.idealTraits,
      dealBreakers: analysis.dealBreakers,
      teamCulture: analysis.cultureType,
    },
    update: {
      personalityType: analysis.leadershipType,
      workStyleType: analysis.cultureType,
      surveyResponses: surveyResponses as Record<string, number>,
      idealTraits: analysis.idealTraits,
      dealBreakers: analysis.dealBreakers,
      teamCulture: analysis.cultureType,
    },
  });

  return NextResponse.json({ profile, analysis });
}
