import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.DATABASE_URL = process.env.DATABASE_URL ? "設定済み" : "未設定";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "設定済み" : "未設定";
  checks.GEMINI_API_KEY = process.env.GEMINI_API_KEY ? "設定済み" : "未設定";

  // Check DB connection
  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    checks.database = `接続OK: ${JSON.stringify(result)}`;
  } catch (error) {
    checks.database = `接続エラー: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Check user count
  try {
    const count = await prisma.user.count();
    checks.userCount = String(count);
  } catch (error) {
    checks.userCount = `エラー: ${error instanceof Error ? error.message : String(error)}`;
  }

  return NextResponse.json(checks);
}
