import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmploymentType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
    const positions = await prisma.position.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { applicants: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error("Position list error:", error);
    return NextResponse.json(
      { error: "募集職種の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>)
    .organizationId as string;

  try {
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
    } = body;

    if (!title || !employmentType) {
      return NextResponse.json(
        { error: "職種名と雇用形態は必須です" },
        { status: 400 }
      );
    }

    if (!Object.values(EmploymentType).includes(employmentType)) {
      return NextResponse.json(
        { error: "無効な雇用形態です" },
        { status: 400 }
      );
    }

    const position = await prisma.position.create({
      data: {
        organizationId,
        title,
        employmentType,
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        hourlyRateMin: hourlyRateMin ? Number(hourlyRateMin) : null,
        hourlyRateMax: hourlyRateMax ? Number(hourlyRateMax) : null,
        description: description || null,
        requirements: requirements || null,
        benefits: benefits || null,
      },
      include: {
        _count: {
          select: { applicants: true },
        },
      },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error("Position create error:", error);
    return NextResponse.json(
      { error: "募集職種の作成に失敗しました" },
      { status: 500 }
    );
  }
}
