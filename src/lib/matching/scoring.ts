// ============================================
// マッチング スコアリングアルゴリズム
// ============================================

import { MATCHING_DIMENSIONS } from "./dimensions";
import type {
  DimensionId,
  DimensionScore,
  MatchingLevel,
  MatchingResultData,
  QuestionPair,
} from "./types";

// ============================================
// 1. 質問ペアごとのスコア計算
// ============================================

/**
 * リッカート7段階の乖離度スコア
 * 論拠: Kristof-Brown et al. (2005) の直接測定に基づくPE適合の算出
 *
 * gap=0 → 100, gap=1 → 83, gap=2 → 67, gap=3 → 50, gap=6 → 0
 */
export function scoreLikert7(
  employerValue: number,
  jobseekerValue: number
): number {
  const gap = Math.abs(employerValue - jobseekerValue);
  return Math.round((1 - gap / 6) * 100);
}

/**
 * 選択式（priority / range_select）のスコア
 * 完全一致=100, 1段階差=70, 2段階差=40, それ以上=20
 */
export function scorePriority(
  employerIndex: number,
  jobseekerIndex: number,
  _totalOptions: number
): number {
  if (employerIndex === jobseekerIndex) return 100;
  const gap = Math.abs(employerIndex - jobseekerIndex);
  if (gap === 1) return 70;
  if (gap === 2) return 40;
  return 20;
}

/**
 * 数値項目のスコア（DA適合用）
 * 求職者が要件を満たしていれば100。不足分に応じて減点。
 */
export function scoreNumericDA(required: number, actual: number): number {
  if (required <= 0) return 100;
  if (actual >= required) return 100;
  return Math.round((actual / required) * 100);
}

/**
 * 数値項目のスコア（NS適合用・非対称）
 * 論拠: Edwards (1991) - ニーズ充足は非対称効果
 * 法人の提供条件 >= 求職者の希望 → 100（ペナルティなし）
 * 法人の提供条件 < 求職者の希望 → 乖離度に応じて減点
 */
export function scoreNumericNS(
  supplied: number,
  needed: number,
  maxRange: number
): number {
  if (supplied >= needed) return 100;
  const gap = needed - supplied;
  return Math.max(0, Math.round((1 - gap / maxRange) * 100));
}

// ============================================
// 2. 次元別スコアの計算
// ============================================

export function calculateDimensionScore(
  pairs: QuestionPair[]
): DimensionScore {
  const pairScores = pairs.map((pair) => {
    let score = 50; // デフォルト
    let gap = 0;

    switch (pair.scaleType) {
      case "likert7": {
        const ev =
          (pair.employerAnswer?.value as number | undefined) ?? 4;
        const jv =
          (pair.jobseekerAnswer?.value as number | undefined) ?? 4;
        gap = Math.abs(ev - jv);
        score = scoreLikert7(ev, jv);
        break;
      }

      case "priority":
      case "range_select": {
        const ei =
          (pair.employerAnswer?.selected_index as number | undefined) ?? 0;
        const ji =
          (pair.jobseekerAnswer?.selected_index as number | undefined) ?? 0;
        gap = Math.abs(ei - ji);
        // NS次元のrange_selectは非対称スコアリング
        if (pair.dimension === "pj_ns" && pair.scaleType === "range_select") {
          score = ei >= ji ? 100 : scorePriority(ei, ji, 5);
        } else {
          score = scorePriority(ei, ji, 4);
        }
        break;
      }

      case "numeric": {
        const en =
          (pair.employerAnswer?.value as number | undefined) ?? 0;
        const jn =
          (pair.jobseekerAnswer?.value as number | undefined) ?? 0;
        gap = Math.abs(en - jn);
        if (pair.dimension === "pj_da") {
          score = scoreNumericDA(en, jn);
        } else {
          score = scoreNumericNS(en, jn, 30);
        }
        break;
      }
    }

    return { questionId: pair.questionId, score, gap };
  });

  const avgScore =
    pairScores.length > 0
      ? Math.round(
          pairScores.reduce((sum, p) => sum + p.score, 0) / pairScores.length
        )
      : 50;

  return {
    dimension: pairs[0]?.dimension ?? "po",
    score: avgScore,
    pairScores,
  };
}

// ============================================
// 3. 総合スコアの計算
// ============================================

export function calculateMatchingResult(
  allPairs: QuestionPair[]
): MatchingResultData {
  // 次元別にグループ化
  const grouped: Record<DimensionId, QuestionPair[]> = {
    po: [],
    pj_da: [],
    pj_ns: [],
    pg: [],
    ps: [],
  };
  for (const pair of allPairs) {
    grouped[pair.dimension]?.push(pair);
  }

  // 各次元のスコアを計算
  const dimensionScores = {} as Record<DimensionId, DimensionScore>;
  for (const [dimId, pairs] of Object.entries(grouped)) {
    if (pairs.length > 0) {
      dimensionScores[dimId as DimensionId] = calculateDimensionScore(pairs);
    } else {
      dimensionScores[dimId as DimensionId] = {
        dimension: dimId as DimensionId,
        score: 50,
        pairScores: [],
      };
    }
  }

  // 加重平均で総合スコアを計算
  let totalScore = 0;
  for (const [dimId, dim] of Object.entries(MATCHING_DIMENSIONS)) {
    totalScore +=
      (dimensionScores[dimId as DimensionId]?.score ?? 50) * dim.weight;
  }
  totalScore = Math.round(totalScore);

  // 強み・懸念の特定
  const sorted = Object.values(dimensionScores).sort(
    (a, b) => b.score - a.score
  );
  const strengths = sorted.slice(0, 2).map((d) => d.dimension);
  const concerns = sorted.slice(-2).map((d) => d.dimension);

  // 判定レベル
  let level: MatchingLevel = "low";
  if (totalScore >= 80) level = "high";
  else if (totalScore >= 65) level = "mid_high";
  else if (totalScore >= 50) level = "mid";

  return {
    totalScore,
    level,
    dimensionScores,
    strengths,
    concerns,
  };
}
