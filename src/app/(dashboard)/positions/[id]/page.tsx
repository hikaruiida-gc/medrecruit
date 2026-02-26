"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Users,
  Briefcase,
  Clock,
  BadgeJapaneseYen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- Types ---

type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
type ApplicantStatus =
  | "NEW"
  | "SCREENING"
  | "INTERVIEW_1"
  | "INTERVIEW_2"
  | "OFFER"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

interface Applicant {
  id: string;
  lastName: string;
  firstName: string;
  status: ApplicantStatus;
  appliedAt: string;
  email: string | null;
  phone: string | null;
}

interface Position {
  id: string;
  title: string;
  employmentType: EmploymentType;
  salaryMin: number | null;
  salaryMax: number | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    applicants: number;
  };
  applicants: Applicant[];
}

// --- Constants ---

const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "常勤",
  PART_TIME: "パート",
  CONTRACT: "契約",
};

const applicantStatusLabels: Record<ApplicantStatus, string> = {
  NEW: "新規",
  SCREENING: "書類選考中",
  INTERVIEW_1: "一次面接",
  INTERVIEW_2: "二次面接",
  OFFER: "内定",
  ACCEPTED: "承諾",
  REJECTED: "不採用",
  WITHDRAWN: "辞退",
};

const applicantStatusColors: Record<ApplicantStatus, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  SCREENING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  INTERVIEW_1: "bg-purple-100 text-purple-700 border-purple-200",
  INTERVIEW_2: "bg-purple-100 text-purple-700 border-purple-200",
  OFFER: "bg-green-100 text-green-700 border-green-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  WITHDRAWN: "bg-gray-100 text-gray-500 border-gray-200",
};

// --- Zod Schema ---

const positionSchema = z.object({
  title: z.string().min(1, "職種名は必須です"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"], {
    message: "雇用形態を選択してください",
  }),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  hourlyRateMin: z.string().optional(),
  hourlyRateMax: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
});

type PositionFormValues = z.infer<typeof positionSchema>;

