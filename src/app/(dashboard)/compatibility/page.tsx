"use client";

import { useEffect, useState, useCallback } from "react";
import { CompatibilityMatching } from "@/components/compatibility-matching";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Heart,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Shield,
  MessageSquare,
  Target,
  AlertTriangle,
  Building2,
  FileText,
  Crown,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommunicationStyle {
  directness: number;
  logicVsEmotion: number;
  taskVsRelation: number;
}

interface AnalysisResult {
  leadershipType: string;
  communicationStyle: CommunicationStyle;
  idealTraits: string[];
  dealBreakers: string[];
  cultureType: string;
  summary: string;
}

interface DirectorProfileData {
  id: string;
  organizationId: string;
  personalityType: string | null;
  mbtiType: string | null;
  workStyleType: string | null;
  surveyResponses: Record<string, number> | null;
  idealTraits: string[] | null;
  dealBreakers: string[] | null;
  teamCulture: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Survey question definitions
// ---------------------------------------------------------------------------

interface SurveyQuestion {
  id: string;
  text: string;
  category: string;
}

const CATEGORIES = [
  "リーダーシップスタイル",
  "コミュニケーション傾向",
  "職場環境の好み",
  "求める人材像",
];

const QUESTIONS: SurveyQuestion[] = [
  // Category 1: Leadership
  { id: "Q1", text: "チームの意思決定は、最終的に自分が判断するのが最も良い", category: "リーダーシップスタイル" },
  { id: "Q2", text: "細かい指示を出すよりも、大きな方向性を示して任せたい", category: "リーダーシップスタイル" },
  { id: "Q3", text: "問題が発生したとき、まず自分が率先して動いて解決する", category: "リーダーシップスタイル" },
  { id: "Q4", text: "新しいことへの挑戦を楽しめる", category: "リーダーシップスタイル" },
  { id: "Q5", text: "ルールや手順を大切にする", category: "リーダーシップスタイル" },
  // Category 2: Communication
  { id: "Q6", text: "スタッフとの雑談は大切だと思う", category: "コミュニケーション傾向" },
  { id: "Q7", text: "フィードバックや注意は率直に伝える方だ", category: "コミュニケーション傾向" },
  { id: "Q8", text: "スタッフの個人的な事情も考慮する", category: "コミュニケーション傾向" },
  { id: "Q9", text: "会議は要点を絞って短時間で行いたい", category: "コミュニケーション傾向" },
  { id: "Q10", text: "人を褒めるのは得意な方だ", category: "コミュニケーション傾向" },
  // Category 3: Work environment
  { id: "Q11", text: "職場はアットホームな雰囲気が良い", category: "職場環境の好み" },
  { id: "Q12", text: "仕事とプライベートは明確に分けるべきだ", category: "職場環境の好み" },
  { id: "Q13", text: "スキルアップや技術習得への投資は惜しまない", category: "職場環境の好み" },
  { id: "Q14", text: "残業は極力させたくない", category: "職場環境の好み" },
  { id: "Q15", text: "チームイベントや懇親会は重要だ", category: "職場環境の好み" },
  // Category 4: Ideal candidate
  { id: "Q16", text: "経験よりもやる気・ポテンシャルを重視する", category: "求める人材像" },
  { id: "Q17", text: "報連相をこまめにしてくれるスタッフが良い", category: "求める人材像" },
  { id: "Q18", text: "自分で考えて動ける自律型人材が理想", category: "求める人材像" },
  { id: "Q19", text: "長期的に安定して働いてくれることが最も大切", category: "求める人材像" },
  { id: "Q20", text: "専門性・技術力が最も重要", category: "求める人材像" },
];

const SCALE_OPTIONS = [
  { value: 1, label: "全くそう思わない" },
  { value: 2, label: "あまりそう思わない" },
  { value: 3, label: "どちらともいえない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "非常にそう思う" },
] as const;

// ---------------------------------------------------------------------------
// Leadership type descriptions & icons
// ---------------------------------------------------------------------------

const LEADERSHIP_DESCRIPTIONS: Record<string, { description: string; icon: React.ReactNode }> = {
  "ビジョナリー型": {
    description: "目標を明確に示し、スタッフに裁量を与えて任せるリーダーシップスタイル。大局的な視点でチームを導きます。",
    icon: <Target className="w-8 h-8 text-[#769FCD]" />,
  },
  "コーチング型": {
    description: "スタッフの成長を重視し、一人ひとりに寄り添いながら育成するリーダーシップスタイル。伴走型のリーダーです。",
    icon: <Users className="w-8 h-8 text-[#769FCD]" />,
  },
  "ペースセッター型": {
    description: "自らが高い基準を示し、率先して行動することでチームを引っ張るリーダーシップスタイル。実力で信頼を得ます。",
    icon: <Crown className="w-8 h-8 text-[#769FCD]" />,
  },
  "民主型": {
    description: "チームメンバーの意見を広く取り入れ、合意形成を大切にするリーダーシップスタイル。全員参加型の運営を行います。",
    icon: <MessageSquare className="w-8 h-8 text-[#769FCD]" />,
  },
  "指示型": {
    description: "明確な指示と手順でチームを統率するリーダーシップスタイル。効率的で迷いのない組織運営を行います。",
    icon: <ClipboardCheck className="w-8 h-8 text-[#769FCD]" />,
  },
};

// ---------------------------------------------------------------------------
// Culture type descriptions
// ---------------------------------------------------------------------------

const CULTURE_DESCRIPTIONS: Record<string, string> = {
  "家族型": "温かい人間関係を重視し、チームの一体感を大切にする職場文化。スタッフを家族のように大切にします。",
  "革新型": "新しい挑戦と変革を推進する職場文化。創造性と柔軟性を重視し、常に改善を目指します。",
  "市場型": "成果と効率を重視する職場文化。目標達成に向けて競争力を高め、結果で評価します。",
  "官僚型": "秩序とルールを重視する職場文化。安定した運営と公平な制度を大切にします。",
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CompatibilityPage() {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DirectorProfileData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // --- Fetch existing profile ---
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compatibility/director");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        // Reconstruct analysis from profile if it exists
        if (data.profile) {
          const p = data.profile as DirectorProfileData;
          // Try to rebuild analysis from saved profile fields
          setAnalysis({
            leadershipType: p.personalityType || "",
            communicationStyle: {
              directness: 5,
              logicVsEmotion: 5,
              taskVsRelation: 5,
            },
            idealTraits: (p.idealTraits as string[]) || [],
            dealBreakers: (p.dealBreakers as string[]) || [],
            cultureType: p.teamCulture || "",
            summary: "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch director profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Survey handlers ---
  const handleStartSurvey = () => {
    setShowSurvey(true);
    setCurrentQuestion(0);
    setResponses({});
  };

  const handleSelectAnswer = (value: number) => {
    const qId = QUESTIONS[currentQuestion].id;
    setResponses((prev) => ({ ...prev, [qId]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all questions answered
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (responses[QUESTIONS[i].id] === undefined) {
        setCurrentQuestion(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/compatibility/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyResponses: responses }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setAnalysis(data.analysis);
        setShowSurvey(false);
      } else {
        const errData = await res.json();
        console.error("Submission error:", errData.error);
      }
    } catch (err) {
      console.error("Failed to submit survey:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassess = () => {
    setAnalysis(null);
    setProfile(null);
    handleStartSurvey();
  };

  // --- Current question data ---
  const question = QUESTIONS[currentQuestion];
  const currentCategoryIndex = CATEGORIES.indexOf(question?.category ?? "");
  const progressPercent = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const currentAnswer = question ? responses[question.id] : undefined;
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const allAnswered = QUESTIONS.every((q) => responses[q.id] !== undefined);

  // --- Radar chart data ---
  const radarData = analysis
    ? [
        { axis: "直接性", value: analysis.communicationStyle.directness, fullMark: 10 },
        { axis: "論理性", value: analysis.communicationStyle.logicVsEmotion, fullMark: 10 },
        { axis: "タスク志向", value: analysis.communicationStyle.taskVsRelation, fullMark: 10 },
      ]
    : [];

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">相性診断</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            院長の性格診断と応募者との相性マッチング
          </p>
        </div>
        <Card className="border-[#B9D7EA] shadow-sm">
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">相性診断</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            院長の性格診断と応募者との相性マッチング
          </p>
        </div>
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4 text-[#7F8C9B]">
              <Loader2 className="w-12 h-12 animate-spin text-[#769FCD]" />
              <p className="text-lg font-medium text-[#2C3E50]">分析中...</p>
              <p className="text-sm">
                回答内容を基にAIがあなたのリーダーシップタイプを分析しています
              </p>
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
        <h1 className="text-2xl font-bold text-[#2C3E50]">相性診断</h1>
        <p className="text-sm text-[#7F8C9B] mt-1">
          院長の性格診断と応募者との相性マッチング
        </p>
      </div>

      {/* --- Main Tabs --- */}
      <Tabs defaultValue="director">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="director" className="gap-1.5">
            <User className="w-4 h-4" />
            院長プロフィール
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-1.5">
            <Heart className="w-4 h-4" />
            応募者マッチング
          </TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* Tab 1: Director Profile / Assessment                          */}
        {/* ============================================================= */}
        <TabsContent value="director">
          {/* --- Survey Mode --- */}
          {showSurvey && !analysis && (
            <Card className="border-[#B9D7EA] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#769FCD]" />
                  院長性格診断アンケート
                </CardTitle>
                <CardDescription className="text-[#7F8C9B]">
                  20問のアンケートに回答して、あなたのリーダーシップタイプを診断します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#7F8C9B]">
                      Q{currentQuestion + 1} / {QUESTIONS.length}
                    </span>
                    <span className="text-[#769FCD] font-medium">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-2 [&_[data-slot=progress-indicator]]:bg-[#769FCD]"
                  />
                </div>

                {/* Category Header */}
                <div className="flex items-center gap-2">
                  {CATEGORIES.map((cat, idx) => (
                    <div
                      key={cat}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        idx === currentCategoryIndex
                          ? "bg-[#769FCD] text-white"
                          : "bg-[#D6E6F2] text-[#7F8C9B]"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      <span className="hidden sm:inline">{cat}</span>
                    </div>
                  ))}
                </div>

                {/* Question */}
                <div className="bg-[#F7FBFC] rounded-xl p-6 border border-[#D6E6F2]">
                  <p className="text-xs text-[#769FCD] font-medium mb-2">
                    {question.category}
                  </p>
                  <p className="text-lg font-medium text-[#2C3E50]">
                    {question.id}. {question.text}
                  </p>
                </div>

                {/* Likert Scale */}
                <div className="space-y-2">
                  {SCALE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectAnswer(option.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                        currentAnswer === option.value
                          ? "border-[#769FCD] bg-[#769FCD]/10 shadow-sm"
                          : "border-[#D6E6F2] bg-white hover:bg-[#F7FBFC] hover:border-[#B9D7EA]"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0 ${
                          currentAnswer === option.value
                            ? "border-[#769FCD] bg-[#769FCD] text-white"
                            : "border-[#B9D7EA] text-[#7F8C9B]"
                        }`}
                      >
                        {option.value}
                      </div>
                      <span
                        className={`text-sm ${
                          currentAnswer === option.value
                            ? "text-[#2C3E50] font-medium"
                            : "text-[#7F8C9B]"
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-[#D6E6F2]">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                    className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    前の質問
                  </Button>

                  {isLastQuestion && allAnswered ? (
                    <Button
                      onClick={handleSubmit}
                      className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" />
                      診断を実行
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={currentAnswer === undefined}
                      className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white disabled:opacity-50"
                    >
                      次の質問
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- No Profile: Start Assessment --- */}
          {!showSurvey && !profile && !analysis && (
            <Card className="border-[#B9D7EA] shadow-sm">
              <CardContent className="py-16">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-full bg-[#D6E6F2] flex items-center justify-center mx-auto mb-6">
                    <User className="w-10 h-10 text-[#769FCD]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#2C3E50] mb-2">
                    院長性格診断を始めましょう
                  </h2>
                  <p className="text-[#7F8C9B] mb-6">
                    20問の簡単なアンケートに回答するだけで、あなたのリーダーシップタイプ、
                    コミュニケーションスタイル、理想の人材像を分析します。
                    診断結果は応募者との相性マッチングにも活用されます。
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                    {CATEGORIES.map((cat, idx) => (
                      <div
                        key={cat}
                        className="flex items-center gap-2 p-3 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#769FCD] text-white flex items-center justify-center text-xs font-medium shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-sm text-[#2C3E50]">{cat}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleStartSurvey}
                    size="lg"
                    className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                  >
                    <ClipboardCheck className="w-5 h-5 mr-2" />
                    診断を開始する
                  </Button>
                  <p className="text-xs text-[#7F8C9B] mt-3">
                    所要時間: 約3〜5分
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- Results Display --- */}
          {(profile || analysis) && !showSurvey && (
            <div className="space-y-6">
              {/* Leadership Type Card */}
              {analysis && (
                <Card className="border-[#B9D7EA] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#769FCD]" />
                      リーダーシップタイプ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#D6E6F2] flex items-center justify-center shrink-0">
                        {LEADERSHIP_DESCRIPTIONS[analysis.leadershipType]?.icon || (
                          <User className="w-8 h-8 text-[#769FCD]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-[#769FCD] mb-2">
                          {analysis.leadershipType}
                        </h3>
                        <p className="text-[#7F8C9B]">
                          {LEADERSHIP_DESCRIPTIONS[analysis.leadershipType]?.description ||
                            "あなたのリーダーシップスタイルです。"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Communication Style + Culture Type row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Communication Style Radar Chart */}
                {analysis && (
                  <Card className="border-[#B9D7EA] shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#769FCD]" />
                        コミュニケーションスタイル
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart
                          data={radarData}
                          margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                        >
                          <PolarGrid stroke="#D6E6F2" />
                          <PolarAngleAxis
                            dataKey="axis"
                            tick={{ fill: "#2C3E50", fontSize: 13, fontWeight: 500 }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 10]}
                            tick={{ fill: "#7F8C9B", fontSize: 10 }}
                            tickCount={6}
                          />
                          <Radar
                            name="スコア"
                            dataKey="value"
                            stroke="#769FCD"
                            fill="#769FCD"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="text-center p-2 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                          <p className="text-xs text-[#7F8C9B] mb-1">直接性</p>
                          <p className="text-lg font-bold text-[#769FCD]">
                            {analysis.communicationStyle.directness}
                          </p>
                          <p className="text-[10px] text-[#7F8C9B]">/ 10</p>
                        </div>
                        <div className="text-center p-2 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                          <p className="text-xs text-[#7F8C9B] mb-1">論理性</p>
                          <p className="text-lg font-bold text-[#769FCD]">
                            {analysis.communicationStyle.logicVsEmotion}
                          </p>
                          <p className="text-[10px] text-[#7F8C9B]">/ 10</p>
                        </div>
                        <div className="text-center p-2 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                          <p className="text-xs text-[#7F8C9B] mb-1">タスク志向</p>
                          <p className="text-lg font-bold text-[#769FCD]">
                            {analysis.communicationStyle.taskVsRelation}
                          </p>
                          <p className="text-[10px] text-[#7F8C9B]">/ 10</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Culture Type Card */}
                {analysis && (
                  <Card className="border-[#B9D7EA] shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#769FCD]" />
                        職場文化タイプ
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-14 h-14 rounded-xl bg-[#D6E6F2] flex items-center justify-center shrink-0">
                          <Building2 className="w-7 h-7 text-[#769FCD]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#769FCD] mb-2">
                            {analysis.cultureType}
                          </h3>
                          <p className="text-sm text-[#7F8C9B]">
                            {CULTURE_DESCRIPTIONS[analysis.cultureType] ||
                              "あなたの組織に適した職場文化タイプです。"}
                          </p>
                        </div>
                      </div>

                      {/* All culture types for reference */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#7F8C9B] uppercase tracking-wider">
                          文化タイプ一覧
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(CULTURE_DESCRIPTIONS).map(([type]) => (
                            <div
                              key={type}
                              className={`p-2 rounded-lg text-sm ${
                                type === analysis.cultureType
                                  ? "bg-[#769FCD]/10 border border-[#769FCD] text-[#769FCD] font-medium"
                                  : "bg-[#F7FBFC] border border-[#D6E6F2] text-[#7F8C9B]"
                              }`}
                            >
                              {type}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Ideal Traits + Deal Breakers row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ideal Traits */}
                {analysis && analysis.idealTraits.length > 0 && (
                  <Card className="border-[#B9D7EA] shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#769FCD]" />
                        求める人材像
                      </CardTitle>
                      <CardDescription className="text-[#7F8C9B]">
                        あなたが理想とする上位3つの資質
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.idealTraits.map((trait, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <Badge className="bg-green-100 text-green-700 border-green-300 shrink-0">
                              {idx + 1}
                            </Badge>
                            <span className="text-sm text-[#2C3E50]">{trait}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Deal Breakers */}
                {analysis && analysis.dealBreakers.length > 0 && (
                  <Card className="border-[#B9D7EA] shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        避けたい特性
                      </CardTitle>
                      <CardDescription className="text-[#7F8C9B]">
                        採用時に注意したい上位3つの特性
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.dealBreakers.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                          >
                            <Badge className="bg-red-100 text-red-700 border-red-300 shrink-0">
                              {idx + 1}
                            </Badge>
                            <span className="text-sm text-[#2C3E50]">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary */}
              {analysis && analysis.summary && (
                <Card className="border-[#B9D7EA] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#769FCD]" />
                      総合分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-[#F7FBFC] rounded-xl border border-[#D6E6F2]">
                      <p className="text-[#2C3E50] leading-relaxed">
                        {analysis.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Re-assess button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleReassess}
                  className="border-[#B9D7EA] text-[#769FCD] hover:bg-[#F7FBFC]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  再診断
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* Tab 2: Applicant Matching (Placeholder)                       */}
        {/* ============================================================= */}
        <TabsContent value="matching">
          <CompatibilityMatching />
        </TabsContent>
      </Tabs>
    </div>
  );
}
