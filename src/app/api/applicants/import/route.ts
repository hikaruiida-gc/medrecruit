import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";
import * as XLSX from "xlsx";

interface ColumnMapping {
  [fileColumn: string]: string;
}

interface ImportError {
  row: number;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_APPLICANT_FIELDS = [
  "lastName",
  "firstName",
  "lastNameKana",
  "firstNameKana",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "address",
  "currentEmployer",
  "yearsExperience",
  "licenses",
  "education",
  "source",
  "notes",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const organizationId = (session.user as Record<string, unknown>).organizationId as string;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mappingStr = formData.get("mapping") as string | null;
    const positionId = formData.get("positionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json(
        { error: "対応するファイル形式はExcel(.xlsx, .xls)またはCSV(.csv)です" },
        { status: 400 }
      );
    }

    if (!mappingStr) {
      return NextResponse.json({ error: "カラムマッピングが指定されていません" }, { status: 400 });
    }

    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(mappingStr);
    } catch {
      return NextResponse.json({ error: "カラムマッピングの形式が不正です" }, { status: 400 });
    }

    // Validate mapping targets
    for (const target of Object.values(mapping)) {
      if (!VALID_APPLICANT_FIELDS.includes(target)) {
        return NextResponse.json(
          { error: `無効なマッピング先フィールド: ${target}` },
          { status: 400 }
        );
      }
    }

    // Check that lastName and firstName are mapped
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes("lastName") || !mappedFields.includes("firstName")) {
      return NextResponse.json(
        { error: "姓(lastName)と名(firstName)のマッピングは必須です" },
        { status: 400 }
      );
    }

    if (positionId) {
      const position = await prisma.position.findFirst({
        where: { id: positionId, organizationId },
      });
      if (!position) {
        return NextResponse.json({ error: "指定された募集職種が見つかりません" }, { status: 400 });
      }
    }

    // Parse the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "ファイルにシートが見つかりません" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "ファイルにデータが見つかりません" }, { status: 400 });
    }

    // Fetch existing applicants for duplicate checking
    const existingApplicants = await prisma.applicant.findMany({
      where: { organizationId },
      select: { lastName: true, firstName: true, email: true, phone: true },
    });

    const existingSet = new Set<string>();
    for (const a of existingApplicants) {
      if (a.email) existingSet.add(`email:${a.email.toLowerCase()}`);
      if (a.phone) existingSet.add(`name_phone:${a.lastName}${a.firstName}:${a.phone}`);
      existingSet.add(`name:${a.lastName}${a.firstName}`);
    }

    const errors: ImportError[] = [];
    let success = 0;
    let skipped = 0;
    const userName = session.user.name || "システム";

    // Process in batches
    const BATCH_SIZE = 100;
    const validRows: Array<Record<string, unknown>> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header and index is 0-based
      const mapped: Record<string, unknown> = {};

      // Apply mapping
      for (const [fileColumn, appField] of Object.entries(mapping)) {
        const value = row[fileColumn];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          mapped[appField] = String(value).trim();
        }
      }

      // Validate required fields
      if (!mapped.lastName || !mapped.firstName) {
        errors.push({ row: rowNum, message: "姓または名が空です" });
        skipped++;
        continue;
      }

      const lastName = String(mapped.lastName);
      const firstName = String(mapped.firstName);
      const email = mapped.email ? String(mapped.email) : null;
      const phone = mapped.phone ? String(mapped.phone) : null;

      // Validate email format
      if (email && !EMAIL_REGEX.test(email)) {
        errors.push({ row: rowNum, message: `メールアドレスの形式が不正です: ${email}` });
        skipped++;
        continue;
      }

      // Duplicate check: same email
      if (email && existingSet.has(`email:${email.toLowerCase()}`)) {
        errors.push({ row: rowNum, message: `重複: メールアドレス ${email} は既に登録されています` });
        skipped++;
        continue;
      }

      // Duplicate check: same name + phone
      if (phone && existingSet.has(`name_phone:${lastName}${firstName}:${phone}`)) {
        errors.push({ row: rowNum, message: `重複: ${lastName}${firstName} (電話番号: ${phone}) は既に登録されています` });
        skipped++;
        continue;
      }

      // Validate gender if provided
      if (mapped.gender) {
        const genderStr = String(mapped.gender).toUpperCase();
        if (!Object.values(Gender).includes(genderStr as Gender)) {
          // Try Japanese mapping
          const genderMap: Record<string, Gender> = {
            "男": "MALE",
            "男性": "MALE",
            "女": "FEMALE",
            "女性": "FEMALE",
            "その他": "OTHER",
          };
          if (genderMap[String(mapped.gender)]) {
            mapped.gender = genderMap[String(mapped.gender)];
          } else {
            errors.push({ row: rowNum, message: `無効な性別: ${mapped.gender}` });
            skipped++;
            continue;
          }
        } else {
          mapped.gender = genderStr;
        }
      }

      // Parse yearsExperience
      if (mapped.yearsExperience) {
        const parsed = parseInt(String(mapped.yearsExperience), 10);
        if (isNaN(parsed)) {
          errors.push({ row: rowNum, message: `経験年数の形式が不正です: ${mapped.yearsExperience}` });
          skipped++;
          continue;
        }
        mapped.yearsExperience = parsed;
      }

      // Parse dateOfBirth
      if (mapped.dateOfBirth) {
        const dateStr = String(mapped.dateOfBirth);
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) {
          errors.push({ row: rowNum, message: `生年月日の形式が不正です: ${dateStr}` });
          skipped++;
          continue;
        }
        mapped.dateOfBirth = parsed;
      }

      // Add to existing set to prevent intra-file duplicates
      if (email) existingSet.add(`email:${email.toLowerCase()}`);
      if (phone) existingSet.add(`name_phone:${lastName}${firstName}:${phone}`);

      validRows.push(mapped);
    }

    // Batch insert valid rows
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      for (const mapped of batch) {
        try {
          await prisma.applicant.create({
            data: {
              organizationId,
              lastName: String(mapped.lastName),
              firstName: String(mapped.firstName),
              lastNameKana: mapped.lastNameKana ? String(mapped.lastNameKana) : null,
              firstNameKana: mapped.firstNameKana ? String(mapped.firstNameKana) : null,
              email: mapped.email ? String(mapped.email) : null,
              phone: mapped.phone ? String(mapped.phone) : null,
              dateOfBirth: mapped.dateOfBirth instanceof Date ? mapped.dateOfBirth : null,
              gender: mapped.gender ? (mapped.gender as Gender) : null,
              address: mapped.address ? String(mapped.address) : null,
              currentEmployer: mapped.currentEmployer ? String(mapped.currentEmployer) : null,
              yearsExperience: typeof mapped.yearsExperience === "number" ? mapped.yearsExperience : null,
              licenses: mapped.licenses ? String(mapped.licenses) : null,
              education: mapped.education ? String(mapped.education) : null,
              positionId: positionId || null,
              source: mapped.source ? String(mapped.source) : "インポート",
              notes: mapped.notes ? String(mapped.notes) : null,
              status: "NEW",
              statusHistory: {
                create: {
                  fromStatus: null,
                  toStatus: "NEW",
                  changedBy: userName,
                  note: "インポートによる登録",
                },
              },
            },
          });
          success++;
        } catch (err) {
          console.error("インポート行挿入エラー:", err);
          errors.push({
            row: validRows.indexOf(mapped) + 2,
            message: "データベースへの挿入に失敗しました",
          });
          skipped++;
        }
      }
    }

    return NextResponse.json({ success, skipped, errors });
  } catch (error) {
    console.error("インポートエラー:", error);
    return NextResponse.json({ error: "インポート処理に失敗しました" }, { status: 500 });
  }
}
