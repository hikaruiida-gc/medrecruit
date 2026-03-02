import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicantId: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { applicantId } = await params;

    // Verify applicant belongs to org
    const applicant = await prisma.applicant.findFirst({
      where: { id: applicantId, organizationId },
    });
    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const positionId = searchParams.get("positionId");

    // Build where clause for the result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      organizationId,
      applicantId,
    };

    if (positionId) {
      where.positionId = positionId;
    } else {
      where.positionId = null;
    }

    const matchingResult = await prisma.matchingResult.findFirst({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            status: true,
            positionId: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!matchingResult) {
      return NextResponse.json(
        { error: "マッチング結果が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(matchingResult);
  } catch (error) {
    console.error("マッチング結果詳細取得エラー:", error);
    return NextResponse.json(
      { error: "マッチング結果の取得に失敗しました" },
      { status: 500 }
    );
  }
}
