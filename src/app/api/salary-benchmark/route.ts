import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  salaryBenchmarkData,
  type SalaryBenchmarkEntry,
} from "../../../../prisma/seed/salary-data";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const prefecture = searchParams.get("prefecture");
  const jobTitle = searchParams.get("jobTitle");
  const employmentType = searchParams.get("employmentType") as
    | "FULL_TIME"
    | "PART_TIME"
    | null;

  let results: SalaryBenchmarkEntry[] = salaryBenchmarkData;

  if (prefecture) {
    results = results.filter((e) => e.prefecture === prefecture);
  }

  if (jobTitle) {
    results = results.filter((e) => e.jobTitle === jobTitle);
  }

  if (employmentType) {
    results = results.filter((e) => e.employmentType === employmentType);
  }

  return NextResponse.json(results);
}
