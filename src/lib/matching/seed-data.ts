// ============================================
// マッチング質問 シードデータ
// 全58問（採用者29問 + 求職者29問）
// ============================================

import type { SeedQuestion } from "./types";

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ============================================
  // PO適合（組織-個人 価値観）— 採用者側 6問
  // ============================================
  {
    code: "PO_E1",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J1",
    questionText: "当院が最も重視する診療方針はどれですか？",
    inputType: "PRIORITY",
    scaleOptions: {
      options: [
        "患者満足度の最大化",
        "エビデンスに基づく標準治療",
        "最先端医療の積極導入",
        "地域のかかりつけ医としての役割",
      ],
    },
    orderIndex: 1,
    isActive: true,
  },
  {
    code: "PO_E2",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J2",
    questionText: "スタッフに求める仕事への取り組み姿勢は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["与えられた業務を正確にこなす", "自ら課題を見つけて改善する"],
    },
    orderIndex: 2,
    isActive: true,
  },
  {
    code: "PO_E3",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J3",
    questionText: "患者対応において最も重視する点は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "効率的でスピーディーな対応",
        "一人ひとりに丁寧で時間をかけた対応",
      ],
    },
    orderIndex: 3,
    isActive: true,
  },
  {
    code: "PO_E4",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J4",
    questionText: "院内の雰囲気として理想的なのは？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["規律正しくプロフェッショナル", "アットホームで和やか"],
    },
    orderIndex: 4,
    isActive: true,
  },
  {
    code: "PO_E5",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J5",
    questionText: "スタッフの教育・研修への方針は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["OJT中心で実務から学ぶ", "外部研修や資格取得を積極支援"],
    },
    orderIndex: 5,
    isActive: true,
  },
  {
    code: "PO_E6",
    dimension: "PO",
    side: "EMPLOYER",
    pairCode: "PO_J6",
    questionText: "新しい取り組みや変化への姿勢は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["安定した運営を最重視", "積極的に新しいことを取り入れる"],
    },
    orderIndex: 6,
    isActive: true,
  },

  // ============================================
  // PO適合（組織-個人 価値観）— 求職者側 6問
  // ============================================
  {
    code: "PO_J1",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E1",
    questionText: "あなたが最も共感する診療方針はどれですか？",
    inputType: "PRIORITY",
    scaleOptions: {
      options: [
        "患者満足度の最大化",
        "エビデンスに基づく標準治療",
        "最先端医療の積極導入",
        "地域のかかりつけ医としての役割",
      ],
    },
    orderIndex: 7,
    isActive: true,
  },
  {
    code: "PO_J2",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E2",
    questionText: "あなたの仕事への取り組みスタイルは？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "与えられた業務を正確にこなす方が得意",
        "自ら課題を見つけて改善する方が得意",
      ],
    },
    orderIndex: 8,
    isActive: true,
  },
  {
    code: "PO_J3",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E3",
    questionText: "患者対応で自分が大切にしている点は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "効率的でスピーディーな対応",
        "一人ひとりに丁寧で時間をかけた対応",
      ],
    },
    orderIndex: 9,
    isActive: true,
  },
  {
    code: "PO_J4",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E4",
    questionText: "どんな雰囲気の職場が働きやすいですか？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["規律正しくプロフェッショナル", "アットホームで和やか"],
    },
    orderIndex: 10,
    isActive: true,
  },
  {
    code: "PO_J5",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E5",
    questionText: "スキルアップについての考え方は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "実務の中で自然に学びたい",
        "研修や資格取得に積極的に取り組みたい",
      ],
    },
    orderIndex: 11,
    isActive: true,
  },
  {
    code: "PO_J6",
    dimension: "PO",
    side: "JOBSEEKER",
    pairCode: "PO_E6",
    questionText: "職場の変化についての考え方は？",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "安定した環境で長く働きたい",
        "新しいことに挑戦できる環境が好き",
      ],
    },
    orderIndex: 12,
    isActive: true,
  },

  // ============================================
  // PJ適合 DA（能力-要件）— 採用者側 6問
  // ============================================
  {
    code: "DA_E1",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J1",
    questionText: "求める実務経験年数",
    inputType: "NUMERIC",
    scaleOptions: { unit: "年以上", min: 0, max: 30 },
    orderIndex: 13,
    isActive: true,
  },
  {
    code: "DA_E2",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J2",
    questionText: "即戦力を求める度合い",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["未経験でも育てる方針", "即戦力を強く求める"],
    },
    orderIndex: 14,
    isActive: true,
  },
  {
    code: "DA_E3",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J3",
    questionText: "PCスキル（電子カルテ・レセコン等）の重要度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["ほぼ不要", "高度なスキルが必要"],
    },
    orderIndex: 15,
    isActive: true,
  },
  {
    code: "DA_E4",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J4",
    questionText: "コミュニケーション能力の重要度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["最低限でよい", "非常に高いレベルを求める"],
    },
    orderIndex: 16,
    isActive: true,
  },
  {
    code: "DA_E5",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J5",
    questionText: "マルチタスク対応力の必要度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["単一業務に集中できる", "複数業務の同時対応が必要"],
    },
    orderIndex: 17,
    isActive: true,
  },
  {
    code: "DA_E6",
    dimension: "PJ_DA",
    side: "EMPLOYER",
    pairCode: "DA_J6",
    questionText: "専門資格以外に期待する能力は？",
    inputType: "PRIORITY",
    scaleOptions: {
      options: [
        "接遇・ホスピタリティ",
        "チームワーク・協調性",
        "リーダーシップ",
        "正確性・几帳面さ",
      ],
    },
    orderIndex: 18,
    isActive: true,
  },

  // ============================================
  // PJ適合 DA（能力-要件）— 求職者側 6問
  // ============================================
  {
    code: "DA_J1",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E1",
    questionText: "実務経験年数",
    inputType: "NUMERIC",
    scaleOptions: { unit: "年", min: 0, max: 40 },
    orderIndex: 19,
    isActive: true,
  },
  {
    code: "DA_J2",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E2",
    questionText: "現時点でのスキルレベルの自己評価",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["経験が浅く学びながら働きたい", "即戦力として貢献できる"],
    },
    orderIndex: 20,
    isActive: true,
  },
  {
    code: "DA_J3",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E3",
    questionText: "PCスキル（電子カルテ・レセコン等）の習熟度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["ほぼ未経験", "高度に使いこなせる"],
    },
    orderIndex: 21,
    isActive: true,
  },
  {
    code: "DA_J4",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E4",
    questionText: "コミュニケーション能力の自己評価",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "控えめな方",
        "積極的にコミュニケーションを取る方",
      ],
    },
    orderIndex: 22,
    isActive: true,
  },
  {
    code: "DA_J5",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E5",
    questionText: "マルチタスクへの対応力",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "一つのことに集中する方が得意",
        "複数の業務を同時にこなせる",
      ],
    },
    orderIndex: 23,
    isActive: true,
  },
  {
    code: "DA_J6",
    dimension: "PJ_DA",
    side: "JOBSEEKER",
    pairCode: "DA_E6",
    questionText: "自分の最大の強みは？",
    inputType: "PRIORITY",
    scaleOptions: {
      options: [
        "接遇・ホスピタリティ",
        "チームワーク・協調性",
        "リーダーシップ",
        "正確性・几帳面さ",
      ],
    },
    orderIndex: 24,
    isActive: true,
  },

  // ============================================
  // PJ適合 NS（ニーズ-供給）— 採用者側 6問
  // ============================================
  {
    code: "NS_E1",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J1",
    questionText: "提示可能な月給レンジ",
    inputType: "RANGE_SELECT",
    scaleOptions: {
      options: [
        "20万円未満",
        "20〜25万円",
        "25〜30万円",
        "30〜35万円",
        "35万円以上",
      ],
    },
    orderIndex: 25,
    isActive: true,
  },
  {
    code: "NS_E2",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J2",
    questionText: "残業の頻度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["ほぼなし", "日常的にある"],
    },
    orderIndex: 26,
    isActive: true,
  },
  {
    code: "NS_E3",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J3",
    questionText: "シフトの柔軟性（曜日・時間帯）",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["固定シフトのみ", "柔軟に調整可能"],
    },
    orderIndex: 27,
    isActive: true,
  },
  {
    code: "NS_E4",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J4",
    questionText: "有給休暇の取得しやすさ",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["取りにくい状況", "自由に取得可能"],
    },
    orderIndex: 28,
    isActive: true,
  },
  {
    code: "NS_E5",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J5",
    questionText: "キャリアアップ（昇進・昇給）の機会",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["ほぼ横ばい", "明確な昇進パスがある"],
    },
    orderIndex: 29,
    isActive: true,
  },
  {
    code: "NS_E6",
    dimension: "PJ_NS",
    side: "EMPLOYER",
    pairCode: "NS_J6",
    questionText: "産休・育休・時短勤務の制度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["制度はあるが実績少ない", "実績豊富で取得しやすい"],
    },
    orderIndex: 30,
    isActive: true,
  },

  // ============================================
  // PJ適合 NS（ニーズ-供給）— 求職者側 6問
  // ============================================
  {
    code: "NS_J1",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E1",
    questionText: "希望月給レンジ",
    inputType: "RANGE_SELECT",
    scaleOptions: {
      options: [
        "20万円未満",
        "20〜25万円",
        "25〜30万円",
        "30〜35万円",
        "35万円以上",
      ],
    },
    orderIndex: 31,
    isActive: true,
  },
  {
    code: "NS_J2",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E2",
    questionText: "残業への許容度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["残業はしたくない", "必要に応じて対応できる"],
    },
    orderIndex: 32,
    isActive: true,
  },
  {
    code: "NS_J3",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E3",
    questionText: "シフトの柔軟性への希望度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["固定シフトで構わない", "柔軟な調整を強く希望"],
    },
    orderIndex: 33,
    isActive: true,
  },
  {
    code: "NS_J4",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E4",
    questionText: "有給休暇の取得しやすさの重要度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["あまり気にしない", "非常に重要"],
    },
    orderIndex: 34,
    isActive: true,
  },
  {
    code: "NS_J5",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E5",
    questionText: "キャリアアップへの関心度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["現状維持で十分", "積極的にキャリアアップしたい"],
    },
    orderIndex: 35,
    isActive: true,
  },
  {
    code: "NS_J6",
    dimension: "PJ_NS",
    side: "JOBSEEKER",
    pairCode: "NS_E6",
    questionText: "産休・育休・時短勤務の制度の重要度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["あまり重視しない", "非常に重視する"],
    },
    orderIndex: 36,
    isActive: true,
  },

  // ============================================
  // PG適合（グループ）— 採用者側 5問
  // ============================================
  {
    code: "PG_E1",
    dimension: "PG",
    side: "EMPLOYER",
    pairCode: "PG_J1",
    questionText: "院内のコミュニケーションスタイル",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["報連相など形式を重視", "雑談含めカジュアルに会話"],
    },
    orderIndex: 37,
    isActive: true,
  },
  {
    code: "PG_E2",
    dimension: "PG",
    side: "EMPLOYER",
    pairCode: "PG_J2",
    questionText: "現在のスタッフの年齢層",
    inputType: "PRIORITY",
    scaleOptions: {
      options: ["20代中心", "30代中心", "40代以上中心", "幅広い年齢層"],
    },
    orderIndex: 38,
    isActive: true,
  },
  {
    code: "PG_E3",
    dimension: "PG",
    side: "EMPLOYER",
    pairCode: "PG_J3",
    questionText: "チーム内の業務分担の考え方",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["各自の担当を明確に分ける", "状況に応じて柔軟に助け合う"],
    },
    orderIndex: 39,
    isActive: true,
  },
  {
    code: "PG_E4",
    dimension: "PG",
    side: "EMPLOYER",
    pairCode: "PG_J4",
    questionText: "スタッフ間の人間関係の特徴",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["仕事上の関係を重視", "プライベートも含め親密"],
    },
    orderIndex: 40,
    isActive: true,
  },
  {
    code: "PG_E5",
    dimension: "PG",
    side: "EMPLOYER",
    pairCode: "PG_J5",
    questionText: "新人への接し方",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["自分で考えて動くことを期待", "手厚くフォローする文化"],
    },
    orderIndex: 41,
    isActive: true,
  },

  // ============================================
  // PG適合（グループ）— 求職者側 5問
  // ============================================
  {
    code: "PG_J1",
    dimension: "PG",
    side: "JOBSEEKER",
    pairCode: "PG_E1",
    questionText: "好みのコミュニケーションスタイル",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["報連相など形式を重視したい", "雑談含めカジュアルに話したい"],
    },
    orderIndex: 42,
    isActive: true,
  },
  {
    code: "PG_J2",
    dimension: "PG",
    side: "JOBSEEKER",
    pairCode: "PG_E2",
    questionText: "最も働きやすい年齢層の環境",
    inputType: "PRIORITY",
    scaleOptions: {
      options: ["20代中心", "30代中心", "40代以上中心", "幅広い年齢層"],
    },
    orderIndex: 43,
    isActive: true,
  },
  {
    code: "PG_J3",
    dimension: "PG",
    side: "JOBSEEKER",
    pairCode: "PG_E3",
    questionText: "好みの業務分担スタイル",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["担当を明確にしてほしい", "柔軟に助け合う方がいい"],
    },
    orderIndex: 44,
    isActive: true,
  },
  {
    code: "PG_J4",
    dimension: "PG",
    side: "JOBSEEKER",
    pairCode: "PG_E4",
    questionText: "職場の人間関係の好み",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "仕事上の関係に留めたい",
        "プライベートも含め親しくなりたい",
      ],
    },
    orderIndex: 45,
    isActive: true,
  },
  {
    code: "PG_J5",
    dimension: "PG",
    side: "JOBSEEKER",
    pairCode: "PG_E5",
    questionText: "入職時に望むサポート体制",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["自分で考えて動きたい", "手厚いフォローがほしい"],
    },
    orderIndex: 46,
    isActive: true,
  },

  // ============================================
  // PS適合（上司-部下）— 採用者側 6問
  // ============================================
  {
    code: "PS_E1",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J1",
    questionText: "スタッフへの指示の出し方",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["細かく具体的に指示する", "大まかな方針だけ伝えて任せる"],
    },
    orderIndex: 47,
    isActive: true,
  },
  {
    code: "PS_E2",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J2",
    questionText: "スタッフとのコミュニケーション頻度",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["必要時のみ", "日常的にこまめに声をかける"],
    },
    orderIndex: 48,
    isActive: true,
  },
  {
    code: "PS_E3",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J3",
    questionText: "ミスへの対応スタイル",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["原因を厳しく追究する", "一緒に改善策を考える"],
    },
    orderIndex: 49,
    isActive: true,
  },
  {
    code: "PS_E4",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J4",
    questionText: "スタッフからの意見・提案への姿勢",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "基本的に院長の方針に従ってほしい",
        "積極的に意見を出してほしい",
      ],
    },
    orderIndex: 50,
    isActive: true,
  },
  {
    code: "PS_E5",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J5",
    questionText: "評価で重視するポイント",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["成果・結果を重視", "プロセス・姿勢を重視"],
    },
    orderIndex: 51,
    isActive: true,
  },
  {
    code: "PS_E6",
    dimension: "PS",
    side: "EMPLOYER",
    pairCode: "PS_J6",
    questionText: "スタッフとの距離感",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["上下関係を明確にする", "フラットな関係を築く"],
    },
    orderIndex: 52,
    isActive: true,
  },

  // ============================================
  // PS適合（上司-部下）— 求職者側 6問
  // ============================================
  {
    code: "PS_J1",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E1",
    questionText: "望ましい指示の受け方",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "細かく具体的に指示してほしい",
        "大まかな方針で任せてほしい",
      ],
    },
    orderIndex: 53,
    isActive: true,
  },
  {
    code: "PS_J2",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E2",
    questionText: "上司とのコミュニケーション頻度の希望",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["必要時のみでよい", "日常的にこまめに話したい"],
    },
    orderIndex: 54,
    isActive: true,
  },
  {
    code: "PS_J3",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E3",
    questionText: "ミスをした時に望む対応",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["厳しく指摘してほしい", "一緒に改善策を考えてほしい"],
    },
    orderIndex: 55,
    isActive: true,
  },
  {
    code: "PS_J4",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E4",
    questionText: "意見・提案についての姿勢",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: [
        "方針に従って着実にこなしたい",
        "積極的に意見を出したい",
      ],
    },
    orderIndex: 56,
    isActive: true,
  },
  {
    code: "PS_J5",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E5",
    questionText: "評価されたいポイント",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["成果・結果で評価されたい", "プロセス・姿勢で評価されたい"],
    },
    orderIndex: 57,
    isActive: true,
  },
  {
    code: "PS_J6",
    dimension: "PS",
    side: "JOBSEEKER",
    pairCode: "PS_E6",
    questionText: "上司との望ましい距離感",
    inputType: "LIKERT7",
    scaleOptions: {
      anchors: ["上下関係が明確な方が楽", "フラットな関係が好み"],
    },
    orderIndex: 58,
    isActive: true,
  },
];
