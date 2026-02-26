"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  X,
  Plus,
} from "lucide-react";

interface EducationEntry {
  year: string | null;
  month: string | null;
  description: string | null;
}

interface WorkHistoryEntry {
  year: string | null;
  month: string | null;
  company: string | null;
  department: string | null;
  description: string | null;
  isCurrentJob: boolean;
}

interface LicenseEntry {
  year: string | null;
  month: string | null;
  name: string | null;
}

interface ResumeData {
  lastName: string | null;
  firstName: string | null;
  lastNameKana: string | null;
  firstNameKana: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  education: EducationEntry[];
  workHistory: WorkHistoryEntry[];
  licenses: LicenseEntry[];
  selfPR: string | null;
  motivation: string | null;
  specialSkills: string | null;
}

type UploadState = "idle" | "uploading" | "parsing" | "preview" | "confirmed";

interface ResumeUploadProps {
  applicantId: string;
  onSuccess?: () => void;
}

export function ResumeUpload({ applicantId, onSuccess }: ResumeUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const uploadedFile = acceptedFiles[0];
      if (!uploadedFile) return;

      setFile(uploadedFile);
      setError(null);
      setState("uploading");

      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        setState("parsing");
        const res = await fetch(
          `/api/applicants/${applicantId}/parse-resume`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "解析に失敗しました");
          setState("idle");
          return;
        }

        setParsedData(data.parsedData);
        setConfidence(data.confidence);
        setIsDemo(data.demo === true);
        setState("preview");
      } catch {
        setError("アップロード中にエラーが発生しました");
        setState("idle");
      }
    },
    [applicantId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled: state !== "idle",
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection?.errors[0]?.code === "file-too-large") {
        setError("ファイルサイズは5MB以下にしてください");
      } else if (rejection?.errors[0]?.code === "file-invalid-type") {
        setError("PDFファイルのみアップロード可能です");
      } else {
        setError("ファイルのアップロードに失敗しました");
      }
    },
  });

  const handleReset = () => {
    setState("idle");
    setFile(null);
    setParsedData(null);
    setConfidence(0);
    setIsDemo(false);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!parsedData) return;
    setConfirming(true);

    try {
      const res = await fetch(
        `/api/applicants/${applicantId}/parse-resume/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parsedData }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "保存に失敗しました");
        return;
      }

      setState("confirmed");
      toast.success("履歴書データを保存しました");
      onSuccess?.();
    } catch {
      toast.error("保存中にエラーが発生しました");
    } finally {
      setConfirming(false);
    }
  };

  // Helper to update nested parsed data
  const updateField = (field: keyof ResumeData, value: unknown) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, [field]: value });
  };

  const updateEducation = (
    index: number,
    field: keyof EducationEntry,
    value: string
  ) => {
    if (!parsedData) return;
    const updated = [...parsedData.education];
    updated[index] = { ...updated[index], [field]: value };
    setParsedData({ ...parsedData, education: updated });
  };

  const addEducation = () => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      education: [
        ...parsedData.education,
        { year: null, month: null, description: null },
      ],
    });
  };

  const removeEducation = (index: number) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      education: parsedData.education.filter((_, i) => i !== index),
    });
  };

  const updateWorkHistory = (
    index: number,
    field: keyof WorkHistoryEntry,
    value: string | boolean
  ) => {
    if (!parsedData) return;
    const updated = [...parsedData.workHistory];
    updated[index] = { ...updated[index], [field]: value };
    setParsedData({ ...parsedData, workHistory: updated });
  };

  const addWorkHistory = () => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      workHistory: [
        ...parsedData.workHistory,
        {
          year: null,
          month: null,
          company: null,
          department: null,
          description: null,
          isCurrentJob: false,
        },
      ],
    });
  };

  const removeWorkHistory = (index: number) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      workHistory: parsedData.workHistory.filter((_, i) => i !== index),
    });
  };

  const updateLicense = (
    index: number,
    field: keyof LicenseEntry,
    value: string
  ) => {
    if (!parsedData) return;
    const updated = [...parsedData.licenses];
    updated[index] = { ...updated[index], [field]: value };
    setParsedData({ ...parsedData, licenses: updated });
  };

  const addLicense = () => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      licenses: [
        ...parsedData.licenses,
        { year: null, month: null, name: null },
      ],
    });
  };

  const removeLicense = (index: number) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      licenses: parsedData.licenses.filter((_, i) => i !== index),
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Idle / Dropzone state ──────────────────────
  if (state === "idle") {
    return (
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-[#769FCD] bg-[#769FCD]/5"
              : "border-[#B9D7EA] hover:border-[#769FCD] hover:bg-[#F7FBFC]"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto text-[#769FCD] mb-3" />
          <p className="text-sm font-medium text-[#2C3E50]">
            {isDragActive
              ? "ここにドロップしてください"
              : "履歴書PDFをドラッグ＆ドロップまたはクリックして選択"}
          </p>
          <p className="text-xs text-[#7F8C9B] mt-1">
            PDF形式のみ対応・最大5MB
          </p>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Uploading / Parsing state ──────────────────
  if (state === "uploading" || state === "parsing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-10 h-10 text-[#769FCD] animate-spin" />
        <p className="text-sm text-[#2C3E50] font-medium">
          {state === "uploading"
            ? "アップロード中..."
            : "AIが履歴書を解析中..."}
        </p>
        <p className="text-xs text-[#7F8C9B]">しばらくお待ちください</p>
      </div>
    );
  }

  // ─── Confirmed state ────────────────────────────
  if (state === "confirmed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-sm text-[#2C3E50] font-medium">
          履歴書データを保存しました
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="mt-2"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          別のファイルをアップロード
        </Button>
      </div>
    );
  }

  // ─── Preview state ──────────────────────────────
  if (state === "preview" && parsedData) {
    return (
      <div className="space-y-4">
        {/* Demo banner */}
        {isDemo && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              デモモード: サンプルデータが表示されています
            </p>
          </div>
        )}

        {/* Confidence + File info row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#769FCD]" />
            <div>
              <p className="text-sm font-medium text-[#2C3E50]">
                {file?.name}
              </p>
              <p className="text-xs text-[#7F8C9B]">
                {file ? formatFileSize(file.size) : ""}
              </p>
            </div>
          </div>
          <Badge
            className={
              confidence >= 0.8
                ? "bg-green-100 text-green-800"
                : confidence >= 0.5
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
            }
          >
            読取精度: {Math.round(confidence * 100)}%
          </Badge>
        </div>

        {/* Parsed data form */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2C3E50]">
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">姓</Label>
                <Input
                  value={parsedData.lastName || ""}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">名</Label>
                <Input
                  value={parsedData.firstName || ""}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">セイ</Label>
                <Input
                  value={parsedData.lastNameKana || ""}
                  onChange={(e) => updateField("lastNameKana", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">メイ</Label>
                <Input
                  value={parsedData.firstNameKana || ""}
                  onChange={(e) => updateField("firstNameKana", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">生年月日</Label>
                <Input
                  type="date"
                  value={parsedData.dateOfBirth || ""}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">性別</Label>
                <Select
                  value={parsedData.gender || ""}
                  onValueChange={(v) => updateField("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">男性</SelectItem>
                    <SelectItem value="FEMALE">女性</SelectItem>
                    <SelectItem value="OTHER">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">住所</Label>
                <Input
                  value={parsedData.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">メールアドレス</Label>
                <Input
                  type="email"
                  value={parsedData.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">電話番号</Label>
                <Input
                  value={parsedData.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#2C3E50]">学歴</CardTitle>
            <Button variant="ghost" size="sm" onClick={addEducation}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedData.education.length === 0 && (
              <p className="text-xs text-[#7F8C9B]">学歴データがありません</p>
            )}
            {parsedData.education.map((edu, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 bg-[#F7FBFC] rounded-lg"
              >
                <div className="flex-1 grid grid-cols-[80px_80px_1fr] gap-2 items-center">
                  <Input
                    placeholder="年"
                    value={edu.year || ""}
                    onChange={(e) => updateEducation(i, "year", e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="月"
                    value={edu.month || ""}
                    onChange={(e) =>
                      updateEducation(i, "month", e.target.value)
                    }
                    className="text-xs"
                  />
                  <Input
                    placeholder="学歴内容"
                    value={edu.description || ""}
                    onChange={(e) =>
                      updateEducation(i, "description", e.target.value)
                    }
                    className="text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 shrink-0 p-1 h-auto"
                  onClick={() => removeEducation(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Work History */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#2C3E50]">職歴</CardTitle>
            <Button variant="ghost" size="sm" onClick={addWorkHistory}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedData.workHistory.length === 0 && (
              <p className="text-xs text-[#7F8C9B]">職歴データがありません</p>
            )}
            {parsedData.workHistory.map((work, i) => (
              <div
                key={i}
                className="p-3 bg-[#F7FBFC] rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="年"
                      value={work.year || ""}
                      onChange={(e) =>
                        updateWorkHistory(i, "year", e.target.value)
                      }
                      className="w-20 text-xs"
                    />
                    <Input
                      placeholder="月"
                      value={work.month || ""}
                      onChange={(e) =>
                        updateWorkHistory(i, "month", e.target.value)
                      }
                      className="w-20 text-xs"
                    />
                    {work.isCurrentJob && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        在職中
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="flex items-center gap-1 text-xs text-[#7F8C9B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={work.isCurrentJob}
                        onChange={(e) =>
                          updateWorkHistory(i, "isCurrentJob", e.target.checked)
                        }
                        className="rounded"
                      />
                      在職中
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-600 p-1 h-auto"
                      onClick={() => removeWorkHistory(i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    placeholder="勤務先名"
                    value={work.company || ""}
                    onChange={(e) =>
                      updateWorkHistory(i, "company", e.target.value)
                    }
                    className="text-xs"
                  />
                  <Input
                    placeholder="診療科・部署"
                    value={work.department || ""}
                    onChange={(e) =>
                      updateWorkHistory(i, "department", e.target.value)
                    }
                    className="text-xs"
                  />
                </div>
                <Input
                  placeholder="業務内容"
                  value={work.description || ""}
                  onChange={(e) =>
                    updateWorkHistory(i, "description", e.target.value)
                  }
                  className="text-xs"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Licenses */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#2C3E50]">資格</CardTitle>
            <Button variant="ghost" size="sm" onClick={addLicense}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedData.licenses.length === 0 && (
              <p className="text-xs text-[#7F8C9B]">資格データがありません</p>
            )}
            {parsedData.licenses.map((lic, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 bg-[#F7FBFC] rounded-lg"
              >
                <div className="flex-1 grid grid-cols-[80px_80px_1fr] gap-2 items-center">
                  <Input
                    placeholder="年"
                    value={lic.year || ""}
                    onChange={(e) => updateLicense(i, "year", e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="月"
                    value={lic.month || ""}
                    onChange={(e) => updateLicense(i, "month", e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="資格名"
                    value={lic.name || ""}
                    onChange={(e) => updateLicense(i, "name", e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 shrink-0 p-1 h-auto"
                  onClick={() => removeLicense(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Self PR & Motivation */}
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#2C3E50]">
              自己PR・志望動機
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">自己PR</Label>
              <Textarea
                value={parsedData.selfPR || ""}
                onChange={(e) => updateField("selfPR", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">志望動機</Label>
              <Textarea
                value={parsedData.motivation || ""}
                onChange={(e) => updateField("motivation", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">特技・スキル</Label>
              <Input
                value={parsedData.specialSkills || ""}
                onChange={(e) => updateField("specialSkills", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={handleReset} disabled={confirming}>
            <RotateCcw className="w-4 h-4 mr-1" />
            やり直す
          </Button>
          <Button
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {confirming ? "保存中..." : "確定"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Display component for already-parsed resume data ───────────
interface ResumeDataDisplayProps {
  data: Record<string, unknown>;
}

export function ResumeDataDisplay({ data }: ResumeDataDisplayProps) {
  const genderLabel: Record<string, string> = {
    MALE: "男性",
    FEMALE: "女性",
    OTHER: "その他",
  };

  const education = (data.education as EducationEntry[] | undefined) || [];
  const workHistory =
    (data.workHistory as WorkHistoryEntry[] | undefined) || [];
  const licenses = (data.licenses as LicenseEntry[] | undefined) || [];

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
        <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">基本情報</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {data.lastName ? (
            <div>
              <span className="text-[#7F8C9B]">氏名: </span>
              <span className="text-[#2C3E50]">
                {data.lastName as string} {data.firstName as string}
              </span>
            </div>
          ) : null}
          {data.lastNameKana ? (
            <div>
              <span className="text-[#7F8C9B]">フリガナ: </span>
              <span className="text-[#2C3E50]">
                {data.lastNameKana as string} {data.firstNameKana as string}
              </span>
            </div>
          ) : null}
          {data.dateOfBirth ? (
            <div>
              <span className="text-[#7F8C9B]">生年月日: </span>
              <span className="text-[#2C3E50]">
                {data.dateOfBirth as string}
              </span>
            </div>
          ) : null}
          {data.gender ? (
            <div>
              <span className="text-[#7F8C9B]">性別: </span>
              <span className="text-[#2C3E50]">
                {genderLabel[data.gender as string] || (data.gender as string)}
              </span>
            </div>
          ) : null}
          {data.address ? (
            <div className="md:col-span-2">
              <span className="text-[#7F8C9B]">住所: </span>
              <span className="text-[#2C3E50]">{data.address as string}</span>
            </div>
          ) : null}
          {data.email ? (
            <div>
              <span className="text-[#7F8C9B]">メール: </span>
              <span className="text-[#2C3E50]">{data.email as string}</span>
            </div>
          ) : null}
          {data.phone ? (
            <div>
              <span className="text-[#7F8C9B]">電話: </span>
              <span className="text-[#2C3E50]">{data.phone as string}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Education */}
      {education.length > 0 && (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">学歴</h4>
          <div className="space-y-1">
            {education.map((edu, i) => (
              <div key={i} className="text-sm text-[#2C3E50]">
                <span className="text-[#7F8C9B] inline-block w-24">
                  {edu.year && edu.month
                    ? `${edu.year}年${edu.month}月`
                    : edu.year
                      ? `${edu.year}年`
                      : ""}
                </span>
                {edu.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work History */}
      {workHistory.length > 0 && (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">職歴</h4>
          <div className="space-y-3">
            {workHistory.map((work, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#7F8C9B] inline-block w-24">
                    {work.year && work.month
                      ? `${work.year}年${work.month}月`
                      : work.year
                        ? `${work.year}年`
                        : ""}
                  </span>
                  <span className="text-[#2C3E50] font-medium">
                    {work.company}
                  </span>
                  {work.department && (
                    <span className="text-[#7F8C9B]">
                      ({work.department})
                    </span>
                  )}
                  {work.isCurrentJob && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      在職中
                    </Badge>
                  )}
                </div>
                {work.description && (
                  <p className="text-[#7F8C9B] ml-24 text-xs mt-0.5">
                    {work.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Licenses */}
      {licenses.length > 0 && (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-3">資格</h4>
          <div className="space-y-1">
            {licenses.map((lic, i) => (
              <div key={i} className="text-sm text-[#2C3E50]">
                <span className="text-[#7F8C9B] inline-block w-24">
                  {lic.year && lic.month
                    ? `${lic.year}年${lic.month}月`
                    : lic.year
                      ? `${lic.year}年`
                      : ""}
                </span>
                {lic.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Self PR */}
      {data.selfPR ? (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-2">
            自己PR
          </h4>
          <p className="text-sm text-[#2C3E50] whitespace-pre-wrap">
            {data.selfPR as string}
          </p>
        </div>
      ) : null}

      {/* Motivation */}
      {data.motivation ? (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-2">
            志望動機
          </h4>
          <p className="text-sm text-[#2C3E50] whitespace-pre-wrap">
            {data.motivation as string}
          </p>
        </div>
      ) : null}

      {/* Special Skills */}
      {data.specialSkills ? (
        <div className="p-4 bg-[#F7FBFC] rounded-lg border border-[#D6E6F2]">
          <h4 className="text-sm font-semibold text-[#2C3E50] mb-2">
            特技・スキル
          </h4>
          <p className="text-sm text-[#2C3E50]">
            {data.specialSkills as string}
          </p>
        </div>
      ) : null}
    </div>
  );
}
