// ============================================
// マッチング5次元の定義と重み
// ============================================
//
// 重み配分の根拠:
// PO(25%) + PS(25%) = 50%: 医療機関は小規模組織が多く、
// 組織文化との一致(PO)と院長との相性(PS)が離職防止に最も影響する
// (Abdalla et al., 2021; Daniels et al., 2022)
// PJ-DA(20%): 臨床スキル・資格は必要条件として重要
// PJ-NS(15%) + PG(15%) = 30%: 条件面とチーム適合は交渉・調整可能な要素が多い

import type { DimensionConfig, DimensionId } from "./types";

export const MATCHING_DIMENSIONS: Record<DimensionId, DimensionConfig> = {
  po: {
    id: "po",
    name: "PO適合（組織-個人 価値観）",
    nameShort: "PO適合",
    description: "医療機関の理念・文化と求職者の価値観の一致度",
    theory:
      "Kristof-Brown et al. (2005): 職務満足度 ρ=.44, 組織コミットメント ρ=.51",
    weight: 0.25,
    color: "#2563EB",
  },
  pj_da: {
    id: "pj_da",
    name: "PJ適合（能力-要件）",
    nameShort: "PJ-DA",
    description: "求職者のスキル・経験と職務要件の一致度",
    theory: "Edwards (1991): Demands-Abilities Fit",
    weight: 0.2,
    color: "#059669",
  },
  pj_ns: {
    id: "pj_ns",
    name: "PJ適合（ニーズ-供給）",
    nameShort: "PJ-NS",
    description: "求職者の希望条件と医療機関が提供する条件の一致度",
    theory: "Cable & DeRue (2002): Needs-Supplies Fit",
    weight: 0.15,
    color: "#0891B2",
  },
  pg: {
    id: "pg",
    name: "PG適合（グループ）",
    nameShort: "PG適合",
    description: "既存チーム・スタッフとの協働スタイルの適合度",
    theory: "Xiao et al. (2021): PG fit → 職務満足度・専門的効力感",
    weight: 0.15,
    color: "#7C3AED",
  },
  ps: {
    id: "ps",
    name: "PS適合（上司-部下）",
    nameShort: "PS適合",
    description: "院長・理事長との価値観・ワークスタイルの一致度",
    theory:
      "Abdalla et al. (2021): 小規模医療機関でPS適合が離職防止に特に重要",
    weight: 0.25,
    color: "#DC2626",
  },
} as const;

/** 全次元IDの配列 */
export const DIMENSION_IDS: DimensionId[] = [
  "po",
  "pj_da",
  "pj_ns",
  "pg",
  "ps",
];
