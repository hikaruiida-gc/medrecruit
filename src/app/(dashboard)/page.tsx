"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Briefcase,
  UserPlus,
  Calendar,
  Clock,
  Heart,
  BarChart3,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { STATUS_LABELS, STATUS_COLORS, INTERVIEW_TYPE_LABELS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentApplicant {
  id: string;
  lastName: string;
  firstName: string;
  status: string;
  createdAt: string;
  positionTitle: string | null;
}

interface MonthlyTrendItem {
  month: string;
  count: number;
}

interface FunnelItem {
  stage: string;
  count: number;
  rate: number;
}

interface UpcomingInterview {
  id: string;
  applicantId: string;
  applicantName: string;
  scheduledAt: string;
  type: string;
  interviewerName: string | null;
}

interface PositionStat {
  positionTitle: string;
  applicantCount: number;
  hiredCount: number;
}

interface DashboardStats {
  totalApplicants: number;
  activePositions: number;
  newThisWeek: number;
  interviewsScheduled: number;
  statusBreakdown: Record<string, number>;
  recentApplicants: RecentApplicant[];
  monthlyTrend: MonthlyTrendItem[];
  averageTimeToHire: number | null;
  funnelData: FunnelItem[];
  upcomingInterviews: UpcomingInterview[];
  compatibilityAverage: number | null;
  positionStats: PositionStat[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FUNNEL_STAGE_LABELS: Record<string, string> = {
  NEW: "新規",
  SCREENING: "書類選考",
  INTERVIEW_1: "一次面接",
  INTERVIEW_2: "二次面接",
  OFFER: "内定",
  ACCEPTED: "承諾",
};

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "1日前";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  return `${parseInt(parts[1])}月`;
}

function getCompatibilityColor(score: number): string {
  if (score >= 80) return "#5CB85C";
  if (score >= 60) return "#F0AD4E";
  return "#D9534F";
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-4 w-20 bg-[#D6E6F2] rounded animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-[#D6E6F2] animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-9 w-16 bg-[#D6E6F2] rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 w-full flex items-center justify-center">
      <div className="text-sm text-[#7F8C9B] animate-pulse">読み込み中...</div>
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 flex-1 bg-[#D6E6F2] rounded animate-pulse" />
          <div className="h-4 w-16 bg-[#D6E6F2] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // KPI cards config
  const kpiCards = [
    {
      title: "応募者総数",
      value: stats?.totalApplicants ?? 0,
      description: "登録済みの全応募者数",
      icon: Users,
      color: "#769FCD",
    },
    {
      title: "募集中の職種",
      value: stats?.activePositions ?? 0,
      description: "現在アクティブな求人数",
      icon: Briefcase,
      color: "#5CB85C",
    },
    {
      title: "今週の新規応募",
      value: stats?.newThisWeek ?? 0,
      description: "直近7日間の新規応募",
      icon: UserPlus,
      color: "#F0AD4E",
    },
    {
      title: "面接予定",
      value: stats?.interviewsScheduled ?? 0,
      description: "今後の面接予定数",
      icon: Calendar,
      color: "#4A7FB5",
    },
  ];

  // Prepare funnel chart data
  const funnelChartData = (stats?.funnelData ?? []).map((item) => ({
    stage: FUNNEL_STAGE_LABELS[item.stage] || item.stage,
    count: item.count,
    rate: item.rate,
  }));

  // Prepare monthly trend chart data
  const monthlyChartData = (stats?.monthlyTrend ?? []).map((item) => ({
    month: formatMonthLabel(item.month),
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[#2C3E50]">ダッシュボード</h1>
        <p className="text-[#7F8C9B] text-sm mt-1">
          ようこそ、{session?.user?.name || "ユーザー"}さん
        </p>
      </div>

      {/* ── Row 1: KPI Cards ───────────────────────────────────────────── */}
      {loading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className="border-[#B9D7EA] shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-[#7F8C9B]">
                    {card.title}
                  </CardTitle>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#2C3E50]">
                    {card.value}
                  </div>
                  <p className="text-xs text-[#7F8C9B] mt-1">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Row 2: Funnel + Monthly Trend ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#769FCD]" />
            <CardTitle className="text-lg text-[#2C3E50]">
              選考パイプライン
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : funnelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={funnelChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#D6E6F2"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fill: "#7F8C9B", fontSize: 12 }} />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    width={70}
                    tick={{ fill: "#2C3E50", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}名`, "応募者数"]}
                    contentStyle={{
                      backgroundColor: "#F7FBFC",
                      border: "1px solid #B9D7EA",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#769FCD"
                    radius={[0, 4, 4, 0]}
                    label={({ x, y, width, height, value, index }) => {
                      const item = funnelChartData[index as number];
                      if (!item) return null;
                      return (
                        <text
                          x={(x as number) + (width as number) + 5}
                          y={(y as number) + (height as number) / 2}
                          fill="#7F8C9B"
                          fontSize={11}
                          dominantBaseline="middle"
                        >
                          {value}名 ({item.rate}%)
                        </text>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-[#7F8C9B]">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Chart */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#769FCD]" />
            <CardTitle className="text-lg text-[#2C3E50]">
              月別応募推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B9D7EA" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#B9D7EA" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#D6E6F2"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#7F8C9B", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "#7F8C9B", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}名`, "応募者数"]}
                    contentStyle={{
                      backgroundColor: "#F7FBFC",
                      border: "1px solid #B9D7EA",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#769FCD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-[#7F8C9B]">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Recent Applicants + Upcoming Interviews ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applicants */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#769FCD]" />
              <CardTitle className="text-lg text-[#2C3E50]">
                最近の応募者
              </CardTitle>
            </div>
            <Link
              href="/applicants"
              className="text-sm text-[#769FCD] hover:text-[#4A7FB5] flex items-center gap-1"
            >
              一覧 <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton />
            ) : stats?.recentApplicants && stats.recentApplicants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#7F8C9B]">氏名</TableHead>
                    <TableHead className="text-[#7F8C9B]">職種</TableHead>
                    <TableHead className="text-[#7F8C9B]">状態</TableHead>
                    <TableHead className="text-[#7F8C9B] text-right">
                      応募日
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentApplicants.map((a) => (
                    <TableRow key={a.id} className="hover:bg-[#F7FBFC]">
                      <TableCell>
                        <Link
                          href={`/applicants/${a.id}`}
                          className="text-[#2C3E50] hover:text-[#769FCD] font-medium"
                        >
                          {a.lastName} {a.firstName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#7F8C9B] text-sm">
                        {a.positionTitle ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-800"} text-xs`}
                        >
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-[#7F8C9B]" suppressHydrationWarning>
                        {formatRelativeDate(a.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-sm text-[#7F8C9B]">
                応募者を登録すると、ここに最新の応募が表示されます。
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4A7FB5]" />
              <CardTitle className="text-lg text-[#2C3E50]">
                直近の面接予定
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton />
            ) : stats?.upcomingInterviews &&
              stats.upcomingInterviews.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingInterviews.map((iv) => (
                  <Link
                    key={iv.id}
                    href={`/applicants/${iv.applicantId}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#D6E6F2] hover:bg-[#F7FBFC] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C3E50] group-hover:text-[#769FCD] truncate">
                        {iv.applicantName}
                      </p>
                      <p className="text-xs text-[#7F8C9B] mt-0.5">
                        {iv.interviewerName
                          ? `担当: ${iv.interviewerName}`
                          : "担当未定"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge className="bg-[#D6E6F2] text-[#4A7FB5] text-xs">
                        {INTERVIEW_TYPE_LABELS[iv.type] || iv.type}
                      </Badge>
                      <span className="text-sm text-[#2C3E50] font-medium" suppressHydrationWarning>
                        {formatDateTime(iv.scheduledAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[#7F8C9B]">
                予定されている面接はありません。
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Average Time to Hire */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#4A7FB515" }}
            >
              <Clock className="w-5 h-5 text-[#4A7FB5]" />
            </div>
            <CardTitle className="text-base text-[#2C3E50]">
              平均採用日数
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 bg-[#D6E6F2] rounded animate-pulse" />
            ) : stats?.averageTimeToHire != null ? (
              <div>
                <span className="text-3xl font-bold text-[#4A7FB5]">
                  {stats.averageTimeToHire}
                </span>
                <span className="text-lg text-[#7F8C9B] ml-1">日</span>
                <p className="text-xs text-[#7F8C9B] mt-1">
                  応募から承諾までの平均日数
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#7F8C9B]">
                採用実績データがありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* Average Compatibility Score */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#D9534F15" }}
            >
              <Heart className="w-5 h-5 text-[#D9534F]" />
            </div>
            <CardTitle className="text-base text-[#2C3E50]">
              平均相性スコア
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-20 bg-[#D6E6F2] rounded animate-pulse" />
            ) : stats?.compatibilityAverage != null ? (
              <div>
                <span
                  className="text-3xl font-bold"
                  style={{
                    color: getCompatibilityColor(stats.compatibilityAverage),
                  }}
                >
                  {stats.compatibilityAverage}
                </span>
                <span className="text-lg text-[#7F8C9B] ml-1">点</span>
                <p className="text-xs text-[#7F8C9B] mt-1">
                  相性診断済み応募者の平均スコア
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#7F8C9B]">
                相性診断データがありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* Position Summary */}
        <Card className="border-[#B9D7EA] shadow-sm lg:col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#5CB85C15" }}
            >
              <Briefcase className="w-5 h-5 text-[#5CB85C]" />
            </div>
            <CardTitle className="text-base text-[#2C3E50]">
              職種別応募状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton rows={3} />
            ) : stats?.positionStats && stats.positionStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#7F8C9B]">職種</TableHead>
                    <TableHead className="text-[#7F8C9B] text-right">
                      応募数
                    </TableHead>
                    <TableHead className="text-[#7F8C9B] text-right">
                      採用数
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.positionStats.map((p) => (
                    <TableRow key={p.positionTitle} className="hover:bg-[#F7FBFC]">
                      <TableCell className="text-[#2C3E50] font-medium text-sm">
                        {p.positionTitle}
                      </TableCell>
                      <TableCell className="text-right text-sm text-[#7F8C9B]">
                        {p.applicantCount}名
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge
                          className={
                            p.hiredCount > 0
                              ? "bg-green-100 text-green-800 text-xs"
                              : "bg-gray-100 text-gray-800 text-xs"
                          }
                        >
                          {p.hiredCount}名
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-[#7F8C9B]">
                職種を登録すると、ここに応募状況が表示されます。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
