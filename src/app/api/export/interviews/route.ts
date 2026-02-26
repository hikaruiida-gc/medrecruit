import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { InterviewStatus } from "@prisma/client";

const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  IN_PERSON: "対面",
  ONLINE: "オンライン",
  PHONE: "電話",
};

const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "予定",
  IN_PROGRESS: "実施中",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "認証が必要です" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const applicantId = searchParams.get("applicantId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      applicant: { organizationId },
    };

    if (applicantId && applicantId !== "ALL") {
      where.applicantId = applicantId;
    }

    if (status && status !== "ALL") {
      if (
        !Object.values(InterviewStatus).includes(status as InterviewStatus)
      ) {
        return new Response(
          JSON.stringify({ error: "無効なステータスです" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      where.status = status as InterviewStatus;
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        applicant: {
          select: {
            lastName: true,
            firstName: true,
            organizationId: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Build Excel data
    const headerRow = [
      "応募者名",
      "面接日",
      "面接形式",
      "面接官",
      "ステータス",
      "評価",
      "メモ",
      "AI要約",
    ];

    const dataRows = interviews.map((iv) => {
      let evaluationStr = "";
      if (iv.evaluation) {
        try {
          const evalData =
            typeof iv.evaluation === "string"
              ? JSON.parse(iv.evaluation as string)
              : iv.evaluation;
          if (typeof evalData === "object" && evalData !== null) {
            evaluationStr = Object.entries(
              evalData as Record<string, unknown>
            )
              .map(([key, val]) => `${key}: ${val}`)
              .join(", ");
          }
        } catch {
          evaluationStr = String(iv.evaluation);
        }
      } else if (iv.rating != null) {
        evaluationStr = `${iv.rating}`;
      }

      return [
        `${iv.applicant.lastName} ${iv.applicant.firstName}`,
        formatDate(iv.scheduledAt),
        INTERVIEW_TYPE_LABELS[iv.type] || iv.type,
        iv.interviewerName || "",
        INTERVIEW_STATUS_LABELS[iv.status] || iv.status,
        evaluationStr,
        iv.notes || "",
        iv.summary || "",
      ];
    });

    const data = [headerRow, ...dataRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // 応募者名
      { wch: 14 }, // 面接日
      { wch: 12 }, // 面接形式
      { wch: 16 }, // 面接官
      { wch: 12 }, // ステータス
      { wch: 10 }, // 評価
      { wch: 30 }, // メモ
      { wch: 40 }, // AI要約
    ];

    XLSX.utils.book_append_sheet(wb, ws, "面接一覧");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `面接一覧_${dateStr}.xlsx`;

    return new Response(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("面接エクスポートエラー:", error);
    return new Response(
      JSON.stringify({ error: "面接データのエクスポートに失敗しました" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
