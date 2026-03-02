"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Settings,
  Target,
  Calculator,
  Search,
  AlertTriangle,
} from "lucide-react";
import { MATCHING_DIMENSIONS, DIMENSION_IDS } from "@/lib/matching/dimensions";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import type { DimensionId } from "@/lib/matching/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchingResultItem {
  applicantId: string;
  applicantName: string;
  positionTitle: string | null;
  status: string;
  totalScore: number;
  poScore: number;
  pjDaScore: number;
  pjNsScore: number;
  pgScore: number;
  psScore: number;
  calculatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreBadgeClasses(score: number): string {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 65) return "bg-amber-50 text-amber-700 border-amber-200";
  if (score >= 50) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "高";
  if (score >= 65) return "中高";
  if (score >= 50) return "中";
  return "低";
}

function getDimensionScore(
  result: MatchingResultItem,
  dimId: DimensionId
): number {
  const map: Record<DimensionId, keyof MatchingResultItem> = {
    po: "poScore",
    pj_da: "pjDaScore",
    pj_ns: "pjNsScore",
    pg: "pgScore",
    ps: "psScore",
  };
  return result[map[dimId]] as number;
}

// ---------------------------------------------------------------------------
// Score Badge Component
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold border ${getScoreBadgeClasses(score)}`}
    >
      {score}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MatchingResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<MatchingResultItem[]>([]);
  const [minScoreFilter, setMinScoreFilter] = useState<string>("");
  const [calculating, setCalculating] = useState(false);
  const [hasEmployerAnswers, setHasEmployerAnswers] = useState<boolean | null>(
    null
  );

  // --- Fetch results ---
  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (minScoreFilter) {
        params.set("minScore", minScoreFilter);
      }
      const res = await fetch(`/api/matching/results?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        toast.error("結果の取得に失敗しました");
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
      toast.error("結果の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [minScoreFilter]);

  // --- Check employer answers exist ---
  const checkEmployerAnswers = useCallback(async () => {
    try {
      const res = await fetch("/api/matching/employer/answers");
      if (res.ok) {
        const data = await res.json();
        setHasEmployerAnswers(
          data.answers && data.answers.length > 0
        );
      }
    } catch {
      setHasEmployerAnswers(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    checkEmployerAnswers();
  }, [fetchResults, checkEmployerAnswers]);

  // --- Batch calculate ---
  const handleBatchCalculate = async () => {
    if (results.length === 0) {
      toast.error("計算対象の応募者がいません");
      return;
    }

    setCalculating(true);
    try {
      const applicantIds = results.map((r) => r.applicantId);
      const res = await fetch("/api/matching/calculate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantIds }),
      });

      if (res.ok) {
        const data = await res.json();
        const successCount = data.results?.filter(
          (r: { error?: string }) => !r.error
        ).length;
        toast.success(`${successCount}名のスコアを再計算しました`);
        fetchResults();
      } else {
        const data = await res.json();
        toast.error(data.error || "一括計算に失敗しました");
      }
    } catch (err) {
      console.error("Batch calculate error:", err);
      toast.error("一括計算に失敗しました");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">
            マッチング結果一覧
          </h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            応募者のマッチングスコアを一覧で確認できます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/matching/settings">
            <Button
              variant="outline"
              className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
            >
              <Settings className="w-4 h-4 mr-2" />
              設定
            </Button>
          </Link>
          <Button
            onClick={handleBatchCalculate}
            disabled={calculating || results.length === 0}
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                計算中...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                一括計算
              </>
            )}
          </Button>
        </div>
      </div>

      {/* No employer answers warning */}
      {hasEmployerAnswers === false && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">
                マッチング設定が未完了です
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                マッチング診断を実行するには、先にマッチング設定で組織・職場の特性を入力してください。
              </p>
              <Link href="/matching/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  設定ページへ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border-[#B9D7EA] shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7F8C9B]" />
              <Input
                type="number"
                placeholder="最低スコアでフィルタ (0-100)..."
                className="pl-9 border-[#B9D7EA]"
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value)}
                min={0}
                max={100}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMinScoreFilter("");
              }}
              className="border-[#B9D7EA] text-[#7F8C9B] hover:bg-[#F7FBFC]"
            >
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card className="border-[#B9D7EA] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#769FCD]" />
            マッチング結果
            {!loading && (
              <Badge variant="outline" className="ml-2 text-xs">
                {results.length}件
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#769FCD]" />
              <span className="ml-3 text-[#7F8C9B]">読み込み中...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <Target className="w-12 h-12 mx-auto text-[#B9D7EA] mb-3" />
              <p className="text-[#7F8C9B]">
                マッチング結果がありません
              </p>
              <p className="text-sm text-[#7F8C9B] mt-1">
                応募者の診断を実施すると、ここに結果が表示されます。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#D6E6F2] hover:bg-[#D6E6F2]">
                    <TableHead className="text-[#2C3E50]">氏名</TableHead>
                    <TableHead className="text-[#2C3E50]">応募職種</TableHead>
                    <TableHead className="text-[#2C3E50]">ステータス</TableHead>
                    <TableHead className="text-[#2C3E50] text-center">
                      総合スコア
                    </TableHead>
                    {DIMENSION_IDS.map((dimId) => (
                      <TableHead
                        key={dimId}
                        className="text-[#2C3E50] text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                MATCHING_DIMENSIONS[dimId].color,
                            }}
                          />
                          {MATCHING_DIMENSIONS[dimId].nameShort}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, i) => (
                    <TableRow
                      key={result.applicantId}
                      className={`cursor-pointer hover:bg-[#D6E6F2]/50 ${
                        i % 2 === 0 ? "bg-white" : "bg-[#F7FBFC]"
                      }`}
                      onClick={() =>
                        router.push(
                          `/matching/results/${result.applicantId}`
                        )
                      }
                    >
                      <TableCell className="font-medium text-[#769FCD] hover:text-[#4A7FB5]">
                        {result.applicantName}
                      </TableCell>
                      <TableCell className="text-sm text-[#7F8C9B]">
                        {result.positionTitle || "---"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            STATUS_COLORS[result.status] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {STATUS_LABELS[result.status] || result.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-sm font-bold border ${getScoreBadgeClasses(
                            result.totalScore
                          )}`}
                        >
                          {result.totalScore}
                          <span className="text-[10px] ml-0.5 font-normal">
                            ({getScoreLabel(result.totalScore)})
                          </span>
                        </Badge>
                      </TableCell>
                      {DIMENSION_IDS.map((dimId) => {
                        const score = getDimensionScore(result, dimId);
                        return (
                          <TableCell key={dimId} className="text-center">
                            <ScoreBadge score={score} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
