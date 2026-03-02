"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Settings } from "lucide-react";
import {
  MATCHING_DIMENSIONS,
  DIMENSION_IDS,
} from "@/lib/matching/dimensions";
import type { DimensionId } from "@/lib/matching/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchingQuestion {
  id: string;
  code: string;
  dimension: string;
  side: string;
  pairCode: string | null;
  questionText: string;
  inputType: string;
  scaleOptions: Record<string, unknown> | null;
  orderIndex: number;
  isActive: boolean;
}

interface Position {
  id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Question Input Renderers
// ---------------------------------------------------------------------------

function Likert7Input({
  question,
  value,
  onChange,
}: {
  question: MatchingQuestion;
  value: number | null;
  onChange: (val: number) => void;
}) {
  const anchors = (question.scaleOptions as { anchors?: string[] })?.anchors ?? [
    "1",
    "7",
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-[#7F8C9B]">
        <span>{anchors[0]}</span>
        <span>{anchors[1]}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
              value === n
                ? "border-[#769FCD] bg-[#769FCD] text-white shadow-sm"
                : "border-[#D6E6F2] bg-white text-[#7F8C9B] hover:bg-[#F7FBFC] hover:border-[#B9D7EA]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriorityInput({
  question,
  value,
  onChange,
}: {
  question: MatchingQuestion;
  value: number | null;
  onChange: (val: number) => void;
}) {
  const options =
    (question.scaleOptions as { options?: string[] })?.options ?? [];

  return (
    <div className="space-y-2">
      {options.map((option, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onChange(idx)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
            value === idx
              ? "border-[#769FCD] bg-[#769FCD]/10 shadow-sm"
              : "border-[#D6E6F2] bg-white hover:bg-[#F7FBFC] hover:border-[#B9D7EA]"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
              value === idx
                ? "border-[#769FCD] bg-[#769FCD] text-white"
                : "border-[#B9D7EA] text-[#7F8C9B]"
            }`}
          >
            {idx + 1}
          </div>
          <span
            className={`text-sm ${
              value === idx
                ? "text-[#2C3E50] font-medium"
                : "text-[#7F8C9B]"
            }`}
          >
            {option}
          </span>
        </button>
      ))}
    </div>
  );
}

function NumericInput({
  question,
  value,
  onChange,
}: {
  question: MatchingQuestion;
  value: number | null;
  onChange: (val: number) => void;
}) {
  const unit =
    (question.scaleOptions as { unit?: string })?.unit ?? "";

  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        className="w-32 border-[#B9D7EA]"
        placeholder="0"
      />
      {unit && <span className="text-sm text-[#7F8C9B]">{unit}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MatchingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<DimensionId>("po");

  // --- Fetch questions ---
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/matching/questions?side=EMPLOYER");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
      toast.error("質問データの取得に失敗しました");
    }
  }, []);

  // --- Fetch existing answers ---
  const fetchAnswers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedPositionId) {
        params.set("positionId", selectedPositionId);
      }
      const res = await fetch(
        `/api/matching/employer/answers?${params}`
      );
      if (res.ok) {
        const data = await res.json();
        const answerMap: Record<string, Record<string, unknown>> = {};
        for (const a of data.answers || []) {
          answerMap[a.questionId] = a.answerValue as Record<string, unknown>;
        }
        setAnswers(answerMap);
      }
    } catch (err) {
      console.error("Failed to fetch answers:", err);
    }
  }, [selectedPositionId]);

  // --- Fetch positions ---
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/positions");
      if (res.ok) {
        const data = await res.json();
        setPositions(data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchQuestions(), fetchPositions()]);
      setLoading(false);
    };
    init();
  }, [fetchQuestions, fetchPositions]);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  // --- Group questions by dimension ---
  const DIMENSION_ENUM_MAP: Record<string, string> = {
    po: "PO",
    pj_da: "PJ_DA",
    pj_ns: "PJ_NS",
    pg: "PG",
    ps: "PS",
  };

  const questionsByDimension = DIMENSION_IDS.reduce(
    (acc, dimId) => {
      acc[dimId] = questions.filter(
        (q) => q.dimension === DIMENSION_ENUM_MAP[dimId]
      );
      return acc;
    },
    {} as Record<DimensionId, MatchingQuestion[]>
  );

  // --- Get answer value for a question ---
  const getAnswerValue = (questionId: string): number | null => {
    const answer = answers[questionId];
    if (!answer) return null;
    // For LIKERT7 and NUMERIC: { value: number }
    if (answer.value !== undefined) return answer.value as number;
    // For PRIORITY and RANGE_SELECT: { selected_index: number }
    if (answer.selected_index !== undefined) return answer.selected_index as number;
    return null;
  };

  // --- Set answer value ---
  const setAnswerValue = (
    questionId: string,
    inputType: string,
    val: number
  ) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (inputType === "LIKERT7" || inputType === "NUMERIC") {
        next[questionId] = { value: val };
      } else {
        // PRIORITY, RANGE_SELECT
        next[questionId] = { selected_index: val };
      }
      return next;
    });
  };

  // --- Calculate progress per dimension ---
  const getProgress = (dimId: DimensionId) => {
    const qs = questionsByDimension[dimId] || [];
    if (qs.length === 0) return { answered: 0, total: 0, percent: 0 };
    const answered = qs.filter((q) => getAnswerValue(q.id) !== null).length;
    return {
      answered,
      total: qs.length,
      percent: Math.round((answered / qs.length) * 100),
    };
  };

  // --- Save answers ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, answerValue]) => ({
        questionId,
        answerValue,
      }));

      if (answerList.length === 0) {
        toast.error("回答がありません");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/matching/employer/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: selectedPositionId || undefined,
          answers: answerList,
        }),
      });

      if (res.ok) {
        toast.success("マッチング設定を保存しました");
      } else {
        const data = await res.json();
        toast.error(data.error || "保存に失敗しました");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // --- Render question input ---
  const renderInput = (question: MatchingQuestion) => {
    const value = getAnswerValue(question.id);
    const onChange = (val: number) =>
      setAnswerValue(question.id, question.inputType, val);

    switch (question.inputType) {
      case "LIKERT7":
        return (
          <Likert7Input question={question} value={value} onChange={onChange} />
        );
      case "PRIORITY":
      case "RANGE_SELECT":
        return (
          <PriorityInput question={question} value={value} onChange={onChange} />
        );
      case "NUMERIC":
        return (
          <NumericInput question={question} value={value} onChange={onChange} />
        );
      default:
        return null;
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">
            マッチング設定
          </h1>
          <p className="text-[#7F8C9B]">
            組織・職場の特性を入力してマッチング診断の基準を設定します
          </p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2C3E50]">マッチング設定</h1>
        <p className="text-[#7F8C9B]">
          組織・職場の特性を入力してマッチング診断の基準を設定します
        </p>
      </div>

      {/* Position selector */}
      {positions.length > 0 && (
        <div className="flex items-center gap-3">
          <Settings className="w-4 h-4 text-[#7F8C9B]" />
          <span className="text-sm text-[#7F8C9B]">対象職種:</span>
          <Select
            value={selectedPositionId || "DEFAULT"}
            onValueChange={(v) =>
              setSelectedPositionId(v === "DEFAULT" ? "" : v)
            }
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="全体（デフォルト）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEFAULT">全体（デフォルト）</SelectItem>
              {positions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card className="border-[#B9D7EA]">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DimensionId)}
        >
          <div className="p-4 border-b border-[#D6E6F2]">
            <TabsList className="w-full flex-wrap">
              {DIMENSION_IDS.map((dimId) => {
                const dim = MATCHING_DIMENSIONS[dimId];
                const progress = getProgress(dimId);
                return (
                  <TabsTrigger key={dimId} value={dimId} className="gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: dim.color }}
                    />
                    <span className="hidden sm:inline">{dim.nameShort}</span>
                    <span className="sm:hidden">{dim.nameShort.slice(0, 2)}</span>
                    <Badge
                      variant="outline"
                      className="ml-1 text-[10px] px-1 py-0"
                    >
                      {progress.answered}/{progress.total}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {DIMENSION_IDS.map((dimId) => {
            const dim = MATCHING_DIMENSIONS[dimId];
            const qs = questionsByDimension[dimId] || [];
            const progress = getProgress(dimId);

            return (
              <TabsContent key={dimId} value={dimId}>
                <CardContent className="space-y-6 pt-6">
                  {/* Dimension header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: dim.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-[#2C3E50]">
                          {dim.name}
                        </h3>
                        <p className="text-xs text-[#7F8C9B]">
                          {dim.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-[#7F8C9B]">
                      {progress.answered} / {progress.total} 回答済
                    </span>
                  </div>

                  <Progress
                    value={progress.percent}
                    className="h-2 [&_[data-slot=progress-indicator]]:bg-[#769FCD]"
                  />

                  {/* Questions */}
                  {qs.length === 0 ? (
                    <div className="text-center py-8 text-[#7F8C9B]">
                      この次元の質問はありません
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {qs.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 bg-[#F7FBFC] rounded-xl border border-[#D6E6F2]"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <span className="text-sm font-medium text-[#769FCD] shrink-0">
                              Q{idx + 1}
                            </span>
                            <p className="text-sm font-medium text-[#2C3E50]">
                              {q.questionText}
                            </p>
                          </div>
                          {renderInput(q)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存する
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
