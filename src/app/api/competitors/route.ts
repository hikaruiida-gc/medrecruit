import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const competitors = await prisma.competitor.findMany({
      where: { organizationId },
      include: {
        conditions: {
          orderBy: { fetchedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(competitors);
  } catch (error) {
    console.error("Competitor list error:", error);
    return NextResponse.json(
      { error: "競合情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const body = await request.json();
    const { name, address, distance, website } = body;

    if (!name) {
      return NextResponse.json(
        { error: "医療機関名は必須です" },
        { status: 400 }
      );
    }

    const competitor = await prisma.competitor.create({
      data: {
        organizationId,
        name,
        address: address || null,
        distance: distance ? Number(distance) : null,
        website: website || null,
      },
      include: {
        conditions: true,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error("Competitor create error:", error);
    return NextResponse.json(
      { error: "競合情報の作成に失敗しました" },
      { status: 500 }
    );
  }
}
