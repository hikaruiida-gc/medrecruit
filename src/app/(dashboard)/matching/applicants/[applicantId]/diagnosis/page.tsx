"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { MATCHING_DIMENSIONS } from "@/lib/matching/dimensions";
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

interface ApplicantInfo {
  id: string;
  lastName: string;
  firstName: string;
}

// Map DB dimension enum to local DimensionId
function toDimensionId(dimension: string): DimensionId {
  const map: Record<string, DimensionId> = {
    PO: "po",
    PJ_DA: "pj_da",
    PJ_NS: "pj_ns",
    PG: "pg",
    PS: "ps",
  };
  return map[dimension] ?? "po";
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
            className={`flex-1 h-12 rounded-lg border text-sm font-medium transition-all ${
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
          className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
            value === idx
              ? "border-[#769FCD] bg-[#769FCD]/10 shadow-sm"
              : "border-[#D6E6F2] bg-white hover:bg-[#F7FBFC] hover:border-[#B9D7EA]"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium shrink-0 ${
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
        className="w-32 border-[#B9D7EA] text-lg"
        placeholder="0"
      />
      {unit && (
        <span className="text-sm text-[#7F8C9B]">{unit}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ApplicantDiagnosisPage({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  const { applicantId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<MatchingQuestion[]>([]);
  const [answers, setAnswers] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- Fetch applicant info ---
  const fetchApplicant = useCallback(async () => {
    try {
      const res = await fetch(`/api/applicants/${applicantId}`);
      if (res.ok) {
        const data = await res.json();
        setApplicant({
          id: data.id,
          lastName: data.lastName,
          firstName: data.firstName,
        });
      }
    } catch (err) {
      console.error("Failed to fetch applicant:", err);
    }
  }, [applicantId]);

  // --- Fetch jobseeker questions ---
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/matching/questions?side=JOBSEEKER");
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
      const res = await fetch(
        `/api/matching/jobseeker/answers?applicantId=${applicantId}`
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
  }, [applicantId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchApplicant(), fetchQuestions(), fetchAnswers()]);
      setLoading(false);
    };
    init();
  }, [fetchApplicant, fetchQuestions, fetchAnswers]);

  // --- Get answer value for current question ---
  const getAnswerValue = (questionId: string): number | null => {
    const answer = answers[questionId];
    if (!answer) return null;
    if (answer.value !== undefined) return answer.value as number;
    if (answer.selected_index !== undefined)
      return answer.selected_index as number;
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
        next[questionId] = { selected_index: val };
      }
      return next;
    });
  };

  // --- Navigation ---
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Save answers
      const answerList = Object.entries(answers).map(
        ([questionId, answerValue]) => ({
          questionId,
          answerValue,
        })
      );

      if (answerList.length === 0) {
        toast.error("回答がありません");
        setSubmitting(false);
        return;
      }

      const saveRes = await fetch("/api/matching/jobseeker/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId,
          answers: answerList,
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        toast.error(data.error || "回答の保存に失敗しました");
        setSubmitting(false);
        return;
      }

      // Trigger calculation
      const calcRes = await fetch("/api/matching/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId }),
      });

      if (!calcRes.ok) {
        const data = await calcRes.json();
        toast.error(data.error || "スコア計算に失敗しました");
        setSubmitting(false);
        return;
      }

      toast.success("診断が完了しました");
      router.push(`/matching/results/${applicantId}`);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("診断の完了に失敗しました");
    } finally {
      setSubmitting(false);
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
      <div className="max-w-2xl mx-auto space-y-6">
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

  // --- Submitting state ---
  if (submitting) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-[#B9D7EA]">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4 text-[#7F8C9B]">
              <Loader2 className="w-12 h-12 animate-spin text-[#769FCD]" />
              <p className="text-lg font-medium text-[#2C3E50]">
                診断結果を計算中...
              </p>
              <p className="text-sm">
                回答内容を基にマッチングスコアを算出しています
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-[#B9D7EA]">
          <CardContent className="py-16 text-center">
            <p className="text-[#7F8C9B]">質問データがありません</p>
            <Link href={`/applicants/${applicantId}`}>
              <Button variant="outline" className="mt-4 border-[#B9D7EA] text-[#769FCD]">
                戻る
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentIndex];
  const dimId = toDimensionId(question.dimension);
  const dim = MATCHING_DIMENSIONS[dimId];
  const total = questions.length;
  const isLast = currentIndex === total - 1;
  const currentValue = getAnswerValue(question.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/applicants/${applicantId}`}
          className="flex items-center gap-1 text-sm text-[#769FCD] hover:text-[#4A7FB5] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>
        <span className="text-[#7F8C9B] text-sm">
          {currentIndex + 1} / {total}問
        </span>
      </div>

      {/* Applicant name */}
      {applicant && (
        <div className="text-center">
          <p className="text-sm text-[#7F8C9B]">応募者:</p>
          <h2 className="text-lg font-semibold text-[#2C3E50]">
            {applicant.lastName} {applicant.firstName}
          </h2>
        </div>
      )}

      {/* Progress bar */}
      <Progress
        value={((currentIndex + 1) / total) * 100}
        className="h-2 [&_[data-slot=progress-indicator]]:bg-[#769FCD]"
      />

      {/* Question card */}
      <Card className="border-[#B9D7EA] p-6">
        <CardContent className="p-0 space-y-5">
          <Badge
            className="text-white text-xs"
            style={{ backgroundColor: dim.color }}
          >
            {dim.nameShort}
          </Badge>
          <h2 className="text-lg font-semibold text-[#2C3E50] mt-3">
            {question.questionText}
          </h2>
          {renderInput(question)}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          前へ
        </Button>
        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={currentValue === null}
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white disabled:opacity-50"
          >
            診断を完了する
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={currentValue === null}
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white disabled:opacity-50"
          >
            次へ
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
