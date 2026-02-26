import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const { id } = await params;

  try {
    const competitor = await prisma.competitor.findFirst({
      where: { id, organizationId },
      include: {
        conditions: {
          orderBy: { fetchedAt: "desc" },
        },
      },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("Competitor get error:", error);
    return NextResponse.json(
      { error: "競合情報の取得に失敗しました" },
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
    const existing = await prisma.competitor.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, address, distance, website } = body;

    const competitor = await prisma.competitor.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        address: address !== undefined ? address || null : existing.address,
        distance:
          distance !== undefined
            ? distance
              ? Number(distance)
              : null
            : existing.distance,
        website: website !== undefined ? website || null : existing.website,
      },
      include: {
        conditions: true,
      },
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("Competitor update error:", error);
    return NextResponse.json(
      { error: "競合情報の更新に失敗しました" },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  const { id } = await params;

  try {
    const existing = await prisma.competitor.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "競合情報が見つかりません" },
        { status: 404 }
      );
    }

    // Delete conditions first (cascade), then the competitor
    await prisma.competitorCondition.deleteMany({
      where: { competitorId: id },
    });

    await prisma.competitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Competitor delete error:", error);
    return NextResponse.json(
      { error: "競合情報の削除に失敗しました" },
      { status: 500 }
    );
  }
}
