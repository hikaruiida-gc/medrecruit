import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmploymentType } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  const { id } = await params;

  try {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: { applicants: true },
        },
        applicants: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            status: true,
            appliedAt: true,
            email: true,
            phone: true,
          },
          orderBy: { appliedAt: "desc" },
        },
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "募集職種が見つかりません" },
        { status: 404 }
      );
    }

    if (position.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error("Position get error:", error);
    return NextResponse.json(
      { error: "募集職種の取得に失敗しました" },
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
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  const { id } = await params;

  try {
    const existing = await prisma.position.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "募集職種が見つかりません" },
        { status: 404 }
      );
    }

    if (existing.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      employmentType,
      salaryMin,
      salaryMax,
      hourlyRateMin,
      hourlyRateMax,
      description,
      requirements,
      benefits,
      isActive,
    } = body;

    if (
      employmentType &&
      !Object.values(EmploymentType).includes(employmentType)
    ) {
      return NextResponse.json(
        { error: "無効な雇用形態です" },
        { status: 400 }
      );
    }

    const position = await prisma.position.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(employmentType !== undefined && { employmentType }),
        ...(salaryMin !== undefined && {
          salaryMin: salaryMin ? Number(salaryMin) : null,
        }),
        ...(salaryMax !== undefined && {
          salaryMax: salaryMax ? Number(salaryMax) : null,
        }),
        ...(hourlyRateMin !== undefined && {
          hourlyRateMin: hourlyRateMin ? Number(hourlyRateMin) : null,
        }),
        ...(hourlyRateMax !== undefined && {
          hourlyRateMax: hourlyRateMax ? Number(hourlyRateMax) : null,
        }),
        ...(description !== undefined && {
          description: description || null,
        }),
        ...(requirements !== undefined && {
          requirements: requirements || null,
        }),
        ...(benefits !== undefined && { benefits: benefits || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: {
        _count: {
          select: { applicants: true },
        },
      },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("Position update error:", error);
    return NextResponse.json(
      { error: "募集職種の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  const { id } = await params;

  try {
    const existing = await prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: { applicants: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "募集職種が見つかりません" },
        { status: 404 }
      );
    }

    if (existing.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    if (existing._count.applicants > 0) {
      return NextResponse.json(
        {
          error: `この職種には${existing._count.applicants}名の応募者が紐づいています。先に応募者の紐づけを解除してください。`,
        },
        { status: 400 }
      );
    }

    await prisma.position.delete({
      where: { id },
    });

    return NextResponse.json({ message: "募集職種を削除しました" });
  } catch (error) {
    console.error("Position delete error:", error);
    return NextResponse.json(
      { error: "募集職種の削除に失敗しました" },
      { status: 500 }
    );
  }
}
