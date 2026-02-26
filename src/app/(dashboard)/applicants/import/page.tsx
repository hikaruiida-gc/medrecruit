"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

type Step = "upload" | "sheet" | "mapping" | "preview" | "importing" | "done";

interface ColumnMapping {
  source: string;
  target: string;
}

const targetFields = [
  { value: "", label: "マッピングしない" },
  { value: "lastName", label: "姓" },
  { value: "firstName", label: "名" },
  { value: "lastNameKana", label: "セイ（カナ）" },
  { value: "firstNameKana", label: "メイ（カナ）" },
  { value: "fullName", label: "氏名（姓名結合）" },
  { value: "email", label: "メールアドレス" },
  { value: "phone", label: "電話番号" },
  { value: "address", label: "住所" },
  { value: "gender", label: "性別" },
  { value: "dateOfBirth", label: "生年月日" },
  { value: "currentEmployer", label: "現在の勤務先" },
  { value: "yearsExperience", label: "経験年数" },
  { value: "licenses", label: "保有資格" },
  { value: "education", label: "最終学歴" },
  { value: "source", label: "応募経路" },
  { value: "notes", label: "メモ" },
];

const autoMappingRules: Record<string, string> = {
  "氏名": "fullName",
  "名前": "fullName",
  "フルネーム": "fullName",
  "姓": "lastName",
  "名": "firstName",
  "セイ": "lastNameKana",
  "メイ": "firstNameKana",
  "カナ姓": "lastNameKana",
  "カナ名": "firstNameKana",
  "メール": "email",
  "email": "email",
  "e-mail": "email",
  "メールアドレス": "email",
  "電話": "phone",
  "tel": "phone",
  "電話番号": "phone",
  "住所": "address",
  "性別": "gender",
  "生年月日": "dateOfBirth",
  "勤務先": "currentEmployer",
  "現在の勤務先": "currentEmployer",
  "経験年数": "yearsExperience",
  "資格": "licenses",
  "保有資格": "licenses",
  "学歴": "education",
  "最終学歴": "education",
  "応募経路": "source",
  "備考": "notes",
  "メモ": "notes",
};

