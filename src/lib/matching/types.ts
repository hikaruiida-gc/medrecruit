// ============================================
// マッチング機能 型定義
// ============================================

/** マッチング5次元のID */
export type DimensionId = "po" | "pj_da" | "pj_ns" | "pg" | "ps";

/** スケールタイプ */
export type ScaleType = "likert7" | "priority" | "range_select" | "numeric";

/** 次元の設定情報 */
export interface DimensionConfig {
  id: DimensionId;
  name: string;
  nameShort: string;
  description: string;
  theory: string;
  weight: number;
  color: string;
}

/** 質問ペア（採用者側+求職者側の回答を紐付けたもの） */
export interface QuestionPair {
  questionId: string;
  dimension: DimensionId;
  scaleType: ScaleType;
  employerAnswer: Record<string, unknown> | null;
  jobseekerAnswer: Record<string, unknown> | null;
}

/** 次元別スコア */
export interface DimensionScore {
  dimension: DimensionId;
  score: number; // 0-100
  pairScores: PairScore[];
}

/** 個別質問ペアのスコア */
export interface PairScore {
  questionId: string;
  score: number;
  gap: number;
}

/** 判定レベル */
export type MatchingLevel = "high" | "mid_high" | "mid" | "low";

/** マッチング結果 */
export interface MatchingResultData {
  totalScore: number; // 0-100
  level: MatchingLevel;
  dimensionScores: Record<DimensionId, DimensionScore>;
  strengths: DimensionId[]; // 上位2次元
  concerns: DimensionId[]; // 下位2次元
}

/** レポートコメントの種類 */
export type ReportCommentType = "strength" | "concern" | "action";

/** レポートコメント */
export interface ReportComment {
  type: ReportCommentType;
  dimension: DimensionId;
  text: string;
}

/** シードデータ用の質問定義 */
export interface SeedQuestion {
  code: string;
  dimension: "PO" | "PJ_DA" | "PJ_NS" | "PG" | "PS";
  side: "EMPLOYER" | "JOBSEEKER";
  pairCode: string | null;
  questionText: string;
  inputType: "LIKERT7" | "PRIORITY" | "RANGE_SELECT" | "NUMERIC";
  scaleOptions: Record<string, unknown> | null;
  orderIndex: number;
  isActive: boolean;
}
