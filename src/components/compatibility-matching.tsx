"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompatibilityReport {
  compatibilityScore: number;
  matchPoints: string[];
  riskPoints: string[];
  advice: string;
  overallAssessment: string;
}

interface ApplicantListItem {
  id: string;
  lastName: string;
  firstName: string;
  positionTitle: string | null;
  status: string;
  compatibilityScore: number | null;
  hasReport: boolean;
}

interface ApplicantDetail {
  id: string;
  lastName: string;
  firstName: string;
  positionTitle: string | null;
  status: string;
  compatibilityScore: number | null;
  compatibilityReport: CompatibilityReport | null;
}

interface ListResponse {
  applicants: ApplicantListItem[];
  hasDirectorProfile: boolean;
  directorPersonalityType: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number | null): string {
  if (score === null) return "#9CA3AF"; // gray
  if (score >= 80) return "#5CB85C"; // green
  if (score >= 60) return "#F0AD4E"; // orange
  return "#D9534F"; // red
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "未分析";
  if (score >= 80) return "最適";
  if (score >= 60) return "良好";
  return "要検討";
}

function getScoreBadgeClasses(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

// ---------------------------------------------------------------------------
// Circular Score Gauge
// ---------------------------------------------------------------------------

function CircularScoreGauge({
  score,
  size = 180,
}: {
  score: number;
  size?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const color = getScoreColor(score);

  useEffect(() => {
    setAnimatedScore(0);
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timerId = setTimeout(() => {
      let current = 0;
      const increment = score / 40;
      intervalId = setInterval(() => {
        current += increment;
        if (current >= score) {
          current = score;
          if (intervalId) clearInterval(intervalId);
        }
        setAnimatedScore(Math.round(current));
      }, 16);
    }, 100);
    return () => {
      clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: "stroke-dashoffset 0.5s ease-out",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-sm text-[#7F8C9B] mt-1">/ 100</span>
        <span
          className="text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
          style={{
            color,
            backgroundColor: `${color}15`,
          }}
        >
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No Director Profile Alert
// ---------------------------------------------------------------------------

function NoDirectorProfileAlert() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">
            院長プロフィールが未設定です
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            相性マッチングを実行するには、先に「院長診断」タブから院長プロフィールを
            設定してください。診断結果を基に応募者との相性を分析します。
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-12 bg-gray-100 rounded animate-pulse"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function DetailPanel({
  detail,
  onBack,
  onReanalyze,
  isAnalyzing,
}: {
  detail: ApplicantDetail;
  onBack: () => void;
  onReanalyze: () => void;
  isAnalyzing: boolean;
}) {
  const report = detail.compatibilityReport;

  if (!report) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-[#769FCD] hover:text-[#4A7FB5]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          一覧に戻る
        </Button>
        <Card className="border-[#B9D7EA]">
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 mx-auto text-[#B9D7EA] mb-3" />
            <p className="text-[#7F8C9B]">
              まだ相性分析が実行されていません。
            </p>
            <Button
              onClick={onReanalyze}
              disabled={isAnalyzing}
              className="mt-4 bg-[#769FCD] hover:bg-[#4A7FB5]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  分析を実行
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-[#769FCD] hover:text-[#4A7FB5]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          一覧に戻る
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              再分析中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              再分析
            </>
          )}
        </Button>
      </div>

      {/* Applicant header */}
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-[#2C3E50]">
          {detail.lastName} {detail.firstName}
        </h3>
        {detail.positionTitle && (
          <p className="text-sm text-[#7F8C9B]">
            応募職種: {detail.positionTitle}
          </p>
        )}
      </div>

      {/* Score Gauge */}
      <Card className="border-[#B9D7EA]">
        <CardContent className="flex justify-center py-6">
          <CircularScoreGauge score={report.compatibilityScore} />
        </CardContent>
      </Card>

      {/* Match Points */}
      <Card className="border-[#B9D7EA]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#5CB85C]" />
            マッチポイント
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.matchPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5CB85C] mt-1.5 shrink-0" />
                <span className="text-[#2C3E50]">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Risk Points */}
      <Card className="border-[#B9D7EA]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#F0AD4E]" />
            懸念ポイント
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.riskPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F0AD4E] mt-1.5 shrink-0" />
                <span className="text-[#2C3E50]">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Advice */}
      <Card className="border-[#B9D7EA]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#769FCD]" />
            アドバイス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#2C3E50] leading-relaxed">
            {report.advice}
          </p>
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card className="border-[#769FCD] bg-[#F7FBFC]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#769FCD]" />
            総合評価
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#2C3E50] leading-relaxed font-medium">
            {report.overallAssessment}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CompatibilityMatching() {
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [hasDirectorProfile, setHasDirectorProfile] = useState<boolean | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedDetail, setSelectedDetail] = useState<ApplicantDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch list of applicants
  const fetchApplicants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/compatibility/match");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "データの取得に失敗しました");
      }
      const data: ListResponse = await res.json();
      setApplicants(data.applicants);
      setHasDirectorProfile(data.hasDirectorProfile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Run compatibility analysis for a single applicant
  const runAnalysis = async (applicantId: string) => {
    setAnalyzingIds((prev) => new Set(prev).add(applicantId));
    try {
      const res = await fetch("/api/compatibility/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "分析に失敗しました");
      }

      const result = await res.json();

      // Update the list item with the new score
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId
            ? {
                ...a,
                compatibilityScore: result.compatibilityScore,
                hasReport: true,
              }
            : a
        )
      );

      // If detail is shown for this applicant, reload detail
      if (selectedDetail?.id === applicantId) {
        await fetchDetail(applicantId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "分析に失敗しました"
      );
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(applicantId);
        return next;
      });
    }
  };

  // Fetch detail for a single applicant
  const fetchDetail = async (applicantId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/compatibility/match?applicantId=${applicantId}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "詳細の取得に失敗しました");
      }
      const data: ApplicantDetail = await res.json();
      setSelectedDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "詳細の取得に失敗しました"
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle clicking on an applicant row
  const handleSelectApplicant = (applicant: ApplicantListItem) => {
    if (applicant.hasReport) {
      fetchDetail(applicant.id);
    } else {
      // Show detail panel (which will prompt to run analysis)
      setSelectedDetail({
        id: applicant.id,
        lastName: applicant.lastName,
        firstName: applicant.firstName,
        positionTitle: applicant.positionTitle,
        status: applicant.status,
        compatibilityScore: null,
        compatibilityReport: null,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show detail panel
  if (selectedDetail && !detailLoading) {
    return (
      <DetailPanel
        detail={selectedDetail}
        onBack={() => {
          setSelectedDetail(null);
          fetchApplicants();
        }}
        onReanalyze={() => runAnalysis(selectedDetail.id)}
        isAnalyzing={analyzingIds.has(selectedDetail.id)}
      />
    );
  }

  // Detail loading state
  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#769FCD]" />
        <span className="ml-3 text-[#7F8C9B]">詳細を読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Director profile warning */}
      {hasDirectorProfile === false && <NoDirectorProfileAlert />}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setError(null);
                  fetchApplicants();
                }}
                className="mt-2 text-red-600 hover:text-red-800"
              >
                再試行
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Applicant list */}
      <Card className="border-[#B9D7EA]">
        <CardHeader>
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#769FCD]" />
            応募者マッチング一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-[#B9D7EA] mb-3" />
              <p className="text-[#7F8C9B]">
                応募者が登録されていません。
              </p>
              <p className="text-sm text-[#7F8C9B] mt-1">
                応募者を登録すると、ここで相性分析を実行できます。
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[#2C3E50]">応募者名</TableHead>
                  <TableHead className="text-[#2C3E50]">応募職種</TableHead>
                  <TableHead className="text-[#2C3E50]">ステータス</TableHead>
                  <TableHead className="text-[#2C3E50] text-center">
                    相性スコア
                  </TableHead>
                  <TableHead className="text-[#2C3E50] text-right">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicants.map((applicant) => {
                  const isAnalyzing = analyzingIds.has(applicant.id);
                  return (
                    <TableRow
                      key={applicant.id}
                      className="cursor-pointer hover:bg-[#F7FBFC]"
                      onClick={() => handleSelectApplicant(applicant)}
                    >
                      <TableCell className="font-medium text-[#2C3E50]">
                        {applicant.lastName} {applicant.firstName}
                      </TableCell>
                      <TableCell className="text-[#7F8C9B]">
                        {applicant.positionTitle || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs border ${
                            STATUS_LABELS[applicant.status]
                              ? ""
                              : "text-gray-600"
                          }`}
                        >
                          {STATUS_LABELS[applicant.status] || applicant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {applicant.compatibilityScore !== null ? (
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold border ${getScoreBadgeClasses(
                              applicant.compatibilityScore
                            )}`}
                          >
                            {applicant.compatibilityScore}点 ·{" "}
                            {getScoreLabel(applicant.compatibilityScore)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-xs border ${getScoreBadgeClasses(
                              null
                            )}`}
                          >
                            未分析
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            isAnalyzing || hasDirectorProfile === false
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            runAnalysis(applicant.id);
                          }}
                          className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC] hover:text-[#4A7FB5]"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              分析中
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              分析
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