interface ImportResult {
  success: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [allData, setAllData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;

    const maxSize = 10 * 1024 * 1024;
    if (f.size > maxSize) {
      toast.error("ファイルサイズは10MB以下にしてください");
      return;
    }

    setFile(f);

    try {
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      if (wb.SheetNames.length === 1) {
        selectSheet(wb, wb.SheetNames[0]);
      } else {
        setStep("sheet");
      }
    } catch {
      toast.error("ファイルの読み込みに失敗しました");
    }
  }, []);

  const selectSheet = (wb: XLSX.WorkBook, name: string) => {
    setSelectedSheet(name);
    const sheet = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    if (json.length < 2) {
      toast.error("データが不足しています（ヘッダー行 + 1行以上必要）");
      return;
    }

    const headerRow = json[0].map((h) => String(h || "").trim());
    const dataRows = json.slice(1).filter((row) => row.some((cell) => cell != null && cell !== ""));

    setHeaders(headerRow);
    setPreviewData(dataRows.slice(0, 5).map((row) => row.map((cell) => String(cell ?? ""))));
    setAllData(dataRows.map((row) => row.map((cell) => String(cell ?? ""))));

    // Auto-mapping
    const autoMapping = headerRow.map((header) => {
      const normalized = header.toLowerCase().trim();
      const match = Object.entries(autoMappingRules).find(
        ([key]) => key.toLowerCase() === normalized
      );
      return {
        source: header,
        target: match ? match[1] : "",
      };
    });

    setMapping(autoMapping);
    setStep("mapping");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const updateMapping = (index: number, target: string) => {
    const newMapping = [...mapping];
    newMapping[index] = { ...newMapping[index], target };
    setMapping(newMapping);
  };

  const handleImport = async () => {
    const activeMappings = mapping.filter((m) => m.target);
    const hasLastName = activeMappings.some((m) => m.target === "lastName" || m.target === "fullName");
    const hasFirstName = activeMappings.some((m) => m.target === "firstName" || m.target === "fullName");

    if (!hasLastName || !hasFirstName) {
      toast.error("姓と名（または氏名）のマッピングは必須です");
      return;
    }

    setStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file!);
      formData.append("mapping", JSON.stringify(activeMappings));

      const res = await fetch("/api/applicants/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "インポートに失敗しました");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setProgress(100);
      setStep("done");

      if (data.success > 0) {
        toast.success(`${data.success}件のインポートが完了しました`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "インポートに失敗しました");
      setStep("mapping");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/applicants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">応募者インポート</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            Excel/CSVファイルから応募者を一括登録
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {[
          { key: "upload", label: "ファイル選択" },
          { key: "mapping", label: "カラム設定" },
          { key: "importing", label: "インポート" },
          { key: "done", label: "完了" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-0.5 bg-[#D6E6F2]" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                step === s.key || (s.key === "upload" && step === "sheet")
                  ? "bg-[#769FCD] text-white"
                  : ["mapping", "preview", "importing", "done"].indexOf(step) >
                      ["upload", "sheet", "mapping", "preview", "importing", "done"].indexOf(s.key)
                    ? "bg-[#D6E6F2] text-[#2C3E50]"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upload step */}
      {(step === "upload" || step === "sheet") && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="pt-6">
            {step === "upload" && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-[#769FCD] bg-[#D6E6F2]/50"
                    : "border-[#B9D7EA] hover:border-[#769FCD] hover:bg-[#F7FBFC]"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto text-[#769FCD] mb-4" />
                <p className="text-[#2C3E50] font-medium mb-1">
                  ファイルをドラッグ&ドロップ
                </p>
                <p className="text-sm text-[#7F8C9B]">
                  または クリックしてファイルを選択
                </p>
                <p className="text-xs text-[#7F8C9B] mt-2">
                  対応形式: .xlsx, .xls, .csv（最大10MB）
                </p>
              </div>
            )}

            {step === "sheet" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#2C3E50]">
                  <FileSpreadsheet className="w-5 h-5 text-[#769FCD]" />
                  <span className="font-medium">{file?.name}</span>
                  <button onClick={() => { setStep("upload"); setFile(null); }}>
                    <X className="w-4 h-4 text-[#7F8C9B]" />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-[#7F8C9B] mb-2">
                    シートを選択してください:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sheetNames.map((name) => (
                      <Button
                        key={name}
                        variant="outline"
                        className="border-[#769FCD] text-[#769FCD] hover:bg-[#D6E6F2]"
                        onClick={() => selectSheet(workbook!, name)}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapping step */}
      {(step === "mapping" || step === "preview") && (
        <>
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">
                カラムマッピング
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mapping.map((m, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-48 text-sm text-[#2C3E50] font-medium truncate">
                      {m.source}
                    </div>
                    <span className="text-[#7F8C9B]">→</span>
                    <Select
                      value={m.target}
                      onValueChange={(v) => updateMapping(i, v)}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="マッピング先を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((f) => (
                          <SelectItem key={f.value} value={f.value || "_none"}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-[#B9D7EA] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#2C3E50]">
                プレビュー（先頭5行）
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#D6E6F2]">
                    <TableHead className="text-[#2C3E50] w-12">#</TableHead>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="text-[#2C3E50]">
                        <div>
                          <div className="text-xs text-[#7F8C9B]">{h}</div>
                          {mapping[i]?.target && (
                            <Badge variant="secondary" className="text-xs mt-0.5">
                              {targetFields.find((f) => f.value === mapping[i].target)?.label}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, ri) => (
                    <TableRow key={ri}>
                      <TableCell className="text-xs text-[#7F8C9B]">{ri + 1}</TableCell>
                      {headers.map((_, ci) => (
                        <TableCell key={ci} className="text-sm">
                          {row[ci] || ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#7F8C9B]">
              全 {allData.length} 行のデータをインポートします
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                }}
              >
                やり直す
              </Button>
              <Button
                className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                onClick={handleImport}
              >
                インポート開始
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Importing */}
      {step === "importing" && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-3 border-[#769FCD] border-t-transparent rounded-full mx-auto" />
              <p className="text-[#2C3E50] font-medium">インポート中...</p>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === "done" && result && (
        <Card className="border-[#B9D7EA] shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h2 className="text-xl font-bold text-[#2C3E50]">
                インポート完了
              </h2>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-sm text-[#7F8C9B]">成功</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                  <p className="text-sm text-[#7F8C9B]">スキップ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-sm text-[#7F8C9B]">エラー</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 text-left max-w-lg mx-auto">
                  <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    エラー詳細
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        行 {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white mt-4"
                onClick={() => router.push("/applicants")}
              >
                応募者一覧へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
