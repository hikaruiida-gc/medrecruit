import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const { id } = await params;

  try {
    // Verify competitor belongs to user's organization
    const competitor = await prisma.competitor.findFirst({
      where: { id, organizationId },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      jobTitle,
      salaryMin,
      salaryMax,
      hourlyRate,
      benefits,
      workingHours,
      holidays,
      source,
    } = body;

    if (!jobTitle) {
      return NextResponse.json(
        { error: "職種名は必須です" },
        { status: 400 }
      );
    }

    const condition = await prisma.competitorCondition.create({
      data: {
        competitorId: id,
        jobTitle,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        benefits: benefits || null,
        workingHours: workingHours || null,
        holidays: holidays || null,
        source: source || null,
      },
    });

    return NextResponse.json(condition, { status: 201 });
  } catch (error) {
    console.error("Condition create error:", error);
    return NextResponse.json(
      { error: "条件の作成に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const { id } = await params;

  try {
    // Verify competitor belongs to user's organization
    const competitor = await prisma.competitor.findFirst({
      where: { id, organizationId },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      conditionId,
      jobTitle,
      salaryMin,
      salaryMax,
      hourlyRate,
      benefits,
      workingHours,
      holidays,
      source,
    } = body;

    if (!conditionId) {
      return NextResponse.json(
        { error: "条件IDは必須です" },
        { status: 400 }
      );
    }

    // Verify condition belongs to this competitor
    const existingCondition = await prisma.competitorCondition.findFirst({
      where: { id: conditionId, competitorId: id },
    });

    if (!existingCondition) {
      return NextResponse.json(
        { error: "条件が見つかりません" },
        { status: 404 }
      );
    }

    const condition = await prisma.competitorCondition.update({
      where: { id: conditionId },
      data: {
        jobTitle: jobTitle ?? existingCondition.jobTitle,
        salaryMin:
          salaryMin !== undefined
            ? salaryMin
              ? Number(salaryMin)
              : null
            : existingCondition.salaryMin,
        salaryMax:
          salaryMax !== undefined
            ? salaryMax
              ? Number(salaryMax)
              : null
            : existingCondition.salaryMax,
        hourlyRate:
          hourlyRate !== undefined
            ? hourlyRate
              ? Number(hourlyRate)
              : null
            : existingCondition.hourlyRate,
        benefits:
          benefits !== undefined
            ? benefits || null
            : existingCondition.benefits,
        workingHours:
          workingHours !== undefined
            ? workingHours || null
            : existingCondition.workingHours,
        holidays:
          holidays !== undefined
            ? holidays || null
            : existingCondition.holidays,
        source:
          source !== undefined ? source || null : existingCondition.source,
      },
    });

    return NextResponse.json(condition);
  } catch (error) {
    console.error("Condition update error:", error);
    return NextResponse.json(
      { error: "条件の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const { id } = await params;

  try {
    // Verify competitor belongs to user's organization
    const competitor = await prisma.competitor.findFirst({
      where: { id, organizationId },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { conditionId } = body;

    if (!conditionId) {
      return NextResponse.json(
        { error: "条件IDは必須です" },
        { status: 400 }
      );
    }

    // Verify condition belongs to this competitor
    const existingCondition = await prisma.competitorCondition.findFirst({
      where: { id: conditionId, competitorId: id },
    });

    if (!existingCondition) {
      return NextResponse.json(
        { error: "条件が見つかりません" },
        { status: 404 }
      );
    }

    await prisma.competitorCondition.delete({
      where: { id: conditionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Condition delete error:", error);
    return NextResponse.json(
      { error: "条件の削除に失敗しました" },
      { status: 500 }
    );
  }
}
