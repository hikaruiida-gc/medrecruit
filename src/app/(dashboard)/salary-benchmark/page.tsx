"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  Building2,
  TableIcon,
  Award,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SalaryBenchmarkEntry {
  prefecture: string;
  jobTitle: string;
  employmentType: "FULL_TIME" | "PART_TIME";
  median: number;
  percentile25: number;
  percentile75: number;
  min: number;
  max: number;
  sampleSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFECTURES = [
  "東京都",
  "大阪府",
  "愛知県",
  "福岡県",
  "北海道",
  "神奈川県",
  "埼玉県",
  "千葉県",
];

const JOB_TITLES = [
  "看護師",
  "歯科衛生士",
  "歯科助手",
  "医療事務",
  "理学療法士",
  "薬剤師",
  "作業療法士",
  "介護福祉士",
];

const PREMIUM_OPTIONS = [
  { id: "station", label: "駅徒歩5分以内", rate: 0.03 },
  { id: "nursery", label: "託児所完備", rate: 0.05 },
  { id: "days_off", label: "週休3日制", rate: 0.07 },
  { id: "no_overtime", label: "残業ほぼなし", rate: 0.02 },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUnit(employmentType: string): string {
  return employmentType === "FULL_TIME" ? "/月" : "/時";
}

function getMarketPositionLabel(
  value: number,
  p25: number,
  median: number,
  p75: number
): { label: string; color: string; bgColor: string } {
  if (value < p25) {
    return {
      label: "低すぎる",
      color: "text-red-700",
      bgColor: "bg-red-100 text-red-700 border-red-200",
    };
  }
  if (value >= p25 && value <= p75) {
    if (value < median) {
      return {
        label: "適正（低め）",
        color: "text-green-700",
        bgColor: "bg-green-100 text-green-700 border-green-200",
      };
    }
    return {
      label: "適正",
      color: "text-green-700",
      bgColor: "bg-green-100 text-green-700 border-green-200",
    };
  }
  return {
    label: "競争力あり",
    color: "text-blue-700",
    bgColor: "bg-blue-100 text-blue-700 border-blue-200",
  };
}

function computePercentilePosition(
  value: number,
  min: number,
  p25: number,
  median: number,
  p75: number,
  max: number
): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  if (value <= p25) return 0 + ((value - min) / (p25 - min)) * 25;
  if (value <= median) return 25 + ((value - p25) / (median - p25)) * 25;
  if (value <= p75) return 50 + ((value - median) / (p75 - median)) * 25;
  return 75 + ((value - p75) / (max - p75)) * 25;
}

function generateDistributionBuckets(entry: SalaryBenchmarkEntry) {
  const { min, max, percentile25, median, percentile75 } = entry;
  const range = max - min;
  const bucketCount = 10;
  const bucketWidth = range / bucketCount;

  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const lo = min + bucketWidth * i;
    const hi = lo + bucketWidth;
    const mid = (lo + hi) / 2;

    // Approximate a normal-ish distribution shape centered on the median
    const sigma = (percentile75 - percentile25) / 1.35; // IQR -> sigma
    const z = (mid - median) / sigma;
    const density = Math.exp(-0.5 * z * z);

    buckets.push({
      range:
        entry.employmentType === "FULL_TIME"
          ? `${Math.round(lo / 10000)}〜${Math.round(hi / 10000)}万`
          : `${Math.round(lo)}〜${Math.round(hi)}円`,
      rangeMin: lo,
      rangeMax: hi,
      percentage: Math.round(density * 100) / 100,
    });
  }

  // Normalize to sum to 100
  const total = buckets.reduce((s, b) => s + b.percentage, 0);
  for (const b of buckets) {
    b.percentage = Math.round((b.percentage / total) * 100 * 10) / 10;
  }

  return buckets.map((b) => ({
    ...b,
    isBelow25: b.rangeMax <= percentile25,
    is25to75: b.rangeMin >= percentile25 && b.rangeMax <= percentile75,
    isAbove75: b.rangeMin >= percentile75,
  }));
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SalaryBenchmarkPage() {
  // --- State ---
  const [prefecture, setPrefecture] = useState<string>("東京都");
  const [jobTitle, setJobTitle] = useState<string>("看護師");
  const [employmentType, setEmploymentType] = useState<
    "FULL_TIME" | "PART_TIME"
  >("FULL_TIME");
  const [allData, setAllData] = useState<SalaryBenchmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownSalary, setOwnSalary] = useState<number>(0);
  const [premiums, setPremiums] = useState<Record<string, boolean>>({
    station: false,
    nursery: false,
    days_off: false,
    no_overtime: false,
  });

  // --- Fetch all data once ---
  useEffect(() => {
    setLoading(true);
    fetch("/api/salary-benchmark")
      .then((res) => res.json())
      .then((data: SalaryBenchmarkEntry[]) => {
        setAllData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // --- Derived data ---
  const currentEntry = useMemo(
    () =>
      allData.find(
        (e) =>
          e.prefecture === prefecture &&
          e.jobTitle === jobTitle &&
          e.employmentType === employmentType
      ) ?? null,
    [allData, prefecture, jobTitle, employmentType]
  );

  // When entry changes, reset own salary to median
  useEffect(() => {
    if (currentEntry) {
      setOwnSalary(currentEntry.median);
    }
  }, [currentEntry]);

  // Premium adjustment
  const totalPremiumRate = useMemo(() => {
    return PREMIUM_OPTIONS.reduce(
      (sum, opt) => sum + (premiums[opt.id] ? opt.rate : 0),
      0
    );
  }, [premiums]);

  const adjustedRange = useMemo(() => {
    if (!currentEntry) return null;
    const mult = 1 + totalPremiumRate;
    return {
      min: Math.round(currentEntry.percentile25 * mult),
      recommended: Math.round(currentEntry.median * mult),
      max: Math.round(currentEntry.percentile75 * mult),
    };
  }, [currentEntry, totalPremiumRate]);

  // Slider bounds
  const sliderMin = currentEntry?.min ?? 0;
  const sliderMax = currentEntry?.max ?? 1;
  const sliderStep = employmentType === "FULL_TIME" ? 5000 : 50;

  // Distribution chart data
  const distributionData = useMemo(
    () => (currentEntry ? generateDistributionBuckets(currentEntry) : []),
    [currentEntry]
  );

  // Market position
  const marketPosition = useMemo(() => {
    if (!currentEntry) return null;
    return getMarketPositionLabel(
      ownSalary,
      currentEntry.percentile25,
      currentEntry.median,
      currentEntry.percentile75
    );
  }, [currentEntry, ownSalary]);

  const percentilePosition = useMemo(() => {
    if (!currentEntry) return 50;
    return computePercentilePosition(
      ownSalary,
      currentEntry.min,
      currentEntry.percentile25,
      currentEntry.median,
      currentEntry.percentile75,
      currentEntry.max
    );
  }, [currentEntry, ownSalary]);

  // Annual cost estimate (full-time only)
  const annualCost = useMemo(() => {
    if (employmentType !== "FULL_TIME") return null;
    // Monthly salary * 12 months + social insurance (~15%)
    return Math.round(ownSalary * 12 * 1.15);
  }, [ownSalary, employmentType]);

  // Comparison table data
  const comparisonData = useMemo(() => {
    return allData.filter(
      (e) => e.prefecture === prefecture && e.employmentType === employmentType
    );
  }, [allData, prefecture, employmentType]);

  const togglePremium = useCallback((id: string) => {
    setPremiums((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // --- Render ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">適正給与設定</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            エリアと職種に基づいた適正給与レンジを確認
          </p>
        </div>
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="py-16">
            <div className="text-center text-[#7F8C9B]">
              データを読み込み中...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Page Header --- */}
      <div>
        <h1 className="text-2xl font-bold text-[#2C3E50]">適正給与設定</h1>
        <p className="text-sm text-[#7F8C9B] mt-1">
          エリアと職種に基づいた適正給与レンジを確認
        </p>
      </div>

      {/* --- A. Selection Panel --- */}
      <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#769FCD]" />
            条件選択
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Prefecture */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2C3E50]">
                都道府県
              </label>
              <Select value={prefecture} onValueChange={setPrefecture}>
                <SelectTrigger className="w-full border-[#B9D7EA]">
                  <SelectValue placeholder="都道府県を選択" />
                </SelectTrigger>
                <SelectContent>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2C3E50]">
                職種
              </label>
              <Select value={jobTitle} onValueChange={setJobTitle}>
                <SelectTrigger className="w-full border-[#B9D7EA]">
                  <SelectValue placeholder="職種を選択" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TITLES.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment type toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2C3E50]">
                雇用形態
              </label>
              <div className="flex rounded-lg border border-[#B9D7EA] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEmploymentType("FULL_TIME")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    employmentType === "FULL_TIME"
                      ? "bg-[#769FCD] text-white"
                      : "bg-white text-[#2C3E50] hover:bg-[#D6E6F2]"
                  }`}
                >
                  常勤
                </button>
                <button
                  type="button"
                  onClick={() => setEmploymentType("PART_TIME")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    employmentType === "PART_TIME"
                      ? "bg-[#769FCD] text-white"
                      : "bg-white text-[#2C3E50] hover:bg-[#D6E6F2]"
                  }`}
                >
                  パート
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentEntry && (
        <>
          {/* --- B. Salary Distribution Chart --- */}
          <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#769FCD]" />
                給与分布（{currentEntry.prefecture} / {currentEntry.jobTitle}）
                <span className="text-xs font-normal text-[#7F8C9B] ml-2">
                  サンプル数: {currentEntry.sampleSize.toLocaleString()}件
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={distributionData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6E6F2" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11, fill: "#7F8C9B" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#7F8C9B" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "割合"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #B9D7EA",
                    }}
                  />
                  {/* Percentile reference lines */}
                  <ReferenceLine
                    x={distributionData.find(
                      (b) =>
                        currentEntry.percentile25 >= b.rangeMin &&
                        currentEntry.percentile25 < b.rangeMax
                    )?.range}
                    stroke="#F0AD4E"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: "25%ile",
                      position: "top",
                      fill: "#F0AD4E",
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    x={distributionData.find(
                      (b) =>
                        currentEntry.median >= b.rangeMin &&
                        currentEntry.median < b.rangeMax
                    )?.range}
                    stroke="#5CB85C"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: "中央値",
                      position: "top",
                      fill: "#5CB85C",
                      fontSize: 11,
                    }}
                  />
                  <ReferenceLine
                    x={distributionData.find(
                      (b) =>
                        currentEntry.percentile75 >= b.rangeMin &&
                        currentEntry.percentile75 < b.rangeMax
                    )?.range}
                    stroke="#769FCD"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: "75%ile",
                      position: "top",
                      fill: "#769FCD",
                      fontSize: 11,
                    }}
                  />
                  {/* Own salary marker */}
                  <ReferenceLine
                    x={distributionData.find(
                      (b) =>
                        ownSalary >= b.rangeMin && ownSalary < b.rangeMax
                    )?.range}
                    stroke="#E74C3C"
                    strokeWidth={2}
                    label={{
                      value: "自院設定値",
                      position: "top",
                      fill: "#E74C3C",
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {distributionData.map((entry, idx) => {
                      let color = "#D6E6F2";
                      if (entry.is25to75) color = "#769FCD";
                      else if (entry.isBelow25) color = "#B9D7EA";
                      else if (entry.isAbove75) color = "#B9D7EA";
                      return <Cell key={idx} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs text-[#7F8C9B]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-[#769FCD] inline-block" />
                  25〜75パーセンタイル
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-[#B9D7EA] inline-block" />
                  その他の範囲
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-[#E74C3C] inline-block" />
                  自院設定値
                </span>
              </div>
            </CardContent>
          </Card>

          {/* --- C. Salary Benchmark Card + D. Simulation --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C. Benchmark Summary */}
            <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#769FCD]" />
                  給与ベンチマーク
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Recommendation range */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                    <p className="text-xs text-[#7F8C9B] mb-1">推奨下限</p>
                    <p className="text-lg font-bold text-[#2C3E50]">
                      {adjustedRange
                        ? formatCurrency(adjustedRange.min)
                        : "-"}
                    </p>
                    <p className="text-xs text-[#7F8C9B]">
                      {formatUnit(employmentType)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-[#769FCD]/10 rounded-lg border border-[#769FCD]/30">
                    <p className="text-xs text-[#769FCD] font-medium mb-1">
                      推奨値
                    </p>
                    <p className="text-xl font-bold text-[#769FCD]">
                      {adjustedRange
                        ? formatCurrency(adjustedRange.recommended)
                        : "-"}
                    </p>
                    <p className="text-xs text-[#7F8C9B]">
                      {formatUnit(employmentType)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                    <p className="text-xs text-[#7F8C9B] mb-1">推奨上限</p>
                    <p className="text-lg font-bold text-[#2C3E50]">
                      {adjustedRange
                        ? formatCurrency(adjustedRange.max)
                        : "-"}
                    </p>
                    <p className="text-xs text-[#7F8C9B]">
                      {formatUnit(employmentType)}
                    </p>
                  </div>
                </div>

                {/* Own salary position */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#2C3E50]">
                      自院設定値: {formatCurrency(ownSalary)}
                      {formatUnit(employmentType)}
                    </span>
                    {marketPosition && (
                      <Badge
                        className={`${marketPosition.bgColor} border text-xs px-2 py-0.5`}
                      >
                        {marketPosition.label}
                      </Badge>
                    )}
                  </div>

                  {/* Percentile bar */}
                  <div className="relative">
                    <div className="h-3 bg-gradient-to-r from-red-200 via-green-200 to-blue-200 rounded-full" />
                    <div
                      className="absolute top-0 w-4 h-4 -mt-0.5 bg-[#2C3E50] rounded-full border-2 border-white shadow"
                      style={{
                        left: `calc(${Math.min(Math.max(percentilePosition, 0), 100)}% - 8px)`,
                      }}
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-[#7F8C9B]">
                      <span>最低</span>
                      <span>25%</span>
                      <span>中央値</span>
                      <span>75%</span>
                      <span>最高</span>
                    </div>
                  </div>

                  <p className="text-sm text-[#7F8C9B] text-center">
                    市場順位: 上位約{" "}
                    <span className="font-semibold text-[#2C3E50]">
                      {Math.round(100 - percentilePosition)}%
                    </span>
                  </p>
                </div>

                {totalPremiumRate > 0 && (
                  <div className="p-3 bg-[#F0AD4E]/10 rounded-lg border border-[#F0AD4E]/30">
                    <p className="text-xs text-[#F0AD4E] font-medium">
                      プレミアム調整: +{Math.round(totalPremiumRate * 100)}%
                      適用中
                    </p>
                    <p className="text-xs text-[#7F8C9B] mt-1">
                      推奨値は院の特徴に基づき上方修正されています
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* D. Salary Simulation Slider */}
            <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#769FCD]" />
                  給与シミュレーション
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Current value display */}
                <div className="text-center">
                  <p className="text-sm text-[#7F8C9B] mb-1">
                    設定給与{employmentType === "FULL_TIME" ? "（月給）" : "（時給）"}
                  </p>
                  <p className="text-3xl font-bold text-[#2C3E50]">
                    {formatCurrency(ownSalary)}
                  </p>
                </div>

                {/* Slider */}
                <div className="px-2">
                  <Slider
                    value={[ownSalary]}
                    onValueChange={(v) => setOwnSalary(v[0])}
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    className="[&_[data-slot=slider-track]]:bg-[#D6E6F2] [&_[data-slot=slider-range]]:bg-[#769FCD] [&_[data-slot=slider-thumb]]:border-[#769FCD]"
                  />
                  <div className="flex justify-between mt-1 text-xs text-[#7F8C9B]">
                    <span>{formatCurrency(sliderMin)}</span>
                    <span>{formatCurrency(sliderMax)}</span>
                  </div>
                </div>

                {/* Position indicator bar (simple visual) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#7F8C9B]">
                    <span>市場ポジション</span>
                    <span className="font-medium text-[#2C3E50]">
                      {Math.round(percentilePosition)}パーセンタイル
                    </span>
                  </div>
                  <div className="relative h-6 bg-[#F7FBFC] rounded-full border border-[#D6E6F2] overflow-hidden">
                    {/* 25-75 range highlight */}
                    <div
                      className="absolute h-full bg-[#D6E6F2]"
                      style={{ left: "25%", width: "50%" }}
                    />
                    {/* Position marker */}
                    <div
                      className="absolute h-full w-1 bg-[#E74C3C]"
                      style={{
                        left: `${Math.min(Math.max(percentilePosition, 0), 100)}%`,
                      }}
                    />
                    {/* Labels */}
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#7F8C9B]">
                      適正レンジ (25%〜75%)
                    </div>
                  </div>
                </div>

                {/* Annual cost estimate (full-time only) */}
                {annualCost !== null && (
                  <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                    <p className="text-sm text-[#7F8C9B] mb-1">
                      年間人件費概算（社会保険料 約15%込み）
                    </p>
                    <p className="text-2xl font-bold text-[#2C3E50]">
                      {formatCurrency(annualCost)}
                    </p>
                    <p className="text-xs text-[#7F8C9B] mt-1">
                      = {formatCurrency(ownSalary)} x 12ヶ月 x 1.15
                    </p>
                  </div>
                )}

                {/* Part-time annual estimate */}
                {employmentType === "PART_TIME" && (
                  <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                    <p className="text-sm text-[#7F8C9B] mb-1">
                      参考: フルタイム換算月収（160時間/月）
                    </p>
                    <p className="text-2xl font-bold text-[#2C3E50]">
                      {formatCurrency(ownSalary * 160)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- F. Premium Calculation --- */}
          <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#769FCD]" />
                プレミアム調整（院の特徴）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#7F8C9B] mb-4">
                自院の特徴を選択すると、推奨給与レンジが自動調整されます。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PREMIUM_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      premiums[opt.id]
                        ? "border-[#769FCD] bg-[#769FCD]/5"
                        : "border-[#D6E6F2] bg-white hover:bg-[#F7FBFC]"
                    }`}
                  >
                    <Checkbox
                      checked={premiums[opt.id]}
                      onCheckedChange={() => togglePremium(opt.id)}
                    />
                    <div>
                      <span className="text-sm font-medium text-[#2C3E50]">
                        {opt.label}
                      </span>
                      <span className="block text-xs text-[#5CB85C]">
                        +{Math.round(opt.rate * 100)}%
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {totalPremiumRate > 0 && adjustedRange && (
                <div className="mt-4 p-4 bg-[#5CB85C]/10 rounded-lg border border-[#5CB85C]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#2C3E50]">
                      調整後の推奨給与レンジ
                    </span>
                    <Badge className="bg-[#5CB85C] text-white border-none text-xs">
                      +{Math.round(totalPremiumRate * 100)}% 調整
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-[#2C3E50] mt-2">
                    {formatCurrency(adjustedRange.min)} 〜{" "}
                    {formatCurrency(adjustedRange.max)}
                    {formatUnit(employmentType)}
                  </p>
                  <p className="text-sm text-[#7F8C9B] mt-1">
                    推奨値: {formatCurrency(adjustedRange.recommended)}
                    {formatUnit(employmentType)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* --- E. Job Comparison Table --- */}
          <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-[#769FCD]" />
                職種別比較（{prefecture} /{" "}
                {employmentType === "FULL_TIME" ? "常勤" : "パート"}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#D6E6F2]">
                    <TableHead className="text-[#2C3E50] font-semibold">
                      職種
                    </TableHead>
                    <TableHead className="text-[#2C3E50] font-semibold text-right">
                      中央値
                    </TableHead>
                    <TableHead className="text-[#2C3E50] font-semibold text-right">
                      25%ile
                    </TableHead>
                    <TableHead className="text-[#2C3E50] font-semibold text-right">
                      75%ile
                    </TableHead>
                    <TableHead className="text-[#2C3E50] font-semibold text-right">
                      自院設定値
                    </TableHead>
                    <TableHead className="text-[#2C3E50] font-semibold text-center">
                      市場位置
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((entry) => {
                    const isCurrentJob = entry.jobTitle === jobTitle;
                    const displaySalary = isCurrentJob
                      ? ownSalary
                      : entry.median;
                    const position = getMarketPositionLabel(
                      displaySalary,
                      entry.percentile25,
                      entry.median,
                      entry.percentile75
                    );
                    return (
                      <TableRow
                        key={entry.jobTitle}
                        className={
                          isCurrentJob ? "bg-[#769FCD]/5" : undefined
                        }
                      >
                        <TableCell className="font-medium text-[#2C3E50]">
                          <div className="flex items-center gap-2">
                            {entry.jobTitle}
                            {isCurrentJob && (
                              <Building2 className="w-3 h-3 text-[#769FCD]" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[#2C3E50]">
                          {formatCurrency(entry.median)}
                        </TableCell>
                        <TableCell className="text-right text-[#7F8C9B]">
                          {formatCurrency(entry.percentile25)}
                        </TableCell>
                        <TableCell className="text-right text-[#7F8C9B]">
                          {formatCurrency(entry.percentile75)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[#2C3E50]">
                          {isCurrentJob
                            ? formatCurrency(ownSalary)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCurrentJob ? (
                            <Badge
                              className={`${position.bgColor} border text-xs px-2 py-0.5`}
                            >
                              {position.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#7F8C9B]">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!currentEntry && !loading && (
        <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
          <CardContent className="py-12">
            <div className="text-center text-[#7F8C9B]">
              <DollarSign className="w-12 h-12 mx-auto text-[#B9D7EA] mb-3" />
              <p>選択された条件のデータが見つかりませんでした。</p>
              <p className="text-sm mt-1">
                都道府県と職種を変更してお試しください。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
