import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

interface ResumeEducation {
  year: string | null;
  month: string | null;
  description: string | null;
}

interface ResumeWorkHistory {
  year: string | null;
  month: string | null;
  company: string | null;
  department: string | null;
  description: string | null;
  isCurrentJob: boolean;
}

interface ResumeLicense {
  year: string | null;
  month: string | null;
  name: string | null;
}

interface ResumeData {
  lastName: string | null;
  firstName: string | null;
  lastNameKana: string | null;
  firstNameKana: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  education: ResumeEducation[];
  workHistory: ResumeWorkHistory[];
  licenses: ResumeLicense[];
  selfPR: string | null;
  motivation: string | null;
  specialSkills: string | null;
}

function getMockResumeData(): ResumeData {
  return {
    lastName: "山田",
    firstName: "花子",
    lastNameKana: "ヤマダ",
    firstNameKana: "ハナコ",
    dateOfBirth: "1990-05-15",
    gender: "FEMALE",
    address: "東京都新宿区西新宿1-1-1",
    email: "hanako.yamada@example.com",
    phone: "090-1234-5678",
    education: [
      { year: "2009", month: "04", description: "東京医科歯科大学 歯学部 入学" },
      { year: "2013", month: "03", description: "東京医科歯科大学 歯学部 卒業" },
    ],
    workHistory: [
      {
        year: "2013",
        month: "04",
        company: "東京中央病院",
        department: "歯科口腔外科",
        description: "一般歯科治療、口腔外科手術の補助",
        isCurrentJob: false,
      },
      {
        year: "2018",
        month: "06",
        company: "さくらデンタルクリニック",
        department: "一般歯科",
        description: "一般歯科治療、予防歯科、小児歯科",
        isCurrentJob: true,
      },
    ],
    licenses: [
      { year: "2013", month: "03", name: "歯科衛生士免許" },
      { year: "2015", month: "07", name: "認定歯科衛生士" },
    ],
    selfPR:
      "10年以上の臨床経験を持ち、患者様とのコミュニケーションを大切にしています。予防歯科に力を入れており、定期検診の重要性を啓発する活動にも取り組んでいます。",
    motivation:
      "貴院の予防歯科に力を入れている方針に共感し、これまでの経験を活かして貢献したいと考えております。",
    specialSkills: "歯科衛生士実地指導、ホワイトニング施術、英語日常会話レベル",
  };
}

const PARSE_PROMPT = `以下は医療機関への応募者の履歴書から抽出されたテキストです。
以下のJSON形式で情報を構造化してください。
読み取れない項目はnullとしてください。
必ず有効なJSONのみを返してください。説明文は不要です。

{
  "lastName": "姓",
  "firstName": "名",
  "lastNameKana": "セイ（カタカナ）",
  "firstNameKana": "メイ（カタカナ）",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "MALE|FEMALE|OTHER",
  "address": "住所",
  "email": "メールアドレス",
  "phone": "電話番号",
  "education": [
    { "year": "YYYY", "month": "MM", "description": "学歴内容" }
  ],
  "workHistory": [
    {
      "year": "YYYY",
      "month": "MM",
      "company": "勤務先名",
      "department": "診療科・部署",
      "description": "業務内容",
      "isCurrentJob": false
    }
  ],
  "licenses": [
    { "year": "YYYY", "month": "MM", "name": "資格名" }
  ],
  "selfPR": "自己PR全文",
  "motivation": "志望動機全文",
  "specialSkills": "特技・スキル"
}

履歴書テキスト:
`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { id } = await params;

    // Verify applicant exists and belongs to organization
    const applicant = await prisma.applicant.findUnique({ where: { id } });
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

    // Read uploaded PDF
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "PDFファイルが必要です" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDFファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText: string;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import("pdf-parse" as any);
      const pdfParse = pdfModule.default || pdfModule;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch {
      return NextResponse.json(
        {
          error:
            "PDFの読み取りに失敗しました。ファイルが破損していないか確認してください。",
        },
        { status: 400 }
      );
    }

    if (extractedText.length < 50) {
      return NextResponse.json(
        {
          error:
            "PDFからテキストを十分に抽出できませんでした。スキャン画像のPDFの場合、手動での入力をお願いします。",
        },
        { status: 422 }
      );
    }

    // Check for API key — if missing, return demo data
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        parsedData: getMockResumeData(),
        confidence: 0.85,
        demo: true,
      });
    }

    // Call Claude API to structure the extracted text
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: PARSE_PROMPT + extractedText,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsedData: ResumeData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error:
            "AIからの応答を解析できませんでした。もう一度お試しください。",
        },
        { status: 500 }
      );
    }

    // Calculate confidence based on how many fields were extracted
    const fields = [
      parsedData.lastName,
      parsedData.firstName,
      parsedData.dateOfBirth,
      parsedData.email,
      parsedData.phone,
      parsedData.address,
      parsedData.education?.length ? "has" : null,
      parsedData.workHistory?.length ? "has" : null,
      parsedData.licenses?.length ? "has" : null,
    ];
    const filledCount = fields.filter((f) => f != null).length;
    const confidence = Math.round((filledCount / fields.length) * 100) / 100;

    return NextResponse.json({
      parsedData,
      confidence,
    });
  } catch (error) {
    console.error("履歴書解析エラー:", error);
    return NextResponse.json(
      { error: "履歴書の解析に失敗しました" },
      { status: 500 }
    );
  }
}
