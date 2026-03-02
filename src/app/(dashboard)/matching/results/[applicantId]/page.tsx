"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { MATCHING_DIMENSIONS, DIMENSION_IDS } from "@/lib/matching/dimensions";
import type { DimensionId } from "@/lib/matching/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportComment {
  type: "strength" | "concern" | "action";
  dimension: string;
  text: string;
}

interface MatchingResultDetail {
  id: string;
  organizationId: string;
  applicantId: string;
  positionId: string | null;
  totalScore: number;
  poScore: number;
  pjDaScore: number;
  pjNsScore: number;
  pgScore: number;
  psScore: number;
  dimensionDetail: unknown;
  comments: ReportComment[] | null;
  calculatedAt: string;
  applicant: {
    id: string;
    lastName: string;
    firstName: string;
    status: string;
    positionId: string | null;
  };
  position: {
    id: string;
    title: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 65) return "#D97706";
  if (score >= 50) return "#2563EB";
  return "#DC2626";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 65) return "Mid-High";
  if (score >= 50) return "Mid";
  return "Low";
}

function getDimensionScore(
  result: MatchingResultDetail,
  dimId: DimensionId
): number {
  const map: Record<DimensionId, keyof MatchingResultDetail> = {
    po: "poScore",
    pj_da: "pjDaScore",
    pj_ns: "pjNsScore",
    pg: "pgScore",
    ps: "psScore",
  };
  return result[map[dimId]] as number;
}

// ---------------------------------------------------------------------------
// Circular Score Gauge (reused pattern from compatibility-matching)
// ---------------------------------------------------------------------------

function CircularScoreGauge({
  score,
  size = 200,
}: {
  score: number;
  size?: number;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 14;
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold" style={{ color }}>
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
// Main Page Component
// ---------------------------------------------------------------------------

export default function MatchingResultDetailPage({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  const { applicantId } = use(params);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [result, setResult] = useState<MatchingResultDetail | null>(null);

  // --- Fetch result ---
  const fetchResult = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matching/results/${applicantId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        }
      }
    } catch (err) {
      console.error("Failed to fetch result:", err);
      toast.error("結果の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [applicantId]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // --- Recalculate ---
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/matching/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId }),
      });

      if (res.ok) {
        toast.success("スコアを再計算しました");
        fetchResult();
      } else {
        const data = await res.json();
        toast.error(data.error || "再計算に失敗しました");
      }
    } catch (err) {
      console.error("Recalculate error:", err);
      toast.error("再計算に失敗しました");
    } finally {
      setRecalculating(false);
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">
            マッチング詳細レポート
          </h1>
        </div>
        <Card className="border-[#B9D7EA]">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-3 text-[#7F8C9B]">
              <Loader2 className="w-8 h-8 animate-spin text-[#769FCD]" />
              <p>読み込み中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- No result ---
  if (!result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/matching/results"
            className="flex items-center gap-1 text-sm text-[#769FCD] hover:text-[#4A7FB5]"
          >
            <ArrowLeft className="w-4 h-4" />
            結果一覧に戻る
          </Link>
        </div>
        <Card className="border-[#B9D7EA]">
          <CardContent className="py-16 text-center">
            <p className="text-[#7F8C9B]">
              マッチング結果が見つかりません。先に診断を実施してください。
            </p>
            <Link href={`/matching/applicants/${applicantId}/diagnosis`}>
              <Button className="mt-4 bg-[#769FCD] hover:bg-[#4A7FB5] text-white">
                診断を開始する
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Build radar chart data ---
  const radarData = DIMENSION_IDS.map((dimId) => ({
    dimension: MATCHING_DIMENSIONS[dimId].nameShort,
    score: getDimensionScore(result, dimId),
    fullMark: 100,
  }));

  // --- Parse comments ---
  const comments: ReportComment[] = Array.isArray(result.comments)
    ? result.comments
    : [];
  const strengths = comments.filter((c) => c.type === "strength");
  const concerns = comments.filter((c) => c.type === "concern");
  const actions = comments.filter((c) => c.type === "action");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/matching/results"
            className="flex items-center gap-1 text-sm text-[#769FCD] hover:text-[#4A7FB5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            結果一覧
          </Link>
        </div>
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
        >
          {recalculating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              再計算中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              再計算
            </>
          )}
        </Button>
      </div>

      {/* Applicant name & total score */}
      <Card className="border-[#B9D7EA] shadow-sm">
        <CardContent className="py-8">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#2C3E50] mb-1">
              {result.applicant.lastName} {result.applicant.firstName}
            </h2>
            {result.position && (
              <p className="text-sm text-[#7F8C9B] mb-6">
                応募職種: {result.position.title}
              </p>
            )}
            <div className="flex justify-center">
              <CircularScoreGauge score={result.totalScore} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar chart + Dimension scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2C3E50]">
              5次元レーダーチャート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart
                data={radarData}
                margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
              >
                <PolarGrid stroke="#D6E6F2" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{
                    fill: "#2C3E50",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#7F8C9B", fontSize: 10 }}
                  tickCount={6}
                />
                <Radar
                  name="スコア"
                  dataKey="score"
                  stroke="#769FCD"
                  fill="#769FCD"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dimension Score Bars */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2C3E50]">
              次元別スコア
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {DIMENSION_IDS.map((dimId) => {
              const dim = MATCHING_DIMENSIONS[dimId];
              const score = getDimensionScore(result, dimId);
              const color = getScoreColor(score);

              return (
                <div key={dimId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: dim.color }}
                      />
                      <span className="text-sm font-medium text-[#2C3E50]">
                        {dim.nameShort}
                      </span>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color }}
                    >
                      {score}
                    </span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        backgroundColor: dim.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#7F8C9B]">
                    {dim.description}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Comments section */}
      {comments.length > 0 && (
        <div className="space-y-6">
          {/* Strengths */}
          {strengths.length > 0 && (
            <Card className="border-green-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#059669]" />
                  強みポイント
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strengths.map((comment, idx) => {
                  const dimId = comment.dimension as DimensionId;
                  const dim = MATCHING_DIMENSIONS[dimId];
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-white text-[10px]"
                          style={{
                            backgroundColor: dim?.color || "#059669",
                          }}
                        >
                          {dim?.nameShort || comment.dimension}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#2C3E50] leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Concerns */}
          {concerns.length > 0 && (
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                  懸念ポイント
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {concerns.map((comment, idx) => {
                  const dimId = comment.dimension as DimensionId;
                  const dim = MATCHING_DIMENSIONS[dimId];
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-amber-50 rounded-lg border border-amber-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-white text-[10px]"
                          style={{
                            backgroundColor: dim?.color || "#D97706",
                          }}
                        >
                          {dim?.nameShort || comment.dimension}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#2C3E50] leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#2563EB]" />
                  推奨アクション
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actions.map((comment, idx) => {
                  const dimId = comment.dimension as DimensionId;
                  const dim = MATCHING_DIMENSIONS[dimId];
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className="text-white text-[10px]"
                          style={{
                            backgroundColor: dim?.color || "#2563EB",
                          }}
                        >
                          {dim?.nameShort || comment.dimension}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#2C3E50] leading-relaxed">
                        {comment.text}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex justify-center">
        <Link href="/matching/results">
          <Button
            variant="outline"
            className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            結果一覧に戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}