// --- Helpers ---

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// --- Component ---

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
  });

  const watchEmploymentType = watch("employmentType");

  const fetchPosition = useCallback(async () => {
    try {
      const res = await fetch(`/api/positions/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("募集職種が見つかりません");
          router.push("/positions");
          return;
        }
        throw new Error();
      }
      const data = await res.json();
      setPosition(data);
    } catch {
      toast.error("募集職種の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  const openEditDialog = () => {
    if (!position) return;
    reset({
      title: position.title,
      employmentType: position.employmentType,
      salaryMin: position.salaryMin?.toString() ?? "",
      salaryMax: position.salaryMax?.toString() ?? "",
      hourlyRateMin: position.hourlyRateMin?.toString() ?? "",
      hourlyRateMax: position.hourlyRateMax?.toString() ?? "",
      description: position.description ?? "",
      requirements: position.requirements ?? "",
      benefits: position.benefits ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PositionFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        hourlyRateMin: data.hourlyRateMin ? Number(data.hourlyRateMin) : undefined,
        hourlyRateMax: data.hourlyRateMax ? Number(data.hourlyRateMax) : undefined,
      };
      const res = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }

      toast.success("募集職種を更新しました");
      setDialogOpen(false);
      fetchPosition();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#7F8C9B]">読み込み中...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#7F8C9B]">募集職種が見つかりません</p>
        <Button
          variant="outline"
          onClick={() => router.push("/positions")}
          className="mt-4 border-[#B9D7EA] text-[#2C3E50]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/positions")}
            className="border-[#B9D7EA] text-[#2C3E50] hover:bg-[#D6E6F2]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">
              {position.title}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge
                className={
                  position.isActive
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }
              >
                {position.isActive ? "募集中" : "停止"}
              </Badge>
              <span className="text-[#7F8C9B] text-sm">
                {employmentTypeLabels[position.employmentType]}
              </span>
            </div>
          </div>
        </div>
        <Button
          onClick={openEditDialog}
          className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
        >
          <Pencil className="w-4 h-4 mr-2" />
          編集
        </Button>
      </div>

      {/* Position Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#7F8C9B]">
              雇用形態
            </CardTitle>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#769FCD]/10">
              <Briefcase className="w-4 h-4 text-[#769FCD]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#2C3E50]">
              {employmentTypeLabels[position.employmentType]}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#7F8C9B]">
              {position.employmentType === "PART_TIME" ? "時給" : "月給"}
            </CardTitle>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#769FCD]/10">
              <BadgeJapaneseYen className="w-4 h-4 text-[#769FCD]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#2C3E50]">
              {position.employmentType === "PART_TIME" ? (
                <>
                  {position.hourlyRateMin || position.hourlyRateMax ? (
                    <>
                      {formatCurrency(position.hourlyRateMin)} ~{" "}
                      {formatCurrency(position.hourlyRateMax)}
                    </>
                  ) : (
                    "-"
                  )}
                </>
              ) : (
                <>
                  {position.salaryMin || position.salaryMax ? (
                    <>
                      {formatCurrency(position.salaryMin)} ~{" "}
                      {formatCurrency(position.salaryMax)}
                    </>
                  ) : (
                    "-"
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#7F8C9B]">
              応募者数
            </CardTitle>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#769FCD]/10">
              <Users className="w-4 h-4 text-[#769FCD]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2C3E50]">
              {position._count.applicants}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {position.description && (
          <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">
                仕事内容
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#2C3E50] text-sm whitespace-pre-wrap">
                {position.description}
              </p>
            </CardContent>
          </Card>
        )}

        {position.requirements && (
          <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">
                応募条件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#2C3E50] text-sm whitespace-pre-wrap">
                {position.requirements}
              </p>
            </CardContent>
          </Card>
        )}

        {position.benefits && (
          <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">
                福利厚生
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#2C3E50] text-sm whitespace-pre-wrap">
                {position.benefits}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg text-[#2C3E50]">
              登録情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#7F8C9B]">
                <Clock className="w-4 h-4" />
                <span>作成日: {formatDate(position.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#7F8C9B]">
                <Clock className="w-4 h-4" />
                <span>更新日: {formatDate(position.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applicants Section */}
      <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-[#2C3E50]">
            応募者一覧 ({position._count.applicants}名)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {position.applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Users className="w-12 h-12 text-[#B9D7EA] mb-4" />
              <p className="text-[#7F8C9B] text-sm">
                この職種にはまだ応募者がいません
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#D6E6F2] hover:bg-[#D6E6F2]">
                  <TableHead className="text-[#2C3E50] font-semibold">
                    氏名
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold">
                    メールアドレス
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold">
                    電話番号
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold">
                    応募日
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold text-center">
                    ステータス
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {position.applicants.map((applicant) => (
                  <TableRow
                    key={applicant.id}
                    className="border-[#B9D7EA]/50"
                  >
                    <TableCell className="font-medium text-[#2C3E50]">
                      <a
                        href={`/applicants/${applicant.id}`}
                        className="hover:text-[#769FCD] hover:underline"
                      >
                        {applicant.lastName} {applicant.firstName}
                      </a>
                    </TableCell>
                    <TableCell className="text-[#2C3E50]">
                      {applicant.email || "-"}
                    </TableCell>
                    <TableCell className="text-[#2C3E50]">
                      {applicant.phone || "-"}
                    </TableCell>
                    <TableCell className="text-[#2C3E50]">
                      {formatDate(applicant.appliedAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          applicantStatusColors[applicant.status] ||
                          "bg-gray-100 text-gray-500"
                        }
                      >
                        {applicantStatusLabels[applicant.status] ||
                          applicant.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              募集職種を編集
            </DialogTitle>
            <DialogDescription className="text-[#7F8C9B]">
              募集職種の情報を編集してください
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#2C3E50]">
                職種名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="例: 看護師、医療事務"
                className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Employment Type */}
            <div className="space-y-2">
              <Label htmlFor="employmentType" className="text-[#2C3E50]">
                雇用形態 <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full border-[#B9D7EA] focus-visible:ring-[#769FCD]">
                      <SelectValue placeholder="雇用形態を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">常勤</SelectItem>
                      <SelectItem value="PART_TIME">パート</SelectItem>
                      <SelectItem value="CONTRACT">契約</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.employmentType && (
                <p className="text-sm text-red-500">
                  {errors.employmentType.message}
                </p>
              )}
            </div>

            {/* Salary fields for FULL_TIME / CONTRACT */}
            {(watchEmploymentType === "FULL_TIME" ||
              watchEmploymentType === "CONTRACT") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin" className="text-[#2C3E50]">
                    最低月給（円）
                  </Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    placeholder="例: 250000"
                    className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                    {...register("salaryMin")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax" className="text-[#2C3E50]">
                    最高月給（円）
                  </Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    placeholder="例: 400000"
                    className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                    {...register("salaryMax")}
                  />
                </div>
              </div>
            )}

            {/* Hourly rate fields for PART_TIME */}
            {watchEmploymentType === "PART_TIME" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRateMin" className="text-[#2C3E50]">
                    最低時給（円）
                  </Label>
                  <Input
                    id="hourlyRateMin"
                    type="number"
                    placeholder="例: 1200"
                    className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                    {...register("hourlyRateMin")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRateMax" className="text-[#2C3E50]">
                    最高時給（円）
                  </Label>
                  <Input
                    id="hourlyRateMax"
                    type="number"
                    placeholder="例: 1800"
                    className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                    {...register("hourlyRateMax")}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#2C3E50]">
                仕事内容
              </Label>
              <Textarea
                id="description"
                placeholder="仕事内容の詳細を入力"
                rows={3}
                className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                {...register("description")}
              />
            </div>

            {/* Requirements */}
            <div className="space-y-2">
              <Label htmlFor="requirements" className="text-[#2C3E50]">
                応募条件
              </Label>
              <Textarea
                id="requirements"
                placeholder="必要な資格・経験など"
                rows={3}
                className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                {...register("requirements")}
              />
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label htmlFor="benefits" className="text-[#2C3E50]">
                福利厚生
              </Label>
              <Textarea
                id="benefits"
                placeholder="社会保険、交通費支給など"
                rows={3}
                className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                {...register("benefits")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-[#B9D7EA] text-[#2C3E50]"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
              >
                {submitting ? "保存中..." : "更新する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
