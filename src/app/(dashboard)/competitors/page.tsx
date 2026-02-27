"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  Navigation,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Link2,
  Loader2,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ===== Types =====

interface CompetitorCondition {
  id: string;
  competitorId: string;
  jobTitle: string;
  salaryMin: number | null;
  salaryMax: number | null;
  hourlyRate: number | null;
  benefits: string | null;
  workingHours: string | null;
  holidays: string | null;
  source: string | null;
  fetchedAt: string;
}

interface Competitor {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  distance: number | null;
  website: string | null;
  createdAt: string;
  conditions: CompetitorCondition[];
}

interface Position {
  id: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  benefits: string | null;
  employmentType: string;
  isActive: boolean;
}

// ===== Helper Functions =====

function getSalaryAvg(min: number | null, max: number | null): number | null {
  if (min && max) return Math.round((min + max) / 2);
  if (min) return min;
  if (max) return max;
  return null;
}

function getComparisonResult(
  ours: number | null,
  theirs: number | null
): "win" | "lose" | "draw" | "na" {
  if (ours === null || theirs === null) return "na";
  const diff = ours - theirs;
  const threshold = Math.max(ours, theirs) * 0.05;
  if (diff > threshold) return "win";
  if (diff < -threshold) return "lose";
  return "draw";
}

function getResultStyle(result: "win" | "lose" | "draw" | "na"): string {
  switch (result) {
    case "win":
      return "bg-green-50 text-green-800";
    case "lose":
      return "bg-red-50 text-red-800";
    case "draw":
      return "bg-yellow-50 text-yellow-800";
    default:
      return "text-[#7F8C9B]";
  }
}

function getResultLabel(result: "win" | "lose" | "draw" | "na"): string {
  switch (result) {
    case "win":
      return "自院が上";
    case "lose":
      return "競合が上";
    case "draw":
      return "同等";
    default:
      return "-";
  }
}

function getResultIcon(result: "win" | "lose" | "draw" | "na") {
  switch (result) {
    case "win":
      return <TrendingUp className="w-4 h-4" />;
    case "lose":
      return <TrendingDown className="w-4 h-4" />;
    case "draw":
      return <Minus className="w-4 h-4" />;
    default:
      return null;
  }
}

// Scoring functions for radar chart
function scoreSalary(
  salaryAvg: number | null,
  allSalaries: number[]
): number {
  if (salaryAvg === null || allSalaries.length === 0) return 3;
  const sorted = [...allSalaries].sort((a, b) => a - b);
  const rank = sorted.indexOf(salaryAvg);
  const percentile = (rank + 1) / sorted.length;
  if (percentile >= 0.75) return 5;
  if (percentile >= 0.5) return 4;
  if (percentile >= 0.25) return 3;
  if (percentile >= 0.1) return 2;
  return 1;
}

function scoreHolidays(holidays: string | null): number {
  if (!holidays) return 3;
  const nums = holidays.match(/\d+/g);
  if (!nums) return 3;
  const maxDays = Math.max(...nums.map(Number));
  if (maxDays >= 120) return 5;
  if (maxDays >= 110) return 4;
  if (maxDays >= 100) return 3;
  if (maxDays >= 90) return 2;
  return 1;
}

