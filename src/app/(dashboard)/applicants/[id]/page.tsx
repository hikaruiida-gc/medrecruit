"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Save,
  Trash2,
  FileText,
  Plus,
  Mic,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_COLORS,
  formatDate,
} from "@/lib/constants";
import { ResumeUpload, ResumeDataDisplay } from "@/components/resume-upload";
import { InterviewRecorder } from "@/components/interview-recorder";

interface ApplicantDetail {
  id: string;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  currentEmployer: string | null;
  yearsExperience: number | null;
  licenses: string | null;
  education: string | null;
  status: string;
  source: string | null;
  appliedAt: string;
  rating: number | null;
  notes: string | null;
  personalityType: string | null;
  compatibilityScore: number | null;
  compatibilityReport: string | null;
  resumeUrl: string | null;
  resumeParsedData: Record<string, unknown> | null;
  position: { id: string; title: string } | null;
  interviews: InterviewData[];
  statusHistory: StatusHistoryItem[];
}

interface InterviewData {
  id: string;
  scheduledAt: string;
  duration: number | null;
  type: string;
  status: string;
  interviewerName: string | null;
  audioUrl: string | null;
  transcript: string | null;
  summary: string | null;
  keyPoints: KeyPoints | null;
  evaluation: Evaluation | null;
  notes: string | null;
  rating: number | null;
}

interface KeyPoints {
  strengths: string[];
  concerns: string[];
  followUp: string[];
}

interface Evaluation {
  expertise: number;
  communication: number;
  teamwork: number;
  motivation: number;
  cultureFit: number;
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  note: string | null;
  changedAt: string;
}

