import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationName,
      clinicType,
      prefecture,
      city,
      address,
      name,
      email,
      password,
    } = body;

    if (!organizationName || !clinicType || !prefecture || !city || !address || !name || !email || !password) {
      return NextResponse.json(
        { error: "必須項目を全て入力してください" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        type: clinicType,
        prefecture,
        city,
        address,
        users: {
          create: {
            name,
            email,
            hashedPassword,
            role: "ADMIN",
          },
        },
      },
      include: {
        users: true,
      },
    });

    return NextResponse.json({
      message: "登録が完了しました",
      organizationId: organization.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json(
      { error: `登録中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}
