import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicantStatus, Gender } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const positionId = searchParams.get("positionId");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (status) {
      if (!Object.values(ApplicantStatus).includes(status as ApplicantStatus)) {
        return NextResponse.json({ error: "無効なステータスです" }, { status: 400 });
      }
      where.status = status as ApplicantStatus;
    }

    if (positionId) {
      where.positionId = positionId;
    }

    if (search) {
      where.OR = [
        { lastName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastNameKana: { contains: search, mode: "insensitive" } },
        { firstNameKana: { contains: search, mode: "insensitive" } },
      ];
    }

    const [applicants, total] = await Promise.all([
      prisma.applicant.findMany({
        where,
        include: {
          position: {
            select: { id: true, title: true },
          },
        },
        orderBy: { appliedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.applicant.count({ where }),
    ]);

    return NextResponse.json({ applicants, total, page, limit });
  } catch (error) {
    console.error("応募者一覧取得エラー:", error);
    return NextResponse.json({ error: "応募者一覧の取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
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
    } = body;

    if (!lastName || !firstName) {
      return NextResponse.json(
        { error: "姓と名は必須項目です" },
        { status: 400 }
      );
    }

    if (gender && !Object.values(Gender).includes(gender as Gender)) {
      return NextResponse.json({ error: "無効な性別です" }, { status: 400 });
    }

    if (positionId) {
      const position = await prisma.position.findFirst({
        where: { id: positionId, organizationId },
      });
      if (!position) {
        return NextResponse.json({ error: "指定された募集職種が見つかりません" }, { status: 400 });
      }
    }

    const userName = session.user.name || "システム";

    const applicant = await prisma.applicant.create({
      data: {
        organizationId,
        lastName,
        firstName,
        lastNameKana: lastNameKana || null,
        firstNameKana: firstNameKana || null,
        email: email || null,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender ? (gender as Gender) : null,
        address: address || null,
        currentEmployer: currentEmployer || null,
        yearsExperience: yearsExperience != null ? parseInt(String(yearsExperience), 10) : null,
        licenses: licenses || null,
        education: education || null,
        positionId: positionId || null,
        source: source || null,
        notes: notes || null,
        status: "NEW",
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "NEW",
            changedBy: userName,
            note: "応募者登録",
          },
        },
      },
      include: {
        position: {
          select: { id: true, title: true },
        },
        statusHistory: true,
      },
    });

    await createNotification({
      organizationId,
      type: "NEW_APPLICANT",
      title: "新規応募者",
      message: `${body.lastName} ${body.firstName}さんが応募しました`,
      relatedId: applicant.id,
      relatedType: "applicant",
    });

    return NextResponse.json(applicant, { status: 201 });
  } catch (error) {
    console.error("応募者作成エラー:", error);
    return NextResponse.json({ error: "応募者の作成に失敗しました" }, { status: 500 });
  }
}
