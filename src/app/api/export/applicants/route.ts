import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { ApplicantStatus } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  NEW: "新規",
  SCREENING: "書類選考中",
  INTERVIEW_1: "一次面接",
  INTERVIEW_2: "二次面接",
  OFFER: "内定",
  ACCEPTED: "承諾",
  REJECTED: "不採用",
  WITHDRAWN: "辞退",
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
    const status = searchParams.get("status");
    const positionId = searchParams.get("positionId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { organizationId };

    if (status && status !== "ALL") {
      if (!Object.values(ApplicantStatus).includes(status as ApplicantStatus)) {
        return new Response(JSON.stringify({ error: "無効なステータスです" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      where.status = status as ApplicantStatus;
    }

    if (positionId && positionId !== "ALL") {
      where.positionId = positionId;
    }

    if (dateFrom || dateTo) {
      where.appliedAt = {};
      if (dateFrom) {
        where.appliedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.appliedAt.lte = toDate;
      }
    }

    const applicants = await prisma.applicant.findMany({
      where,
      include: {
        position: {
          select: { title: true },
        },
      },
      orderBy: { appliedAt: "desc" },
    });

    // Build Excel data
    const headerRow = [
      "氏名",
      "フリガナ",
      "メールアドレス",
      "電話番号",
      "応募職種",
      "ステータス",
      "相性スコア",
      "応募日",
      "更新日",
    ];

    const dataRows = applicants.map((a) => [
      `${a.lastName} ${a.firstName}`,
      a.lastNameKana && a.firstNameKana
        ? `${a.lastNameKana} ${a.firstNameKana}`
        : a.lastNameKana || a.firstNameKana || "",
      a.email || "",
      a.phone || "",
      a.position?.title || "",
      STATUS_LABELS[a.status] || a.status,
      a.compatibilityScore != null ? `${a.compatibilityScore}%` : "",
      formatDate(a.appliedAt),
      formatDate(a.updatedAt),
    ]);

    const data = [headerRow, ...dataRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // 氏名
      { wch: 20 }, // フリガナ
      { wch: 28 }, // メールアドレス
      { wch: 16 }, // 電話番号
      { wch: 20 }, // 応募職種
      { wch: 14 }, // ステータス
      { wch: 12 }, // 相性スコア
      { wch: 14 }, // 応募日
      { wch: 14 }, // 更新日
    ];

    XLSX.utils.book_append_sheet(wb, ws, "応募者一覧");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `応募者一覧_${dateStr}.xlsx`;

    return new Response(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("応募者エクスポートエラー:", error);
    return new Response(
      JSON.stringify({ error: "応募者データのエクスポートに失敗しました" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
