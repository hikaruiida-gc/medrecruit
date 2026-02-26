import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizationId = (session.user as any).organizationId as string;

  try {
    const { id } = await params;

    // Verify applicant exists and belongs to organization
    const applicant = await prisma.applicant.findUnique({ where: { id } });
    if (!applicant) {
      return NextResponse.json(
        { error: "応募者が見つかりません" },
        { status: 404 }
      );
    }
    if (applicant.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "アクセス権限がありません" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { parsedData } = body;

    if (!parsedData) {
      return NextResponse.json(
        { error: "解析データが必要です" },
        { status: 400 }
      );
    }

    // Build update object — only update fields that are currently null/empty
    const updateData: Record<string, unknown> = {
      resumeParsedData: parsedData,
    };

    // Map parsed fields to applicant model fields, only if currently empty
    if (!applicant.lastName && parsedData.lastName) {
      updateData.lastName = parsedData.lastName;
    }
    if (!applicant.firstName && parsedData.firstName) {
      updateData.firstName = parsedData.firstName;
    }
    if (!applicant.lastNameKana && parsedData.lastNameKana) {
      updateData.lastNameKana = parsedData.lastNameKana;
    }
    if (!applicant.firstNameKana && parsedData.firstNameKana) {
      updateData.firstNameKana = parsedData.firstNameKana;
    }
    if (!applicant.email && parsedData.email) {
      updateData.email = parsedData.email;
    }
    if (!applicant.phone && parsedData.phone) {
      updateData.phone = parsedData.phone;
    }
    if (!applicant.dateOfBirth && parsedData.dateOfBirth) {
      try {
        updateData.dateOfBirth = new Date(parsedData.dateOfBirth);
      } catch {
        // Skip invalid date
      }
    }
    if (
      !applicant.gender &&
      parsedData.gender &&
      Object.values(Gender).includes(parsedData.gender as Gender)
    ) {
      updateData.gender = parsedData.gender as Gender;
    }
    if (!applicant.address && parsedData.address) {
      updateData.address = parsedData.address;
    }

    // Build licenses string from array
    if (!applicant.licenses && parsedData.licenses?.length) {
      const licenseNames = parsedData.licenses
        .map((l: { name?: string }) => l.name)
        .filter(Boolean);
      if (licenseNames.length > 0) {
        updateData.licenses = licenseNames.join("、");
      }
    }

    // Build education string from array
    if (!applicant.education && parsedData.education?.length) {
      const lastEducation = parsedData.education[parsedData.education.length - 1];
      if (lastEducation?.description) {
        updateData.education = lastEducation.description;
      }
    }

    // Set currentEmployer from current job in work history
    if (!applicant.currentEmployer && parsedData.workHistory?.length) {
      const currentJob = parsedData.workHistory.find(
        (w: { isCurrentJob?: boolean }) => w.isCurrentJob
      );
      if (currentJob?.company) {
        updateData.currentEmployer = currentJob.company;
      }
    }

    const updated = await prisma.applicant.update({
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("履歴書確定エラー:", error);
    return NextResponse.json(
      { error: "履歴書データの保存に失敗しました" },
      { status: 500 }
    );
  }
}
