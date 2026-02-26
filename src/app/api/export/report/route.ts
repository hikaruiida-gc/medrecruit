import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

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

export async function GET() {
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
    const now = new Date();
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );

    // ── Gather all data in parallel ──────────────────────────
    const [
      totalApplicants,
      activePositions,
      acceptedApplicants,
      compatResult,
      positions,
      applicantsInRange,
    ] = await Promise.all([
      prisma.applicant.count({ where: { organizationId } }),
      prisma.position.count({ where: { organizationId, isActive: true } }),
      prisma.applicant.findMany({
        where: { organizationId, status: "ACCEPTED" },
        select: { createdAt: true, updatedAt: true },
      }),
      prisma.applicant.aggregate({
        where: {
          organizationId,
          compatibilityScore: { not: null },
        },
        _avg: { compatibilityScore: true },
      }),
      prisma.position.findMany({
        where: { organizationId },
        select: {
          title: true,
          applicants: {
            select: { status: true },
          },
        },
      }),
      prisma.applicant.findMany({
        where: {
          organizationId,
          createdAt: { gte: twelveMonthsAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    // ── Average time to hire ─────────────────────────────────
    let averageTimeToHire: number | null = null;
    if (acceptedApplicants.length > 0) {
      const totalDays = acceptedApplicants.reduce((sum, a) => {
        const diff =
          (new Date(a.updatedAt).getTime() -
            new Date(a.createdAt).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      averageTimeToHire = Math.round(totalDays / acceptedApplicants.length);
    }

    const compatibilityAverage = compatResult._avg.compatibilityScore
      ? Math.round(compatResult._avg.compatibilityScore * 10) / 10
      : null;

    // ══════════════════════════════════════════════════════════
    // Sheet 1: サマリー
    // ══════════════════════════════════════════════════════════
    const summaryData = [
      ["指標", "値"],
      ["応募者総数", totalApplicants],
      ["募集中の職種数", activePositions],
      [
        "平均採用日数",
        averageTimeToHire != null ? `${averageTimeToHire}日` : "データなし",
      ],
      [
        "平均相性スコア",
        compatibilityAverage != null
          ? `${compatibilityAverage}%`
          : "データなし",
      ],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 22 }, { wch: 18 }];

    // ══════════════════════════════════════════════════════════
    // Sheet 2: 選考パイプライン
    // ══════════════════════════════════════════════════════════
    const funnelStages = [
      "NEW",
      "SCREENING",
      "INTERVIEW_1",
      "INTERVIEW_2",
      "OFFER",
      "ACCEPTED",
    ] as const;

    const stageOrder: Record<string, number> = {
      NEW: 0,
      SCREENING: 1,
      INTERVIEW_1: 2,
      INTERVIEW_2: 3,
      OFFER: 4,
      ACCEPTED: 5,
      REJECTED: -1,
      WITHDRAWN: -1,
    };

    // We need status history to determine highest stage for rejected/withdrawn
    const allApplicantsForFunnel = await prisma.applicant.findMany({
      where: { organizationId },
      select: {
        status: true,
        statusHistory: {
          select: { toStatus: true },
          orderBy: { changedAt: "desc" },
        },
      },
    });

    const funnelCounts: Record<string, number> = {};
    for (const stage of funnelStages) {
      funnelCounts[stage] = 0;
    }

    for (const applicant of allApplicantsForFunnel) {
      let maxOrder = stageOrder[applicant.status] ?? -1;

      if (maxOrder < 0) {
        for (const h of applicant.statusHistory) {
          const o = stageOrder[h.toStatus] ?? -1;
          if (o > maxOrder) maxOrder = o;
        }
        if (maxOrder < 0) maxOrder = 0;
      }

      for (const stage of funnelStages) {
        if (stageOrder[stage] <= maxOrder) {
          funnelCounts[stage]++;
        }
      }
    }

    const totalForFunnel = funnelCounts["NEW"] || 1;
    const pipelineData: (string | number)[][] = [
      ["選考ステージ", "人数", "通過率"],
    ];
    for (const stage of funnelStages) {
      const rate = Math.round((funnelCounts[stage] / totalForFunnel) * 100);
      pipelineData.push([
        STATUS_LABELS[stage] || stage,
        funnelCounts[stage],
        `${rate}%`,
      ]);
    }
    const wsPipeline = XLSX.utils.aoa_to_sheet(pipelineData);
    wsPipeline["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 12 }];

    // ══════════════════════════════════════════════════════════
    // Sheet 3: 職種別応募状況
    // ══════════════════════════════════════════════════════════
    const positionData: (string | number)[][] = [
      ["職種名", "応募者数", "採用数"],
    ];
    for (const p of positions) {
      positionData.push([
        p.title,
        p.applicants.length,
        p.applicants.filter((a) => a.status === "ACCEPTED").length,
      ]);
    }
    const wsPosition = XLSX.utils.aoa_to_sheet(positionData);
    wsPosition["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 10 }];

    // ══════════════════════════════════════════════════════════
    // Sheet 4: 月別応募推移
    // ══════════════════════════════════════════════════════════
    const monthlyCounts: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts[key] = 0;
    }
    for (const a of applicantsInRange) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyCounts) {
        monthlyCounts[key]++;
      }
    }

    const monthlyData: (string | number)[][] = [["月", "応募者数"]];
    for (const [month, count] of Object.entries(monthlyCounts)) {
      monthlyData.push([month, count]);
    }
    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
    wsMonthly["!cols"] = [{ wch: 14 }, { wch: 12 }];

    // ── Assemble workbook ────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "サマリー");
    XLSX.utils.book_append_sheet(wb, wsPipeline, "選考パイプライン");
    XLSX.utils.book_append_sheet(wb, wsPosition, "職種別応募状況");
    XLSX.utils.book_append_sheet(wb, wsMonthly, "月別応募推移");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const filename = `採用レポート_${dateStr}.xlsx`;

    return new Response(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("レポートエクスポートエラー:", error);
    return new Response(
      JSON.stringify({ error: "採用レポートの生成に失敗しました" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
