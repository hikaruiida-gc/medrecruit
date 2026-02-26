"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Briefcase, Link2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
}

// --- Constants ---

const employmentTypeLabels: Record<EmploymentType, string> = {
  FULL_TIME: "常勤",
  PART_TIME: "パート",
  CONTRACT: "契約",
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

function getSalaryDisplay(position: Position): string {
  if (position.employmentType === "PART_TIME") {
    const min = position.hourlyRateMin;
    const max = position.hourlyRateMax;
    if (min && max) return `${formatCurrency(min)} ~ ${formatCurrency(max)}/時`;
    if (min) return `${formatCurrency(min)}~/時`;
    if (max) return `~${formatCurrency(max)}/時`;
    return "-";
  }
  const min = position.salaryMin;
  const max = position.salaryMax;
  if (min && max) return `${formatCurrency(min)} ~ ${formatCurrency(max)}`;
  if (min) return `${formatCurrency(min)}~`;
  if (max) return `~${formatCurrency(max)}`;
  return "-";
}

// --- Component ---

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: "",
      employmentType: undefined,
      salaryMin: "",
      salaryMax: "",
      hourlyRateMin: "",
      hourlyRateMax: "",
      description: "",
      requirements: "",
      benefits: "",
    },
  });

  const watchEmploymentType = watch("employmentType");

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/positions");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPositions(data);
    } catch {
      toast.error("募集職種の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const openCreateDialog = () => {
    setEditingPosition(null);
    reset({
      title: "",
      employmentType: undefined,
      salaryMin: "",
      salaryMax: "",
      hourlyRateMin: "",
      hourlyRateMax: "",
      description: "",
      requirements: "",
      benefits: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (position: Position) => {
    setEditingPosition(position);
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
      const url = editingPosition
        ? `/api/positions/${editingPosition.id}`
        : "/api/positions";
      const method = editingPosition ? "PUT" : "POST";

      const payload = {
        ...data,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        hourlyRateMin: data.hourlyRateMin ? Number(data.hourlyRateMin) : undefined,
        hourlyRateMax: data.hourlyRateMax ? Number(data.hourlyRateMax) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }

      toast.success(
        editingPosition
          ? "募集職種を更新しました"
          : "募集職種を作成しました"
      );
      setDialogOpen(false);
      fetchPositions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (position: Position) => {
    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !position.isActive }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }

      toast.success(
        position.isActive
          ? "募集を停止しました"
          : "募集を再開しました"
      );
      fetchPositions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    }
  };

  const deletePosition = async (id: string) => {
    try {
      const res = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }

      toast.success("募集職種を削除しました");
      setDeleteConfirmId(null);
      fetchPositions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      toast.error("URLを入力してください");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/positions/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取り込みに失敗しました");

      const extracted = data.extractedData;
      // Pre-fill the create form with extracted data
      setEditingPosition(null);
      reset({
        title: extracted.title || "",
        employmentType: extracted.employmentType || undefined,
        salaryMin: extracted.salaryMin?.toString() ?? "",
        salaryMax: extracted.salaryMax?.toString() ?? "",
        hourlyRateMin: extracted.hourlyRateMin?.toString() ?? "",
        hourlyRateMax: extracted.hourlyRateMax?.toString() ?? "",
        description: extracted.description || "",
        requirements: extracted.requirements || "",
        benefits: extracted.benefits || "",
      });

      setUrlImportOpen(false);
      setImportUrl("");
      setDialogOpen(true);

      if (data.demo) {
        toast.info("デモデータが表示されています（API未設定）");
      } else {
        toast.success("求人情報を取り込みました。内容を確認して保存してください。");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "取り込みに失敗しました"
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">募集職種</h1>
          <p className="text-[#7F8C9B] text-sm mt-1">
            募集中の職種を管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setUrlImportOpen(true)}
            variant="outline"
            className="border-[#B9D7EA] text-[#4A7FB5] hover:bg-[#D6E6F2]"
          >
            <Link2 className="w-4 h-4 mr-2" />
            URLから取り込み
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-[#B9D7EA] bg-white shadow-sm rounded-xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[#7F8C9B]">読み込み中...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Briefcase className="w-12 h-12 text-[#B9D7EA] mb-4" />
              <p className="text-[#7F8C9B] text-sm">
                募集職種がまだありません
              </p>
              <Button
                onClick={openCreateDialog}
                className="mt-4 bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                最初の職種を作成
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#D6E6F2] hover:bg-[#D6E6F2]">
                  <TableHead className="text-[#2C3E50] font-semibold">
                    職種名
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold">
                    雇用形態
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold">
                    給与レンジ
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold text-center">
                    応募者数
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold text-center">
                    ステータス
                  </TableHead>
                  <TableHead className="text-[#2C3E50] font-semibold text-right">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id} className="border-[#B9D7EA]/50">
                    <TableCell className="font-medium text-[#2C3E50]">
                      <a
                        href={`/positions/${position.id}`}
                        className="hover:text-[#769FCD] hover:underline"
                      >
                        {position.title}
                      </a>
                    </TableCell>
                    <TableCell className="text-[#2C3E50]">
                      {employmentTypeLabels[position.employmentType]}
                    </TableCell>
                    <TableCell className="text-[#2C3E50]">
                      {getSalaryDisplay(position)}
                    </TableCell>
                    <TableCell className="text-center text-[#2C3E50]">
                      {position._count.applicants}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          position.isActive
                            ? "bg-green-100 text-green-700 border-green-200 cursor-pointer hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200 cursor-pointer hover:bg-gray-200"
                        }
                        onClick={() => toggleActive(position)}
                      >
                        {position.isActive ? "募集中" : "停止"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(position)}
                          className="text-[#769FCD] border-[#B9D7EA] hover:bg-[#D6E6F2]"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(position.id)}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              {editingPosition ? "募集職種を編集" : "新規募集職種を作成"}
            </DialogTitle>
            <DialogDescription className="text-[#7F8C9B]">
              {editingPosition
                ? "募集職種の情報を編集してください"
                : "新しい募集職種の情報を入力してください"}
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
                {submitting
                  ? "保存中..."
                  : editingPosition
                    ? "更新する"
                    : "作成する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* URL Import Dialog */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50] flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#769FCD]" />
              求人URLから取り込み
            </DialogTitle>
            <DialogDescription className="text-[#7F8C9B]">
              求人媒体の募集ページURLを貼り付けると、AIが自動で情報を抽出します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="importUrl" className="text-[#2C3E50]">
                求人ページURL
              </Label>
              <Input
                id="importUrl"
                type="url"
                placeholder="https://example.com/job/12345"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="border-[#B9D7EA] focus-visible:ring-[#769FCD]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUrlImport();
                  }
                }}
              />
            </div>
            <div className="bg-[#F7FBFC] border border-[#D6E6F2] rounded-lg p-3">
              <p className="text-xs text-[#7F8C9B] leading-relaxed">
                対応サイト例: Indeed、ジョブメドレー、マイナビ、リクナビ、m3.com、
                デンタルワーカー、ナースパワーなど。求人詳細ページのURLを指定してください。
              </p>
            </div>
            {importing && (
              <div className="flex items-center gap-3 p-3 bg-[#D6E6F2]/50 rounded-lg">
                <Loader2 className="w-5 h-5 text-[#769FCD] animate-spin" />
                <div>
                  <p className="text-sm font-medium text-[#2C3E50]">取り込み中...</p>
                  <p className="text-xs text-[#7F8C9B]">
                    ページを取得してAIが情報を解析しています
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUrlImportOpen(false);
                setImportUrl("");
              }}
              className="border-[#B9D7EA] text-[#2C3E50]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUrlImport}
              disabled={importing || !importUrl.trim()}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  取り込む
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">削除の確認</DialogTitle>
            <DialogDescription className="text-[#7F8C9B]">
              この募集職種を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-[#B9D7EA] text-[#2C3E50]"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deletePosition(deleteConfirmId)}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
