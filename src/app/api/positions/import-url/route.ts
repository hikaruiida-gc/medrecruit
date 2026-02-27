import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callAI, extractJSON } from "@/lib/ai";

const EXTRACT_PROMPT = `以下は求人媒体の募集ページから取得したHTMLテキストです。
この求人情報から以下のJSON形式で情報を抽出してください。
読み取れない項目はnullとしてください。
必ず有効なJSONのみを返してください。説明文は不要です。

{
  "title": "職種名（例: 看護師、歯科衛生士、医療事務）",
  "employmentType": "FULL_TIME または PART_TIME または CONTRACT（常勤=FULL_TIME、パート・アルバイト=PART_TIME、契約社員=CONTRACT）",
  "salaryMin": 月給の下限（数値のみ、円単位。例: 250000）または null,
  "salaryMax": 月給の上限（数値のみ、円単位）または null,
  "hourlyRateMin": 時給の下限（数値のみ、円単位。例: 1200）または null,
  "hourlyRateMax": 時給の上限（数値のみ、円単位）または null,
  "description": "仕事内容・業務内容の詳細テキスト",
  "requirements": "応募条件・必要な資格・経験などのテキスト",
  "benefits": "福利厚生・待遇のテキスト"
}

注意:
- 年収が記載されている場合は12で割って月給に変換してください
- 給与にカンマや「万円」が含まれている場合は数値に変換してください（例: 25万円 → 250000）
- パート・アルバイトの場合は hourlyRateMin/Max に時給を入れ、salaryMin/Max は null にしてください
- 常勤・正社員の場合は salaryMin/Max に月給を入れ、hourlyRateMin/Max は null にしてください

求人ページのテキスト:
`;

function getMockExtractedData() {
  return {
    title: "歯科衛生士",
    employmentType: "FULL_TIME",
    salaryMin: 280000,
    salaryMax: 380000,
    hourlyRateMin: null,
    hourlyRateMax: null,
    description:
      "一般歯科治療における歯科衛生士業務全般\n・予防歯科処置（スケーリング、PMTC、フッ素塗布）\n・歯科保健指導\n・診療補助\n・口腔内写真撮影",
    requirements:
      "・歯科衛生士免許をお持ちの方\n・臨床経験2年以上の方歓迎\n・ブランクのある方も相談可",
    benefits:
      "・社会保険完備\n・交通費支給（月3万円まで）\n・制服貸与\n・有給休暇\n・研修制度あり\n・退職金制度あり",
  };
}

// Allow longer execution on Vercel
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URLが必要です" },
        { status: 400 }
      );
    }

    // Validate URL format
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

    // Fetch the page content
    let pageText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

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
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
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
      pageText.length > 6000 ? pageText.slice(0, 6000) + "\n..." : pageText;

    // Call AI
    const responseText = await callAI(EXTRACT_PROMPT + truncatedText);
    if (!responseText) {
      return NextResponse.json({
        extractedData: getMockExtractedData(),
        sourceUrl: url,
        demo: true,
      });
    }

    let extractedData;
    try {
      extractedData = JSON.parse(extractJSON(responseText));
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
    console.error("URL取り込みエラー:", error);
    return NextResponse.json(
      { error: "求人情報の取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
