import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ── Basic KPIs (existing) ──────────────────────────────────────────
    const [
      totalApplicants,
      activePositions,
      newThisWeek,
      interviewsScheduled,
      statusGrouped,
    ] = await Promise.all([
      prisma.applicant.count({ where: { organizationId } }),
      prisma.position.count({ where: { organizationId, isActive: true } }),
      prisma.applicant.count({
        where: { organizationId, appliedAt: { gte: oneWeekAgo } },
      }),
      prisma.interview.count({
        where: {
          applicant: { organizationId },
          status: "SCHEDULED",
          scheduledAt: { gte: now },
        },
      }),
      prisma.applicant.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { status: true },
      }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const item of statusGrouped) {
      statusBreakdown[item.status] = item._count.status;
    }

    // ── Recent Applicants ──────────────────────────────────────────────
    const recentApplicantsRaw = await prisma.applicant.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        lastName: true,
        firstName: true,
        status: true,
        createdAt: true,
        position: { select: { title: true } },
      },
    });

    const recentApplicants = recentApplicantsRaw.map((a) => ({
      id: a.id,
      lastName: a.lastName,
      firstName: a.firstName,
      status: a.status,
      createdAt: a.createdAt,
      positionTitle: a.position?.title ?? null,
    }));

    // ── Monthly Trend (last 6 months) ──────────────────────────────────
    const allApplicantsInRange = await prisma.applicant.findMany({
      where: {
        organizationId,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { createdAt: true },
    });

    const monthlyCounts: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts[key] = 0;
    }
    for (const a of allApplicantsInRange) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyCounts) {
        monthlyCounts[key]++;
      }
    }
    const monthlyTrend = Object.entries(monthlyCounts).map(([month, count]) => ({
      month,
      count,
    }));

    // ── Average Time to Hire ───────────────────────────────────────────
    const acceptedApplicants = await prisma.applicant.findMany({
      where: { organizationId, status: "ACCEPTED" },
      select: { createdAt: true, updatedAt: true },
    });

    let averageTimeToHire: number | null = null;
    if (acceptedApplicants.length > 0) {
      const totalDays = acceptedApplicants.reduce((sum, a) => {
        const diff =
          (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      averageTimeToHire = Math.round(totalDays / acceptedApplicants.length);
    }

    // ── Funnel Data ────────────────────────────────────────────────────
    const funnelStages = [
      "NEW",
      "SCREENING",
      "INTERVIEW_1",
      "INTERVIEW_2",
      "OFFER",
      "ACCEPTED",
    ] as const;

    // Count how many applicants reached at least each stage.
    // An applicant who is at INTERVIEW_1 also passed NEW and SCREENING.
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

    // For rejected / withdrawn we also check statusHistory to know the
    // furthest stage they reached. But to keep the query simple, we use a
    // heuristic: if an applicant's current status is in the pipeline we know
    // they passed all previous stages. For REJECTED/WITHDRAWN we check
    // their status history to find the highest stage they reached.
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

      // Check history for rejected/withdrawn to find highest stage reached
      if (maxOrder < 0) {
        for (const h of applicant.statusHistory) {
          const o = stageOrder[h.toStatus] ?? -1;
          if (o > maxOrder) maxOrder = o;
        }
        // If still -1 (no history), they at least were NEW
        if (maxOrder < 0) maxOrder = 0;
      }

      // Count them for every stage they reached
      for (const stage of funnelStages) {
        if (stageOrder[stage] <= maxOrder) {
          funnelCounts[stage]++;
        }
      }
    }

    const totalForFunnel = funnelCounts["NEW"] || 1;
    const funnelData = funnelStages.map((stage) => ({
      stage,
      count: funnelCounts[stage],
      rate: Math.round((funnelCounts[stage] / totalForFunnel) * 100),
    }));

    // ── Upcoming Interviews ────────────────────────────────────────────
    const upcomingInterviewsRaw = await prisma.interview.findMany({
      where: {
        applicant: { organizationId },
        status: "SCHEDULED",
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      select: {
        id: true,
        scheduledAt: true,
        type: true,
        interviewerName: true,
        applicant: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
      },
    });

    const upcomingInterviews = upcomingInterviewsRaw.map((iv) => ({
      id: iv.id,
      applicantId: iv.applicant.id,
      applicantName: `${iv.applicant.lastName} ${iv.applicant.firstName}`,
      scheduledAt: iv.scheduledAt,
      type: iv.type,
      interviewerName: iv.interviewerName ?? null,
    }));

    // ── Compatibility Average ──────────────────────────────────────────
    const compatResult = await prisma.applicant.aggregate({
      where: {
        organizationId,
        compatibilityScore: { not: null },
      },
      _avg: { compatibilityScore: true },
    });
    const compatibilityAverage = compatResult._avg.compatibilityScore
      ? Math.round(compatResult._avg.compatibilityScore * 10) / 10
      : null;

    // ── Position Stats ─────────────────────────────────────────────────
    const positions = await prisma.position.findMany({
      where: { organizationId },
      select: {
        title: true,
        applicants: {
          select: { status: true },
        },
      },
    });

    const positionStats = positions.map((p) => ({
      positionTitle: p.title,
      applicantCount: p.applicants.length,
      hiredCount: p.applicants.filter((a) => a.status === "ACCEPTED").length,
    }));

    return NextResponse.json({
      totalApplicants,
      activePositions,
      newThisWeek,
      interviewsScheduled,
      statusBreakdown,
      recentApplicants,
      monthlyTrend,
      averageTimeToHire,
      funnelData,
      upcomingInterviews,
      compatibilityAverage,
      positionStats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "データ取得に失敗しました" },
      { status: 500 }
    );
  }
}