function scoreBenefits(benefits: string | null): number {
  if (!benefits) return 1;
  const items = benefits
    .split(/[,、，\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const count = items.length;
  if (count >= 8) return 5;
  if (count >= 6) return 4;
  if (count >= 4) return 3;
  if (count >= 2) return 2;
  return 1;
}

// ===== Component =====

export default function CompetitorsPage() {
  // Data state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [editCompetitorDialogOpen, setEditCompetitorDialogOpen] =
    useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editConditionDialogOpen, setEditConditionDialogOpen] = useState(false);
  const [deleteConditionConfirmOpen, setDeleteConditionConfirmOpen] =
    useState(false);

  // Form state for competitor
  const [competitorForm, setCompetitorForm] = useState({
    name: "",
    address: "",
    distance: "",
    website: "",
  });

  // Form state for condition
  const [conditionForm, setConditionForm] = useState({
    jobTitle: "",
    salaryMin: "",
    salaryMax: "",
    hourlyRate: "",
    benefits: "",
    workingHours: "",
    holidays: "",
    source: "",
  });

  // Selected items
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<
    string | null
  >(null);
  const [editingCompetitor, setEditingCompetitor] =
    useState<Competitor | null>(null);
  const [deletingCompetitor, setDeletingCompetitor] =
    useState<Competitor | null>(null);
  const [editingCondition, setEditingCondition] =
    useState<CompetitorCondition | null>(null);
  const [deletingCondition, setDeletingCondition] = useState<{
    competitorId: string;
    conditionId: string;
  } | null>(null);

  // Radar chart competitor selector
  const [radarCompetitorId, setRadarCompetitorId] = useState<string>("");

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // URL import state
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    clinicName: string;
    address: string | null;
    website: string | null;
    conditions: Array<{
      jobTitle: string;
      salaryMin: number | null;
      salaryMax: number | null;
      hourlyRate: number | null;
      benefits: string | null;
      workingHours: string | null;
      holidays: string | null;
    }>;
  } | null>(null);
  const [importSourceUrl, setImportSourceUrl] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  // ===== Data Fetching =====

  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await fetch("/api/competitors");
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setCompetitors(data);
    } catch {
      toast.error("競合情報の取得に失敗しました");
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/positions");
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setPositions(data);
    } catch {
      toast.error("募集職種の取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCompetitors(), fetchPositions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchCompetitors, fetchPositions]);

  // ===== Competitor CRUD =====

  const handleCreateCompetitor = async () => {
    if (!competitorForm.name.trim()) {
      toast.error("医療機関名は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: competitorForm.name.trim(),
          address: competitorForm.address.trim() || null,
          distance: competitorForm.distance
            ? Number(competitorForm.distance)
            : null,
          website: competitorForm.website.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "作成失敗");
      }
      const newCompetitor = await res.json();
      toast.success(`${newCompetitor.name}を追加しました`);
      setCompetitorDialogOpen(false);
      resetCompetitorForm();
      await fetchCompetitors();

      // Open condition dialog for the new competitor
      setSelectedCompetitorId(newCompetitor.id);
      resetConditionForm();
      setConditionDialogOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "競合の追加に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompetitor = async () => {
    if (!editingCompetitor) return;
    if (!competitorForm.name.trim()) {
      toast.error("医療機関名は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/competitors/${editingCompetitor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: competitorForm.name.trim(),
          address: competitorForm.address.trim() || null,
          distance: competitorForm.distance
            ? Number(competitorForm.distance)
            : null,
          website: competitorForm.website.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失敗");
      }
      toast.success("競合情報を更新しました");
      setEditCompetitorDialogOpen(false);
      setEditingCompetitor(null);
      resetCompetitorForm();
      await fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompetitor = async () => {
    if (!deletingCompetitor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/competitors/${deletingCompetitor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "削除失敗");
      }
      toast.success(`${deletingCompetitor.name}を削除しました`);
      setDeleteConfirmOpen(false);
      setDeletingCompetitor(null);
      await fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "削除に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Condition CRUD =====

  const handleCreateCondition = async () => {
    if (!selectedCompetitorId) return;
    if (!conditionForm.jobTitle.trim()) {
      toast.error("職種名は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/competitors/${selectedCompetitorId}/conditions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: conditionForm.jobTitle.trim(),
            salaryMin: conditionForm.salaryMin
              ? Number(conditionForm.salaryMin)
              : null,
            salaryMax: conditionForm.salaryMax
              ? Number(conditionForm.salaryMax)
              : null,
            hourlyRate: conditionForm.hourlyRate
              ? Number(conditionForm.hourlyRate)
              : null,
            benefits: conditionForm.benefits.trim() || null,
            workingHours: conditionForm.workingHours.trim() || null,
            holidays: conditionForm.holidays.trim() || null,
            source: conditionForm.source.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "作成失敗");
      }
      toast.success("条件を追加しました");
      setConditionDialogOpen(false);
      resetConditionForm();
      await fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "条件の追加に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCondition = async () => {
    if (!editingCondition) return;
    if (!conditionForm.jobTitle.trim()) {
      toast.error("職種名は必須です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/competitors/${editingCondition.competitorId}/conditions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditionId: editingCondition.id,
            jobTitle: conditionForm.jobTitle.trim(),
            salaryMin: conditionForm.salaryMin
              ? Number(conditionForm.salaryMin)
              : null,
            salaryMax: conditionForm.salaryMax
              ? Number(conditionForm.salaryMax)
              : null,
            hourlyRate: conditionForm.hourlyRate
              ? Number(conditionForm.hourlyRate)
              : null,
            benefits: conditionForm.benefits.trim() || null,
            workingHours: conditionForm.workingHours.trim() || null,
            holidays: conditionForm.holidays.trim() || null,
            source: conditionForm.source.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失敗");
      }
      toast.success("条件を更新しました");
      setEditConditionDialogOpen(false);
      setEditingCondition(null);
      resetConditionForm();
      await fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCondition = async () => {
    if (!deletingCondition) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/competitors/${deletingCondition.competitorId}/conditions`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conditionId: deletingCondition.conditionId,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "削除失敗");
      }
      toast.success("条件を削除しました");
      setDeleteConditionConfirmOpen(false);
      setDeletingCondition(null);
      await fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "削除に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Form Helpers =====

  const resetCompetitorForm = () => {
    setCompetitorForm({ name: "", address: "", distance: "", website: "" });
  };

  const resetConditionForm = () => {
    setConditionForm({
      jobTitle: "",
      salaryMin: "",
      salaryMax: "",
      hourlyRate: "",
      benefits: "",
      workingHours: "",
      holidays: "",
      source: "",
    });
  };

  const openEditCompetitor = (comp: Competitor) => {
    setEditingCompetitor(comp);
    setCompetitorForm({
      name: comp.name,
      address: comp.address || "",
      distance: comp.distance?.toString() || "",
      website: comp.website || "",
    });
    setEditCompetitorDialogOpen(true);
  };

  const openDeleteCompetitor = (comp: Competitor) => {
    setDeletingCompetitor(comp);
    setDeleteConfirmOpen(true);
  };

  const openAddCondition = (competitorId: string) => {
    setSelectedCompetitorId(competitorId);
    resetConditionForm();
    setConditionDialogOpen(true);
  };

  const openEditCondition = (condition: CompetitorCondition) => {
    setEditingCondition(condition);
    setConditionForm({
      jobTitle: condition.jobTitle,
      salaryMin: condition.salaryMin?.toString() || "",
      salaryMax: condition.salaryMax?.toString() || "",
      hourlyRate: condition.hourlyRate?.toString() || "",
      benefits: condition.benefits || "",
      workingHours: condition.workingHours || "",
      holidays: condition.holidays || "",
      source: condition.source || "",
    });
    setEditConditionDialogOpen(true);
  };

  const openDeleteCondition = (
    competitorId: string,
    conditionId: string
  ) => {
    setDeletingCondition({ competitorId, conditionId });
    setDeleteConditionConfirmOpen(true);
  };

  // ===== Comparison Data =====

  const buildComparisonData = () => {
    const rows: Array<{
      jobTitle: string;
      competitorName: string;
      competitorId: string;
      ourSalaryAvg: number | null;
      theirSalaryAvg: number | null;
      diff: number | null;
      result: "win" | "lose" | "draw" | "na";
    }> = [];

    for (const comp of competitors) {
      for (const cond of comp.conditions) {
        // Find matching position by job title (case-insensitive, partial match)
        const matchedPosition = positions.find(
          (p) =>
            p.isActive &&
            (p.title.includes(cond.jobTitle) ||
              cond.jobTitle.includes(p.title) ||
              p.title.toLowerCase() === cond.jobTitle.toLowerCase())
        );

        const ourAvg = matchedPosition
          ? getSalaryAvg(matchedPosition.salaryMin, matchedPosition.salaryMax)
          : null;
        const theirAvg = getSalaryAvg(cond.salaryMin, cond.salaryMax);
        const diff =
          ourAvg !== null && theirAvg !== null ? ourAvg - theirAvg : null;

        rows.push({
          jobTitle: cond.jobTitle,
          competitorName: comp.name,
          competitorId: comp.id,
          ourSalaryAvg: ourAvg,
          theirSalaryAvg: theirAvg,
          diff,
          result: getComparisonResult(ourAvg, theirAvg),
        });
      }
    }
    return rows;
  };

  // ===== Radar Chart Data =====

  const buildRadarData = (competitorId: string) => {
    const comp = competitors.find((c) => c.id === competitorId);
    if (!comp) return [];

    // Collect all salaries for relative scoring
    const allSalaries: number[] = [];
    for (const p of positions) {
      const avg = getSalaryAvg(p.salaryMin, p.salaryMax);
      if (avg) allSalaries.push(avg);
    }
    for (const c of competitors) {
      for (const cond of c.conditions) {
        const avg = getSalaryAvg(cond.salaryMin, cond.salaryMax);
        if (avg) allSalaries.push(avg);
      }
    }

    // Calculate 自院 scores
    const ourSalaryAvgs = positions
      .filter((p) => p.isActive)
      .map((p) => getSalaryAvg(p.salaryMin, p.salaryMax))
      .filter((v): v is number => v !== null);
    const ourAvgSalary =
      ourSalaryAvgs.length > 0
        ? Math.round(
            ourSalaryAvgs.reduce((a, b) => a + b, 0) / ourSalaryAvgs.length
          )
        : null;

    const ourBenefitsText = positions
      .filter((p) => p.isActive && p.benefits)
      .map((p) => p.benefits!)
      .join(", ");

    const ourSalaryScore = scoreSalary(ourAvgSalary, allSalaries);
    const ourBenefitsScore = scoreBenefits(ourBenefitsText);
    // For simplicity, score access/education/WLB from benefits text keywords
    const ourAccessScore = 3;
    const ourEducationScore = ourBenefitsText.match(
      /研修|教育|資格|学会|セミナー/
    )
      ? 4
      : 3;
    const ourWlbScore = ourBenefitsText.match(
      /育児|介護|時短|フレックス|リモート|テレワーク/
    )
      ? 4
      : 3;
    const ourHolidaysScore = 3; // Default since Position model doesn't have holidays field

    // Calculate competitor scores
    const compSalaryAvgs = comp.conditions
      .map((c) => getSalaryAvg(c.salaryMin, c.salaryMax))
      .filter((v): v is number => v !== null);
    const compAvgSalary =
      compSalaryAvgs.length > 0
        ? Math.round(
            compSalaryAvgs.reduce((a, b) => a + b, 0) / compSalaryAvgs.length
          )
        : null;

    const compHolidaysTexts = comp.conditions
      .map((c) => c.holidays)
      .filter((h): h is string => h !== null);
    const compHolidaysScores = compHolidaysTexts.map(scoreHolidays);
    const compHolidaysScore =
      compHolidaysScores.length > 0
        ? Math.round(
            compHolidaysScores.reduce((a, b) => a + b, 0) /
              compHolidaysScores.length
          )
        : 3;

    const compBenefitsText = comp.conditions
      .map((c) => c.benefits)
      .filter((b): b is string => b !== null)
      .join(", ");

    const compSalaryScore = scoreSalary(compAvgSalary, allSalaries);
    const compBenefitsScore = scoreBenefits(compBenefitsText);
    const compAccessScore = comp.distance
      ? comp.distance <= 5
        ? 4
        : comp.distance <= 10
          ? 3
          : 2
      : 3;
    const compEducationScore = compBenefitsText.match(
      /研修|教育|資格|学会|セミナー/
    )
      ? 4
      : 3;
    const compWlbScore = compBenefitsText.match(
      /育児|介護|時短|フレックス|リモート|テレワーク/
    )
      ? 4
      : 3;

    return [
      {
        axis: "給与水準",
        自院: ourSalaryScore,
        [comp.name]: compSalaryScore,
      },
      {
        axis: "休日数",
        自院: ourHolidaysScore,
        [comp.name]: compHolidaysScore,
      },
      {
        axis: "福利厚生",
        自院: ourBenefitsScore,
        [comp.name]: compBenefitsScore,
      },
      {
        axis: "アクセス",
        自院: ourAccessScore,
        [comp.name]: compAccessScore,
      },
      {
        axis: "教育・研修",
        自院: ourEducationScore,
        [comp.name]: compEducationScore,
      },
      {
        axis: "ワークライフバランス",
        自院: ourWlbScore,
        [comp.name]: compWlbScore,
      },
    ];
  };

  // ===== URL Import =====

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      toast.error("URLを入力してください");
      return;
    }
    setImporting(true);
    setImportPreview(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/competitors/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取り込みに失敗しました");

      if (!data.extractedData || !data.extractedData.clinicName) {
        throw new Error("求人情報を正しく読み取れませんでした。別のURLをお試しください。");
      }

      setImportPreview(data.extractedData);
      setImportSourceUrl(data.sourceUrl);

      if (data.demo) {
        toast.info("デモデータが表示されています（API未設定）");
      } else {
        toast.success("求人情報を取り込みました。内容を確認してください。");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.error("取り込みがタイムアウトしました。もう一度お試しください。");
      } else {
        toast.error(
          error instanceof Error ? error.message : "取り込みに失敗しました"
        );
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSaveImport = async () => {
    if (!importPreview) return;
    setSavingImport(true);
    try {
      // Create competitor
      const compRes = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: importPreview.clinicName,
          address: importPreview.address,
          website: importPreview.website,
        }),
      });
      if (!compRes.ok) {
        const err = await compRes.json();
        throw new Error(err.error || "競合の作成に失敗しました");
      }
      const newCompetitor = await compRes.json();

      // Create conditions
      for (const cond of importPreview.conditions) {
        await fetch(`/api/competitors/${newCompetitor.id}/conditions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: cond.jobTitle,
            salaryMin: cond.salaryMin,
            salaryMax: cond.salaryMax,
            hourlyRate: cond.hourlyRate,
            benefits: cond.benefits,
            workingHours: cond.workingHours,
            holidays: cond.holidays,
            source: importSourceUrl,
          }),
        });
      }

      toast.success(
        `${importPreview.clinicName}と${importPreview.conditions.length}件の条件を登録しました`
      );
      setUrlImportOpen(false);
      setImportUrl("");
      setImportPreview(null);
      fetchCompetitors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "保存に失敗しました"
      );
    } finally {
      setSavingImport(false);
    }
  };

  // ===== Render =====

  const comparisonRows = buildComparisonData();
  const selectedRadarCompetitor = competitors.find(
    (c) => c.id === radarCompetitorId
  );
  const radarData = radarCompetitorId
    ? buildRadarData(radarCompetitorId)
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">競合条件比較</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">読み込み中...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#769FCD]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== A. Header ===== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">競合条件比較</h1>
          <p className="text-sm text-[#7F8C9B] mt-1">
            登録済み競合機関: {competitors.length}件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[#B9D7EA] text-[#4A7FB5] hover:bg-[#D6E6F2]"
            onClick={() => {
              setUrlImportOpen(true);
              setImportPreview(null);
              setImportUrl("");
            }}
          >
            <Link2 className="w-4 h-4 mr-1" />
            URLから取り込み
          </Button>
          <Button
            className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            onClick={() => {
              resetCompetitorForm();
              setCompetitorDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            競合を追加
          </Button>
        </div>
      </div>

      {/* ===== C. Competitor Cards Grid ===== */}
      {competitors.length === 0 ? (
        <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
          <CardContent>
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto text-[#B9D7EA] mb-4" />
              <p className="text-[#7F8C9B]">
                競合医療機関がまだ登録されていません。
              </p>
              <p className="text-sm text-[#7F8C9B] mt-1">
                「競合を追加」ボタンから登録してください。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {competitors.map((comp) => (
            <Card
              key={comp.id}
              className="border-[#B9D7EA] shadow-sm rounded-xl"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#769FCD]" />
                      {comp.name}
                    </CardTitle>
                    <div className="mt-2 space-y-1">
                      {comp.address && (
                        <p className="text-sm text-[#7F8C9B] flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {comp.address}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        {comp.distance !== null && (
                          <p className="text-sm text-[#7F8C9B] flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" />
                            {comp.distance}km
                          </p>
                        )}
                        {comp.website && (
                          <a
                            href={comp.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#769FCD] hover:text-[#4A7FB5] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Webサイト
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCompetitor(comp)}
                      className="text-[#7F8C9B] hover:text-[#2C3E50]"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteCompetitor(comp)}
                      className="text-[#7F8C9B] hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {comp.conditions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#D6E6F2]">
                          <TableHead className="text-[#2C3E50] text-xs">
                            職種
                          </TableHead>
                          <TableHead className="text-[#2C3E50] text-xs">
                            月給範囲
                          </TableHead>
                          <TableHead className="text-[#2C3E50] text-xs">
                            福利厚生
                          </TableHead>
                          <TableHead className="text-[#2C3E50] text-xs w-16">
                            操作
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comp.conditions.map((cond) => (
                          <TableRow key={cond.id}>
                            <TableCell className="text-sm text-[#2C3E50] font-medium">
                              {cond.jobTitle}
                            </TableCell>
                            <TableCell className="text-sm text-[#2C3E50]">
                              {cond.salaryMin || cond.salaryMax ? (
                                <>
                                  {cond.salaryMin
                                    ? formatCurrency(cond.salaryMin)
                                    : ""}
                                  {cond.salaryMin && cond.salaryMax
                                    ? " ~ "
                                    : ""}
                                  {cond.salaryMax
                                    ? formatCurrency(cond.salaryMax)
                                    : ""}
                                </>
                              ) : cond.hourlyRate ? (
                                <span>
                                  時給 {formatCurrency(cond.hourlyRate)}
                                </span>
                              ) : (
                                <span className="text-[#7F8C9B]">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-[#7F8C9B] max-w-[200px] truncate">
                              {cond.benefits || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-[#7F8C9B] hover:text-[#2C3E50]"
                                  onClick={() => openEditCondition(cond)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-[#7F8C9B] hover:text-red-600"
                                  onClick={() =>
                                    openDeleteCondition(comp.id, cond.id)
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-[#7F8C9B] text-center py-4">
                    条件がまだ登録されていません
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-[#D6E6F2]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#769FCD] border-[#B9D7EA] hover:bg-[#D6E6F2]"
                    onClick={() => openAddCondition(comp.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    条件を追加
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== E. Comparison Dashboard ===== */}
      {comparisonRows.length > 0 && (
        <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#769FCD]" />
              給与比較ダッシュボード
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#D6E6F2]">
                    <TableHead className="text-[#2C3E50]">職種</TableHead>
                    <TableHead className="text-[#2C3E50]">競合名</TableHead>
                    <TableHead className="text-[#2C3E50] text-right">
                      自院給与
                    </TableHead>
                    <TableHead className="text-[#2C3E50] text-right">
                      競合給与
                    </TableHead>
                    <TableHead className="text-[#2C3E50] text-right">
                      差額
                    </TableHead>
                    <TableHead className="text-[#2C3E50] text-center">
                      勝敗
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm text-[#2C3E50] font-medium">
                        {row.jobTitle}
                      </TableCell>
                      <TableCell className="text-sm text-[#7F8C9B]">
                        {row.competitorName}
                      </TableCell>
                      <TableCell className="text-sm text-[#2C3E50] text-right">
                        {row.ourSalaryAvg !== null
                          ? formatCurrency(row.ourSalaryAvg)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-[#2C3E50] text-right">
                        {row.theirSalaryAvg !== null
                          ? formatCurrency(row.theirSalaryAvg)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {row.diff !== null ? (
                          <span
                            className={
                              row.diff > 0
                                ? "text-green-600"
                                : row.diff < 0
                                  ? "text-red-600"
                                  : "text-[#7F8C9B]"
                            }
                          >
                            {row.diff > 0 ? "+" : ""}
                            {formatCurrency(row.diff)}
                          </span>
                        ) : (
                          <span className="text-[#7F8C9B]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`${getResultStyle(row.result)} border-0 inline-flex items-center gap-1`}
                        >
                          {getResultIcon(row.result)}
                          {getResultLabel(row.result)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== F. Radar Chart ===== */}
      {competitors.length > 0 && (
        <Card className="border-[#B9D7EA] shadow-sm rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#769FCD]" />
                レーダーチャート比較
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-[#7F8C9B]">比較対象:</Label>
                <Select
                  value={radarCompetitorId}
                  onValueChange={setRadarCompetitorId}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="競合を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitors.map((comp) => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {radarCompetitorId && radarData.length > 0 ? (
              <div className="w-full flex justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData} cx="50%" cy="50%">
                    <PolarGrid stroke="#D6E6F2" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: "#2C3E50", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      tick={{ fill: "#7F8C9B", fontSize: 10 }}
                      tickCount={6}
                    />
                    <Radar
                      name="自院"
                      dataKey="自院"
                      stroke="#769FCD"
                      fill="#769FCD"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name={selectedRadarCompetitor?.name || "競合"}
                      dataKey={selectedRadarCompetitor?.name || "競合"}
                      stroke="#F0AD4E"
                      fill="#F0AD4E"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "14px", color: "#2C3E50" }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-[#B9D7EA] mb-3" />
                <p className="text-sm text-[#7F8C9B]">
                  比較する競合を選択してください
                </p>
              </div>
            )}
            {radarCompetitorId && radarData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {radarData.map((item) => {
                  const ourVal = item["自院"] as number;
                  const compName = selectedRadarCompetitor?.name || "";
                  const theirVal = (item[compName] as number) || 0;
                  return (
                    <div
                      key={item.axis}
                      className="p-2 rounded-lg bg-[#F7FBFC] border border-[#D6E6F2]"
                    >
                      <p className="text-xs text-[#7F8C9B]">{item.axis}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-medium text-[#769FCD]">
                          自院: {ourVal}
                        </span>
                        <span className="text-sm font-medium text-[#F0AD4E]">
                          {compName}: {theirVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== B. Competitor Registration Dialog ===== */}
      <Dialog
        open={competitorDialogOpen}
        onOpenChange={setCompetitorDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              競合医療機関を追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#2C3E50]">
                医療機関名 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={competitorForm.name}
                onChange={(e) =>
                  setCompetitorForm({ ...competitorForm, name: e.target.value })
                }
                placeholder="例: ○○クリニック"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">住所</Label>
              <Input
                value={competitorForm.address}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    address: e.target.value,
                  })
                }
                placeholder="例: 東京都渋谷区..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">距離 (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={competitorForm.distance}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    distance: e.target.value,
                  })
                }
                placeholder="例: 2.5"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">WebサイトURL</Label>
              <Input
                value={competitorForm.website}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    website: e.target.value,
                  })
                }
                placeholder="例: https://..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompetitorDialogOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreateCompetitor}
              disabled={submitting}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {submitting ? "追加中..." : "追加して条件を登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Competitor Dialog ===== */}
      <Dialog
        open={editCompetitorDialogOpen}
        onOpenChange={setEditCompetitorDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              競合情報を編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#2C3E50]">
                医療機関名 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={competitorForm.name}
                onChange={(e) =>
                  setCompetitorForm({ ...competitorForm, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">住所</Label>
              <Input
                value={competitorForm.address}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    address: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">距離 (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={competitorForm.distance}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    distance: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">WebサイトURL</Label>
              <Input
                value={competitorForm.website}
                onChange={(e) =>
                  setCompetitorForm({
                    ...competitorForm,
                    website: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditCompetitorDialogOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateCompetitor}
              disabled={submitting}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {submitting ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Competitor Confirm Dialog ===== */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">削除の確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7F8C9B]">
            「{deletingCompetitor?.name}」を削除しますか？
            <br />
            この操作は取り消せません。登録されている条件も全て削除されます。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteCompetitor}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== D. Condition Adding Dialog ===== */}
      <Dialog
        open={conditionDialogOpen}
        onOpenChange={setConditionDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              採用条件を追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label className="text-[#2C3E50]">
                職種名 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={conditionForm.jobTitle}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    jobTitle: e.target.value,
                  })
                }
                placeholder="例: 看護師"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#2C3E50]">月給下限</Label>
                <Input
                  type="number"
                  value={conditionForm.salaryMin}
                  onChange={(e) =>
                    setConditionForm({
                      ...conditionForm,
                      salaryMin: e.target.value,
                    })
                  }
                  placeholder="例: 250000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[#2C3E50]">月給上限</Label>
                <Input
                  type="number"
                  value={conditionForm.salaryMax}
                  onChange={(e) =>
                    setConditionForm({
                      ...conditionForm,
                      salaryMax: e.target.value,
                    })
                  }
                  placeholder="例: 350000"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[#2C3E50]">時給</Label>
              <Input
                type="number"
                value={conditionForm.hourlyRate}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    hourlyRate: e.target.value,
                  })
                }
                placeholder="例: 1800"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">福利厚生</Label>
              <Textarea
                value={conditionForm.benefits}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    benefits: e.target.value,
                  })
                }
                placeholder="例: 社会保険完備, 交通費支給, 退職金制度, 住宅手当"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">勤務時間</Label>
              <Input
                value={conditionForm.workingHours}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    workingHours: e.target.value,
                  })
                }
                placeholder="例: 8:30~17:30"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">休日</Label>
              <Input
                value={conditionForm.holidays}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    holidays: e.target.value,
                  })
                }
                placeholder="例: 年間120日, 土日祝休み"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">情報源URL</Label>
              <Input
                value={conditionForm.source}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    source: e.target.value,
                  })
                }
                placeholder="例: https://..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConditionDialogOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreateCondition}
              disabled={submitting}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {submitting ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Condition Dialog ===== */}
      <Dialog
        open={editConditionDialogOpen}
        onOpenChange={setEditConditionDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              採用条件を編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label className="text-[#2C3E50]">
                職種名 <span className="text-red-500">*</span>
              </Label>
              <Input
                value={conditionForm.jobTitle}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    jobTitle: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#2C3E50]">月給下限</Label>
                <Input
                  type="number"
                  value={conditionForm.salaryMin}
                  onChange={(e) =>
                    setConditionForm({
                      ...conditionForm,
                      salaryMin: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[#2C3E50]">月給上限</Label>
                <Input
                  type="number"
                  value={conditionForm.salaryMax}
                  onChange={(e) =>
                    setConditionForm({
                      ...conditionForm,
                      salaryMax: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-[#2C3E50]">時給</Label>
              <Input
                type="number"
                value={conditionForm.hourlyRate}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    hourlyRate: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">福利厚生</Label>
              <Textarea
                value={conditionForm.benefits}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    benefits: e.target.value,
                  })
                }
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">勤務時間</Label>
              <Input
                value={conditionForm.workingHours}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    workingHours: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">休日</Label>
              <Input
                value={conditionForm.holidays}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    holidays: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[#2C3E50]">情報源URL</Label>
              <Input
                value={conditionForm.source}
                onChange={(e) =>
                  setConditionForm({
                    ...conditionForm,
                    source: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditConditionDialogOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateCondition}
              disabled={submitting}
              className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
            >
              {submitting ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Condition Confirm Dialog ===== */}
      <Dialog
        open={deleteConditionConfirmOpen}
        onOpenChange={setDeleteConditionConfirmOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50]">
              条件の削除確認
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7F8C9B]">
            この条件を削除しますか？この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConditionConfirmOpen(false)}
              className="text-[#7F8C9B]"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDeleteCondition}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== URL Import Dialog ===== */}
      <Dialog open={urlImportOpen} onOpenChange={setUrlImportOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2C3E50] flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#769FCD]" />
              競合の求人URLから取り込み
            </DialogTitle>
          </DialogHeader>

          {!importPreview ? (
            // Step 1: URL入力
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="competitorImportUrl" className="text-[#2C3E50]">
                  求人ページURL
                </Label>
                <Input
                  id="competitorImportUrl"
                  type="url"
                  placeholder="https://example.com/clinic/job/12345"
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
                  競合医院の求人ページURLを指定すると、AIが医院名・職種別・勤務形態別の
                  採用条件を自動抽出します。Indeed、ジョブメドレー、デンタルワーカー、
                  グッピー等の求人サイトに対応しています。
                </p>
              </div>
              {importing && (
                <div className="flex items-center gap-3 p-3 bg-[#D6E6F2]/50 rounded-lg">
                  <Loader2 className="w-5 h-5 text-[#769FCD] animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-[#2C3E50]">取り込み中...</p>
                    <p className="text-xs text-[#7F8C9B]">
                      ページを取得してAIが求人条件を解析しています
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUrlImportOpen(false)}
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
            </div>
          ) : (
            // Step 2: プレビュー確認
            <div className="space-y-4 py-2">
              {/* 医院情報 */}
              <Card className="border-[#B9D7EA]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#2C3E50] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#769FCD]" />
                    {importPreview.clinicName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[#7F8C9B] space-y-1">
                  {importPreview.address && (
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {importPreview.address}
                    </p>
                  )}
                  {importPreview.website && (
                    <p className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {importPreview.website}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* 抽出された条件一覧 */}
              <div>
                <h4 className="text-sm font-semibold text-[#2C3E50] mb-2">
                  抽出された採用条件（{importPreview.conditions.length}件）
                </h4>
                <div className="space-y-3">
                  {importPreview.conditions.map((cond, i) => (
                    <Card key={i} className="border-[#D6E6F2]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-[#769FCD] text-white text-xs">
                            {cond.jobTitle}
                          </Badge>
                          {cond.hourlyRate ? (
                            <span className="text-sm text-[#2C3E50] font-medium">
                              時給 ¥{cond.hourlyRate.toLocaleString()}
                            </span>
                          ) : (cond.salaryMin || cond.salaryMax) ? (
                            <span className="text-sm text-[#2C3E50] font-medium">
                              月給 {cond.salaryMin ? `¥${cond.salaryMin.toLocaleString()}` : ""}
                              {cond.salaryMin && cond.salaryMax ? " 〜 " : ""}
                              {cond.salaryMax ? `¥${cond.salaryMax.toLocaleString()}` : ""}
                            </span>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#7F8C9B]">
                          {cond.workingHours && (
                            <div>
                              <span className="font-medium text-[#2C3E50]">勤務時間: </span>
                              {cond.workingHours}
                            </div>
                          )}
                          {cond.holidays && (
                            <div>
                              <span className="font-medium text-[#2C3E50]">休日: </span>
                              {cond.holidays}
                            </div>
                          )}
                          {cond.benefits && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-[#2C3E50]">待遇: </span>
                              {cond.benefits}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null);
                    setImportUrl("");
                  }}
                  className="border-[#B9D7EA] text-[#2C3E50]"
                >
                  やり直す
                </Button>
                <Button
                  onClick={handleSaveImport}
                  disabled={savingImport}
                  className="bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
                >
                  {savingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      この内容で登録する
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
