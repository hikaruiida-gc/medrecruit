import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const EXTRACT_PROMPT = `以下は医療機関（歯科医院・クリニック・病院）の求人募集ページから取得したテキストです。
この求人情報から、医院名と募集条件を抽出してください。

複数の職種（歯科衛生士、歯科助手、歯科医師、看護師、医療事務など）や
複数の勤務形態（正社員/常勤、パート・アルバイト）が掲載されている場合は、
それぞれ個別のエントリとして抽出してください。

必ず有効なJSONのみを返してください。説明文は不要です。

{
  "clinicName": "医院名・クリニック名",
  "address": "住所（わかれば）",
  "website": "公式サイトURL（わかれば）またはnull",
  "conditions": [
    {
      "jobTitle": "職種名（例: 歯科衛生士(常勤)、歯科助手(パート)）",
      "salaryMin": 月給下限（数値、円単位）またはnull,
      "salaryMax": 月給上限（数値、円単位）またはnull,
      "hourlyRate": 時給（数値、円単位、パート・アルバイトの場合）またはnull,
      "benefits": "福利厚生・待遇（テキスト）",
      "workingHours": "勤務時間（テキスト）",
      "holidays": "休日・休暇（テキスト）"
    }
  ]
}

注意:
- 同じ職種でも正社員とパートで条件が異なる場合は別エントリにしてください
- jobTitleには勤務形態も含めてください（例: "歯科衛生士(常勤)", "歯科衛生士(パート)"）
- 年収が記載されている場合は12で割って月給に変換してください
- 給与に「万円」が含まれている場合は数値に変換してください（例: 25万円 → 250000）
- パート・アルバイトの場合はhourlyRateに時給を入れ、salaryMin/Maxはnullにしてください
- 正社員・常勤の場合はsalaryMin/Maxに月給を入れ、hourlyRateはnullにしてください
- 読み取れない項目はnullとしてください

求人ページのテキスト:
`;

function getMockExtractedData() {
  return {
    clinicName: "さくら歯科クリニック",
    address: "東京都渋谷区神宮前1-2-3",
    website: null,
    conditions: [
      {
        jobTitle: "歯科衛生士(常勤)",
        salaryMin: 280000,
        salaryMax: 380000,
        hourlyRate: null,
        benefits: "社会保険完備、交通費支給（月3万円まで）、制服貸与、有給休暇、研修制度あり、退職金制度あり",
        workingHours: "9:00〜18:00（休憩60分）",
        holidays: "日曜・祝日、水曜午後、夏季休暇、年末年始休暇",
      },
      {
        jobTitle: "歯科衛生士(パート)",
        salaryMin: null,
        salaryMax: null,
        hourlyRate: 1600,
        benefits: "交通費支給、制服貸与、有給休暇",
        workingHours: "9:00〜13:00 または 14:00〜18:00（応相談）",
        holidays: "シフト制、日曜・祝日休み",
      },
      {
        jobTitle: "歯科助手(常勤)",
        salaryMin: 220000,
        salaryMax: 280000,
        hourlyRate: null,
        benefits: "社会保険完備、交通費支給、制服貸与、有給休暇、未経験OK",
        workingHours: "9:00〜18:00（休憩60分）",
        holidays: "日曜・祝日、水曜午後、夏季休暇、年末年始休暇",
      },
      {
        jobTitle: "歯科助手(パート)",
        salaryMin: null,
        salaryMax: null,
        hourlyRate: 1200,
        benefits: "交通費支給、制服貸与、未経験OK",
        workingHours: "9:00〜13:00 または 14:00〜18:00（応相談）",
        holidays: "シフト制、日曜・祝日休み",
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "有効なURLを入力してください" },
        { status: 400 }
      );
    }

    // Fetch page
    let pageText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.9",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `ページの取得に失敗しました（HTTP ${response.status}）` },
          { status: 422 }
        );
      }

      const html = await response.text();

      pageText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n")
        .replace(/<(br|hr)\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim();
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "ページの取得がタイムアウトしました"
          : "ページの取得に失敗しました。URLが正しいか確認してください。";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (pageText.length < 100) {
      return NextResponse.json(
        { error: "ページから十分なテキストを取得できませんでした" },
        { status: 422 }
      );
    }

    const truncatedText =
      pageText.length > 10000 ? pageText.slice(0, 10000) + "\n..." : pageText;

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        extractedData: getMockExtractedData(),
        sourceUrl: url,
        demo: true,
      });
    }

    // Call Claude API
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        { role: "user", content: EXTRACT_PROMPT + truncatedText },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AIからの応答を解析できませんでした。もう一度お試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      extractedData,
      sourceUrl: url,
    });
  } catch (error) {
    console.error("競合URL取り込みエラー:", error);
    return NextResponse.json(
      { error: "競合情報の取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
