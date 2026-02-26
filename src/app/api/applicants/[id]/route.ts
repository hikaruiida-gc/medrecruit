import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicantStatus, Gender } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const { id } = await params;

    const applicant = await prisma.applicant.findUnique({
      where: { id },
      include: {
        position: {
          select: { id: true, title: true },
        },
        interviews: {
          orderBy: { scheduledAt: "desc" },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!applicant) {
      return NextResponse.json({ error: "応募者が見つかりません" }, { status: 404 });
    }

    if (applicant.organizationId !== organizationId) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    return NextResponse.json(applicant);
  } catch (error) {
    console.error("応募者取得エラー:", error);
    return NextResponse.json({ error: "応募者の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const { id } = await params;

    const existing = await prisma.applicant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "応募者が見つかりません" }, { status: 404 });
    }
    if (existing.organizationId !== organizationId) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const {
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      currentEmployer,
      yearsExperience,
      licenses,
      education,
      positionId,
      source,
      notes,
      status,
      rating,
    } = body;

    if (gender !== undefined && gender !== null && !Object.values(Gender).includes(gender as Gender)) {
      return NextResponse.json({ error: "無効な性別です" }, { status: 400 });
    }

    if (status !== undefined && !Object.values(ApplicantStatus).includes(status as ApplicantStatus)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
    }

    if (positionId !== undefined && positionId !== null) {
      const position = await prisma.position.findFirst({
        where: { id: positionId, organizationId },
      });
      if (!position) {
        return NextResponse.json({ error: "指定された募集職種が見つかりません" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (lastName !== undefined) updateData.lastName = lastName;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastNameKana !== undefined) updateData.lastNameKana = lastNameKana || null;
    if (firstNameKana !== undefined) updateData.firstNameKana = firstNameKana || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender ? (gender as Gender) : null;
    if (address !== undefined) updateData.address = address || null;
    if (currentEmployer !== undefined) updateData.currentEmployer = currentEmployer || null;
    if (yearsExperience !== undefined) updateData.yearsExperience = yearsExperience != null ? parseInt(String(yearsExperience), 10) : null;
    if (licenses !== undefined) updateData.licenses = licenses || null;
    if (education !== undefined) updateData.education = education || null;
    if (positionId !== undefined) updateData.positionId = positionId || null;
    if (source !== undefined) updateData.source = source || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (status !== undefined) updateData.status = status as ApplicantStatus;
    if (rating !== undefined) updateData.rating = rating != null ? parseInt(String(rating), 10) : null;

    const statusChanged = status !== undefined && status !== existing.status;
    const userName = session.user.name || "システム";

    const applicant = await prisma.$transaction(async (tx) => {
      if (statusChanged) {
        await tx.statusHistory.create({
          data: {
            applicantId: id,
            fromStatus: existing.status,
            toStatus: status as ApplicantStatus,
            changedBy: userName,
            note: "ステータス更新",
          },
        });
      }

      return tx.applicant.update({
        where: { id },
        data: updateData,
        include: {
          position: {
            select: { id: true, title: true },
          },
          interviews: {
            orderBy: { scheduledAt: "desc" },
          },
          statusHistory: {
            orderBy: { changedAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json(applicant);
  } catch (error) {
    console.error("応募者更新エラー:", error);
    return NextResponse.json({ error: "応募者の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const { id } = await params;

    const existing = await prisma.applicant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "応募者が見つかりません" }, { status: 404 });
    }
    if (existing.organizationId !== organizationId) {
      return NextResponse.json({ error: "アクセス権限がありません" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.statusHistory.deleteMany({ where: { applicantId: id } });
      await tx.interview.deleteMany({ where: { applicantId: id } });
      await tx.applicant.delete({ where: { id } });
    });

    return NextResponse.json({ message: "応募者を削除しました" });
  } catch (error) {
    console.error("応募者削除エラー:", error);
    return NextResponse.json({ error: "応募者の削除に失敗しました" }, { status: 500 });
  }
}