export default function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ApplicantDetail>>({});

  // Interview scheduling
  const [showNewInterviewDialog, setShowNewInterviewDialog] = useState(false);
  const [newInterviewForm, setNewInterviewForm] = useState({
    scheduledAt: "",
    type: "IN_PERSON",
    interviewerName: "",
  });
  const [creatingInterview, setCreatingInterview] = useState(false);

  // Interview detail expansion
  const [expandedInterviewId, setExpandedInterviewId] = useState<string | null>(null);

  const fetchApplicant = useCallback(async () => {
    try {
      const res = await fetch(`/api/applicants/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApplicant(data);
      setEditForm(data);
    } catch {
      toast.error("応募者情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplicant();
  }, [fetchApplicant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applicants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast.success("保存しました");
      fetchApplicant();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この応募者を削除しますか？この操作は元に戻せません。")) return;
    try {
      const res = await fetch(`/api/applicants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("削除しました");
      router.push("/applicants");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/applicants/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("ステータスを更新しました");
      fetchApplicant();
    } catch {
      toast.error("ステータスの更新に失敗しました");
    }
  };

  const handleRating = async (rating: number) => {
    try {
      const res = await fetch(`/api/applicants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error();
      fetchApplicant();
    } catch {
      toast.error("評価の更新に失敗しました");
    }
  };

  const handleCreateInterview = async () => {
    if (!newInterviewForm.scheduledAt) {
      toast.error("面接日時を入力してください");
      return;
    }

    setCreatingInterview(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: id,
          scheduledAt: new Date(newInterviewForm.scheduledAt).toISOString(),
          type: newInterviewForm.type,
          interviewerName: newInterviewForm.interviewerName || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "面接の作成に失敗しました");
      }

      toast.success("面接を登録しました");
      setShowNewInterviewDialog(false);
      setNewInterviewForm({
        scheduledAt: "",
        type: "IN_PERSON",
        interviewerName: "",
      });
      fetchApplicant();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "面接の作成に失敗しました"
      );
    } finally {
      setCreatingInterview(false);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm("この面接記録を削除しますか？")) return;
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("面接記録を削除しました");
      if (expandedInterviewId === interviewId) {
        setExpandedInterviewId(null);
      }
      fetchApplicant();
    } catch {
      toast.error("面接記録の削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#7F8C9B]">読み込み中...</p>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="text-center py-12">
        <p className="text-[#7F8C9B]">応募者が見つかりません</p>
        <Link href="/applicants">
          <Button className="mt-4" variant="outline">
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/applicants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">
              {applicant.lastName} {applicant.firstName}
              {applicant.lastNameKana && applicant.firstNameKana && (
                <span className="text-sm font-normal text-[#7F8C9B] ml-2">
                  ({applicant.lastNameKana} {applicant.firstNameKana})
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={STATUS_COLORS[applicant.status]}>
                {STATUS_LABELS[applicant.status]}
              </Badge>
              {applicant.position && (
                <span className="text-sm text-[#7F8C9B]">{applicant.position.title}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-300 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            削除
          </Button>
        </div>
      </div>

      {/* Status & Rating row */}
      <Card className="border-[#B9D7EA] shadow-sm">
        <CardContent className="pt-4 flex flex-wrap items-center gap-6">
          <div className="space-y-1">
            <Label className="text-xs text-[#7F8C9B]">ステータス</Label>
            <Select value={applicant.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#7F8C9B]">評価</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => handleRating(s)}>
                  <Star
                    className={`w-5 h-5 cursor-pointer transition-colors ${
                      s <= (applicant.rating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 hover:text-amber-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          {applicant.compatibilityScore != null && (
            <div className="space-y-1">
              <Label className="text-xs text-[#7F8C9B]">相性スコア</Label>
              <Badge
                className={`text-base px-3 py-1 ${
                  applicant.compatibilityScore >= 80
                    ? "bg-green-100 text-green-800"
                    : applicant.compatibilityScore >= 60
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {Math.round(applicant.compatibilityScore)}%
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-[#D6E6F2]">
          <TabsTrigger value="info">基本情報</TabsTrigger>
          <TabsTrigger value="resume">履歴書</TabsTrigger>
          <TabsTrigger value="interviews">面接</TabsTrigger>
          <TabsTrigger value="compatibility">相性診断</TabsTrigger>
          <TabsTrigger value="history">変更履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>姓</Label>
                  <Input
                    value={editForm.lastName || ""}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>名</Label>
                  <Input
                    value={editForm.firstName || ""}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-[#7F8C9B]">
                  <Mail className="w-4 h-4" />
                  <Input
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="メールアドレス"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-[#7F8C9B]">
                  <Phone className="w-4 h-4" />
                  <Input
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="電話番号"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-[#7F8C9B]">
                  <MapPin className="w-4 h-4" />
                  <Input
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="住所"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-[#7F8C9B]">
                  <Calendar className="w-4 h-4" />
                  <Input
                    type="date"
                    value={editForm.dateOfBirth ? new Date(editForm.dateOfBirth).toISOString().split("T")[0] : ""}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" /> 現在の勤務先
                  </Label>
                  <Input
                    value={editForm.currentEmployer || ""}
                    onChange={(e) => setEditForm({ ...editForm, currentEmployer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>経験年数</Label>
                  <Input
                    type="number"
                    value={editForm.yearsExperience ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, yearsExperience: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4" /> 保有資格
                </Label>
                <Input
                  value={editForm.licenses || ""}
                  onChange={(e) => setEditForm({ ...editForm, licenses: e.target.value })}
                  placeholder="例: 歯科衛生士、普通自動車免許"
                />
              </div>

              <div className="space-y-2">
                <Label>最終学歴</Label>
                <Input
                  value={editForm.education || ""}
                  onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>メモ</Label>
                <Textarea
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSave}
                className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "保存中..." : "保存する"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <FileText className="w-5 h-5" />
                履歴書
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {applicant.resumeUrl && (
                <div className="flex items-center gap-2 p-3 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
                  <FileText className="w-4 h-4 text-[#769FCD]" />
                  <a
                    href={applicant.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#769FCD] hover:text-[#4A7FB5] underline"
                  >
                    アップロード済みPDFを表示
                  </a>
                </div>
              )}

              {applicant.resumeParsedData ? (
                <div>
                  <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">
                    解析済みデータ
                  </h4>
                  <ResumeDataDisplay data={applicant.resumeParsedData} />
                  <div className="mt-6 pt-4 border-t border-[#D6E6F2]">
                    <p className="text-xs text-[#7F8C9B] mb-3">
                      別の履歴書をアップロードして再解析することもできます
                    </p>
                    <ResumeUpload
                      applicantId={id}
                      onSuccess={fetchApplicant}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[#7F8C9B] mb-4">
                    履歴書PDFをアップロードすると、AIが自動で内容を読み取り、応募者情報に反映します。
                  </p>
                  <ResumeUpload
                    applicantId={id}
                    onSuccess={fetchApplicant}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <div className="space-y-4">
            {/* Header with add button */}
            <Card className="border-[#B9D7EA] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                  <Mic className="w-5 h-5 text-[#769FCD]" />
                  面接履歴
                </CardTitle>
                <Dialog
                  open={showNewInterviewDialog}
                  onOpenChange={setShowNewInterviewDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      面接を登録
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しい面接を登録</DialogTitle>
                      <DialogDescription>
                        面接の日時、形式、面接官を入力してください。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>面接日時 *</Label>
                        <Input
                          type="datetime-local"
                          value={newInterviewForm.scheduledAt}
                          onChange={(e) =>
                            setNewInterviewForm({
                              ...newInterviewForm,
                              scheduledAt: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>面接形式</Label>
                        <Select
                          value={newInterviewForm.type}
                          onValueChange={(value) =>
                            setNewInterviewForm({
                              ...newInterviewForm,
                              type: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(INTERVIEW_TYPE_LABELS).map(
                              ([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>面接官名</Label>
                        <Input
                          value={newInterviewForm.interviewerName}
                          onChange={(e) =>
                            setNewInterviewForm({
                              ...newInterviewForm,
                              interviewerName: e.target.value,
                            })
                          }
                          placeholder="例: 田中太郎"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewInterviewDialog(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleCreateInterview}
                        disabled={creatingInterview}
                        className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                      >
                        {creatingInterview ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            登録中...
                          </>
                        ) : (
                          "登録する"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {applicant.interviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Mic className="w-12 h-12 text-[#D6E6F2] mx-auto mb-3" />
                    <p className="text-sm text-[#7F8C9B]">面接記録がありません</p>
                    <p className="text-xs text-[#7F8C9B] mt-1">
                      「面接を登録」ボタンから新しい面接を作成できます
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applicant.interviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="border border-[#D6E6F2] rounded-lg overflow-hidden"
                      >
                        {/* Interview card header */}
                        <div
                          className="p-4 bg-[#F7FBFC] cursor-pointer hover:bg-[#EDF4F8] transition-colors"
                          onClick={() =>
                            setExpandedInterviewId(
                              expandedInterviewId === interview.id
                                ? null
                                : interview.id
                            )
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-[#2C3E50]">
                                {formatDate(interview.scheduledAt)}
                              </span>
                              <Badge variant="secondary">
                                {INTERVIEW_TYPE_LABELS[interview.type] ||
                                  interview.type}
                              </Badge>
                              <Badge
                                className={
                                  INTERVIEW_STATUS_COLORS[interview.status] ||
                                  ""
                                }
                              >
                                {INTERVIEW_STATUS_LABELS[interview.status] ||
                                  interview.status}
                              </Badge>
                              {interview.rating != null && interview.rating > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3.5 h-3.5 ${
                                        s <= interview.rating!
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {interview.interviewerName && (
                                <span className="text-xs text-[#7F8C9B]">
                                  面接官: {interview.interviewerName}
                                </span>
                              )}
                              {interview.summary && (
                                <Badge className="bg-purple-100 text-purple-800 text-[10px]">
                                  AI要約あり
                                </Badge>
                              )}
                              {expandedInterviewId === interview.id ? (
                                <ChevronUp className="w-4 h-4 text-[#7F8C9B]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#7F8C9B]" />
                              )}
                            </div>
                          </div>
                          {interview.summary &&
                            expandedInterviewId !== interview.id && (
                              <p className="text-xs text-[#7F8C9B] mt-2 line-clamp-2">
                                {interview.summary}
                              </p>
                            )}
                        </div>

                        {/* Expanded interview detail */}
                        {expandedInterviewId === interview.id && (
                          <div className="p-4 border-t border-[#D6E6F2] space-y-4">
                            {/* Delete button */}
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 border-red-300 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInterview(interview.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                削除
                              </Button>
                            </div>

                            {/* Show recorder for SCHEDULED or IN_PROGRESS */}
                            {(interview.status === "SCHEDULED" ||
                              interview.status === "IN_PROGRESS") && (
                              <InterviewRecorder
                                interviewId={interview.id}
                                onTranscriptComplete={fetchApplicant}
                                onSummaryComplete={fetchApplicant}
                                existingNotes={interview.notes}
                                existingRating={interview.rating}
                              />
                            )}

                            {/* Show full data for COMPLETED */}
                            {interview.status === "COMPLETED" && (
                              <InterviewRecorder
                                interviewId={interview.id}
                                onTranscriptComplete={fetchApplicant}
                                onSummaryComplete={fetchApplicant}
                                existingTranscript={interview.transcript}
                                existingSummary={interview.summary}
                                existingKeyPoints={interview.keyPoints}
                                existingEvaluation={interview.evaluation}
                                existingRating={interview.rating}
                                existingNotes={interview.notes}
                              />
                            )}

                            {/* CANCELLED status */}
                            {interview.status === "CANCELLED" && (
                              <div className="text-center py-4">
                                <p className="text-sm text-[#7F8C9B]">
                                  この面接はキャンセルされました
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compatibility">
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">相性診断</CardTitle>
            </CardHeader>
            <CardContent>
              {applicant.compatibilityReport ? (
                <div className="prose prose-sm max-w-none">
                  <div
                    dangerouslySetInnerHTML={{ __html: applicant.compatibilityReport }}
                  />
                </div>
              ) : (
                <p className="text-sm text-[#7F8C9B]">
                  相性診断がまだ実行されていません。Phase 3で相性診断機能が追加されます。
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">ステータス変更履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {applicant.statusHistory.length === 0 ? (
                <p className="text-sm text-[#7F8C9B]">変更履歴がありません</p>
              ) : (
                <div className="space-y-3">
                  {applicant.statusHistory.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 p-3 bg-[#F7FBFC] rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {h.fromStatus && (
                            <>
                              <Badge className={STATUS_COLORS[h.fromStatus]} variant="secondary">
                                {STATUS_LABELS[h.fromStatus]}
                              </Badge>
                              <span className="text-xs text-[#7F8C9B]">→</span>
                            </>
                          )}
                          <Badge className={STATUS_COLORS[h.toStatus]}>
                            {STATUS_LABELS[h.toStatus]}
                          </Badge>
                        </div>
                        {h.note && (
                          <p className="text-xs text-[#7F8C9B] mt-1">{h.note}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#7F8C9B]">
                          {formatDate(h.changedAt)}
                        </p>
                        {h.changedBy && (
                          <p className="text-xs text-[#7F8C9B]">{h.changedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
