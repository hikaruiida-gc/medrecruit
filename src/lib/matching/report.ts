// ============================================
// マッチング レポートコメント自動生成
// ============================================

import { MATCHING_DIMENSIONS } from "./dimensions";
import type {
  DimensionId,
  DimensionScore,
  MatchingResultData,
  ReportComment,
} from "./types";

// --- 強みコメントテンプレート ---
function getStrengthText(dim: DimensionId, score: DimensionScore): string {
  const templates: Record<DimensionId, string> = {
    po: `医療機関の理念・診療方針と求職者の価値観が高い一致を示しています（${score.score}%）。Daniels et al. (2022) の知見から、価値観の一致は職務満足度とケアの質に直結します。`,
    pj_da: `求職者のスキル・経験が求める要件を十分に満たしています（${score.score}%）。即戦力としての貢献が期待できます。`,
    pj_ns: `労働条件面での希望と提供条件がよく合致しています（${score.score}%）。入職後の条件面での不満が生じにくいと考えられます。`,
    pg: `既存チームとの協働スタイルの適合度が高いです（${score.score}%）。スムーズなチーム統合が期待できます。`,
    ps: `院長のマネジメントスタイルと求職者の希望が高い一致を示しています（${score.score}%）。Abdalla et al. (2021) によれば、上司適合は医療機関での離職防止に特に重要です。`,
  };
  return templates[dim];
}

// --- 懸念コメントテンプレート ---
function getConcernText(dim: DimensionId, score: DimensionScore): string {
  const templates: Record<DimensionId, string> = {
    po: `組織の価値観と求職者の価値観にやや乖離が見られます（${score.score}%）。特に診療方針や変化への姿勢について認識の差がある可能性があります。`,
    pj_da: `求められるスキル・経験レベルに対して不足が見られます（${score.score}%）。育成計画の検討が必要かもしれません。`,
    pj_ns: `労働条件面での希望と提供条件に差があります（${score.score}%）。給与・勤務時間・休暇制度などについて要確認です。`,
    pg: `既存チームとの協働スタイルにやや差があります（${score.score}%）。コミュニケーション方法や業務分担の考え方について擦り合わせが必要です。`,
    ps: `院長のスタイルと求職者の希望にやや乖離があります（${score.score}%）。指示の出し方や評価の仕方について面接での確認を推奨します。`,
  };
  return templates[dim];
}

// --- 推奨アクションテンプレート ---
function getActionText(dim: DimensionId, _score: DimensionScore): string {
  const templates: Record<DimensionId, string> = {
    po: `面接で「理想の職場像」「大切にしている仕事の価値観」について対話し、期待値の擦り合わせを行ってください。`,
    pj_da: `体験勤務やスキルチェックの実施を検討してください。不足スキルがある場合、入職後の研修計画を事前に提示すると効果的です。`,
    pj_ns: `面接で具体的な労働条件（給与・残業・休暇等）を率直に話し合い、双方の期待値を明確にしてください。`,
    pg: `可能であれば既存スタッフとの顔合わせや見学の機会を設けてください。チームの雰囲気を事前に体感してもらうことで入職後のギャップを防げます。`,
    ps: `面接で院長の普段のコミュニケーションスタイルや、期待する報連相の頻度について具体的に伝えてください。`,
  };
  return templates[dim];
}

/**
 * マッチング結果からレポートコメントを自動生成する
 *
 * - スコア >= 80 の次元 → 強みコメント
 * - スコア < 60 の次元 → 懸念コメント + 推奨アクション
 */
export function generateReportComments(
  result: MatchingResultData
): ReportComment[] {
  const comments: ReportComment[] = [];

  for (const [dimId, dimScore] of Object.entries(result.dimensionScores)) {
    const _dim = MATCHING_DIMENSIONS[dimId as DimensionId];

    if (dimScore.score >= 80) {
      comments.push({
        type: "strength",
        dimension: dimId as DimensionId,
        text: getStrengthText(dimId as DimensionId, dimScore),
      });
    }

    if (dimScore.score < 60) {
      comments.push({
        type: "concern",
        dimension: dimId as DimensionId,
        text: getConcernText(dimId as DimensionId, dimScore),
      });
      comments.push({
        type: "action",
        dimension: dimId as DimensionId,
        text: getActionText(dimId as DimensionId, dimScore),
      });
    }
  }

  return comments;
}
