"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, FileText, BarChart3, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Constants ────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "全て" },
  { value: "NEW", label: "新規" },
  { value: "SCREENING", label: "書類選考中" },
  { value: "INTERVIEW_1", label: "一次面接" },
  { value: "INTERVIEW_2", label: "二次面接" },
  { value: "OFFER", label: "内定" },
  { value: "ACCEPTED", label: "承諾" },
  { value: "REJECTED", label: "不採用" },
  { value: "WITHDRAWN", label: "辞退" },
];

const INTERVIEW_STATUS_OPTIONS = [
  { value: "ALL", label: "全て" },
  { value: "SCHEDULED", label: "予定" },
  { value: "IN_PROGRESS", label: "実施中" },
  { value: "COMPLETED", label: "完了" },
  { value: "CANCELLED", label: "キャンセル" },
];

// ── Types ────────────────────────────────────────────────────

interface PositionItem {
  id: string;
  title: string;
}

interface ApplicantItem {
  id: string;
  lastName: string;
  firstName: string;
}

// ── Download helper ──────────────────────────────────────────

async function downloadFile(url: string, fallbackFilename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error || "エクスポートに失敗しました"
    );
  }
  const blob = await res.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

// ── Page Component ───────────────────────────────────────────

export default function ExportPage() {
  // Applicants card state
  const [applicantStatus, setApplicantStatus] = useState("ALL");
  const [applicantPositionId, setApplicantPositionId] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applicantLoading, setApplicantLoading] = useState(false);

  // Interview card state
  const [interviewApplicantId, setInterviewApplicantId] = useState("ALL");
  const [interviewStatus, setInterviewStatus] = useState("ALL");
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Report card state
  const [reportLoading, setReportLoading] = useState(false);

  // Data for dropdowns
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);

  // ── Fetch dropdown data ────────────────────────────────────
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch("/api/positions");
        if (res.ok) {
          const data = await res.json();
          setPositions(
            Array.isArray(data)
              ? data.map((p: PositionItem) => ({
                  id: p.id,
                  title: p.title,
                }))
              : []
          );
        }
      } catch {
        // Silently handle - positions dropdown will just be empty
      }
    };

    const fetchApplicants = async () => {
      try {
        const res = await fetch("/api/applicants?limit=100");
        if (res.ok) {
          const data = await res.json();
          const items = data.applicants || [];
          setApplicants(
            items.map((a: ApplicantItem) => ({
              id: a.id,
              lastName: a.lastName,
              firstName: a.firstName,
            }))
          );
        }
      } catch {
        // Silently handle
      }
    };

    fetchPositions();
    fetchApplicants();
  }, []);

  // ── Export handlers ────────────────────────────────────────

  const handleApplicantExport = useCallback(async () => {
    setApplicantLoading(true);
    try {
      const params = new URLSearchParams();
      if (applicantStatus !== "ALL") params.set("status", applicantStatus);
      if (applicantPositionId !== "ALL")
        params.set("positionId", applicantPositionId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const queryStr = params.toString();
      const url = `/api/export/applicants${queryStr ? `?${queryStr}` : ""}`;

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

      await downloadFile(url, `応募者一覧_${dateStr}.xlsx`);
      toast.success("応募者データをエクスポートしました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エクスポートに失敗しました"
      );
    } finally {
      setApplicantLoading(false);
    }
  }, [applicantStatus, applicantPositionId, dateFrom, dateTo]);

  const handleInterviewExport = useCallback(async () => {
    setInterviewLoading(true);
    try {
      const params = new URLSearchParams();
      if (interviewApplicantId !== "ALL")
        params.set("applicantId", interviewApplicantId);
      if (interviewStatus !== "ALL")
        params.set("status", interviewStatus);

      const queryStr = params.toString();
      const url = `/api/export/interviews${queryStr ? `?${queryStr}` : ""}`;

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

      await downloadFile(url, `面接一覧_${dateStr}.xlsx`);
      toast.success("面接データをエクスポートしました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "エクスポートに失敗しました"
      );
    } finally {
      setInterviewLoading(false);
    }
  }, [interviewApplicantId, interviewStatus]);

  const handleReportExport = useCallback(async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

      await downloadFile(
        "/api/export/report",
        `採用レポート_${dateStr}.xlsx`
      );
      toast.success("採用レポートを生成しました");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "レポートの生成に失敗しました"
      );
    } finally {
      setReportLoading(false);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          データエクスポート
        </h1>
        <p className="text-gray-500 mt-1">
          採用データをExcel形式でエクスポートできます
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* ═══════════════════════════════════════════════════ */}
        {/* Card 1: 応募者データ                               */}
        {/* ═══════════════════════════════════════════════════ */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D6E6F2] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#4A7FB5]" />
              </div>
              <div>
                <CardTitle className="text-base">応募者データ</CardTitle>
                <CardDescription>
                  応募者の一覧データをExcel形式でエクスポートします
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {/* Status filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">ステータス</Label>
              <Select
                value={applicantStatus}
                onValueChange={setApplicantStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">職種</Label>
              <Select
                value={applicantPositionId}
                onValueChange={setApplicantPositionId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全て</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">期間</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1"
                />
                <span className="text-gray-400 text-sm">~</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleApplicantExport}
              disabled={applicantLoading}
              className="w-full bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {applicantLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {applicantLoading ? "エクスポート中..." : "エクスポート"}
            </Button>
          </CardFooter>
        </Card>

        {/* ═══════════════════════════════════════════════════ */}
        {/* Card 2: 面接データ                                 */}
        {/* ═══════════════════════════════════════════════════ */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D6E6F2] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#4A7FB5]" />
              </div>
              <div>
                <CardTitle className="text-base">面接データ</CardTitle>
                <CardDescription>
                  面接記録のデータをExcel形式でエクスポートします
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            {/* Applicant filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">応募者</Label>
              <Select
                value={interviewApplicantId}
                onValueChange={setInterviewApplicantId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全て</SelectItem>
                  {applicants.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.lastName} {a.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interview status filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">ステータス</Label>
              <Select
                value={interviewStatus}
                onValueChange={setInterviewStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleInterviewExport}
              disabled={interviewLoading}
              className="w-full bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {interviewLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {interviewLoading ? "エクスポート中..." : "エクスポート"}
            </Button>
          </CardFooter>
        </Card>

        {/* ═══════════════════════════════════════════════════ */}
        {/* Card 3: 採用レポート                               */}
        {/* ═══════════════════════════════════════════════════ */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D6E6F2] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#4A7FB5]" />
              </div>
              <div>
                <CardTitle className="text-base">採用レポート</CardTitle>
                <CardDescription>
                  採用活動の総合レポートをExcel形式でエクスポートします
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="rounded-lg border border-[#D6E6F2] bg-[#F7FBFC] p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-2">
                レポートに含まれる内容:
              </p>
              <ul className="space-y-1 list-disc list-inside text-gray-500">
                <li>KPIサマリー（応募者数、募集職種数、平均採用日数等）</li>
                <li>選考パイプライン（ステージ別通過率）</li>
                <li>職種別応募状況</li>
                <li>月別応募推移（過去12ヶ月）</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleReportExport}
              disabled={reportLoading}
              className="w-full bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {reportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              {reportLoading ? "レポート生成中..." : "レポートを生成"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
