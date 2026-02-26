"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Upload,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, formatDate } from "@/lib/constants";
import { KanbanBoard } from "@/components/kanban-board";

interface Applicant {
  id: string;
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  status: string;
  rating: number | null;
  appliedAt: string;
  position: { id: string; title: string } | null;
  compatibilityScore: number | null;
}

interface Position {
  id: string;
  title: string;
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (positionFilter) params.set("positionId", positionFilter);

    try {
      const res = await fetch(`/api/applicants?${params}`);
      const data = await res.json();
      setApplicants(data.applicants || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("応募者の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, positionFilter]);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      setPositions(data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applicants/${applicantId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("ステータスを更新しました");
      fetchApplicants();
    } catch {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">応募者管理</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            全 {total} 名の応募者
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/applicants/import">
            <Button variant="outline" className="border-[#769FCD] text-[#769FCD] hover:bg-[#F7FBFC]">
              <Upload className="w-4 h-4 mr-2" />
              インポート
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white">
                <Plus className="w-4 h-4 mr-2" />
                新規登録
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#2C3E50]">応募者を登録</DialogTitle>
              </DialogHeader>
              <ApplicantForm
                positions={positions}
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchApplicants();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[#B9D7EA] shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7F8C9B]" />
              <Input
                placeholder="名前で検索..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">すべて</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={positionFilter}
              onValueChange={(v) => {
                setPositionFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="職種" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">すべて</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center border border-[#B9D7EA] rounded-lg overflow-hidden">
              <button
                className={`px-3 py-2 ${viewMode === "table" ? "bg-[#769FCD] text-white" : "text-[#7F8C9B] hover:bg-[#D6E6F2]"}`}
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                className={`px-3 py-2 ${viewMode === "kanban" ? "bg-[#769FCD] text-white" : "text-[#7F8C9B] hover:bg-[#D6E6F2]"}`}
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "table" ? (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#D6E6F2] hover:bg-[#D6E6F2]">
                  <TableHead className="text-[#2C3E50]">氏名</TableHead>
                  <TableHead className="text-[#2C3E50]">応募職種</TableHead>
                  <TableHead className="text-[#2C3E50]">ステータス</TableHead>
                  <TableHead className="text-[#2C3E50]">応募日</TableHead>
                  <TableHead className="text-[#2C3E50]">評価</TableHead>
                  <TableHead className="text-[#2C3E50]">相性</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#7F8C9B]">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : applicants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#7F8C9B]">
                      応募者が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  applicants.map((a, i) => (
                    <TableRow
                      key={a.id}
                      className={`cursor-pointer hover:bg-[#D6E6F2]/50 ${i % 2 === 0 ? "bg-white" : "bg-[#F7FBFC]"}`}
                    >
                      <TableCell>
                        <Link
                          href={`/applicants/${a.id}`}
                          className="text-[#769FCD] hover:text-[#4A7FB5] font-medium"
                        >
                          {a.lastName} {a.firstName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-[#7F8C9B]">
                        {a.position?.title || "未設定"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[a.status] || "bg-gray-100 text-gray-800"}>
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[#7F8C9B]">
                        {formatDate(a.appliedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= (a.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.compatibilityScore != null ? (
                          <Badge
                            className={
                              a.compatibilityScore >= 80
                                ? "bg-green-100 text-green-800"
                                : a.compatibilityScore >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }
                          >
                            {Math.round(a.compatibilityScore)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-[#7F8C9B]">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#B9D7EA]">
                <p className="text-sm text-[#7F8C9B]">
                  {(page - 1) * limit + 1}〜{Math.min(page * limit, total)} / {total}件
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-[#2C3E50]">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          applicants={applicants}
          onStatusChange={handleStatusChange}
          onRefresh={fetchApplicants}
        />
      )}
    </div>
  );
}

// Applicant creation form
function ApplicantForm({
  positions,
  onSuccess,
}: {
  positions: Position[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    lastNameKana: "",
    firstNameKana: "",
    email: "",
    phone: "",
    positionId: "",
    source: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lastName || !form.firstName) {
      toast.error("姓と名は必須です");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          positionId: form.positionId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "登録に失敗しました");
      }

      toast.success("応募者を登録しました");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>姓 *</Label>
          <Input
            placeholder="山田"
            value={form.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>名 *</Label>
          <Input
            placeholder="花子"
            value={form.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>セイ</Label>
          <Input
            placeholder="ヤマダ"
            value={form.lastNameKana}
            onChange={(e) => handleChange("lastNameKana", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>メイ</Label>
          <Input
            placeholder="ハナコ"
            value={form.firstNameKana}
            onChange={(e) => handleChange("firstNameKana", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>メールアドレス</Label>
        <Input
          type="email"
          placeholder="example@email.com"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>電話番号</Label>
        <Input
          placeholder="090-1234-5678"
          value={form.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>応募職種</Label>
        <Select value={form.positionId} onValueChange={(v) => handleChange("positionId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>応募経路</Label>
        <Input
          placeholder="例: Indeed、ジョブメドレー、紹介"
          value={form.source}
          onChange={(e) => handleChange("source", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>メモ</Label>
        <Textarea
          placeholder="備考を入力..."
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
        disabled={loading}
      >
        {loading ? "登録中..." : "登録する"}
      </Button>
    </form>
  );
}
