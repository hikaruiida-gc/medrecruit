export const STATUS_LABELS: Record<string, string> = {
  NEW: "新規",
  SCREENING: "書類選考中",
  INTERVIEW_1: "一次面接",
  INTERVIEW_2: "二次面接",
  OFFER: "内定",
  ACCEPTED: "承諾",
  REJECTED: "不採用",
  WITHDRAWN: "辞退",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  SCREENING: "bg-purple-100 text-purple-800",
  INTERVIEW_1: "bg-indigo-100 text-indigo-800",
  INTERVIEW_2: "bg-cyan-100 text-cyan-800",
  OFFER: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WITHDRAWN: "bg-gray-100 text-gray-800",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "常勤",
  PART_TIME: "パート",
  CONTRACT: "契約",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "男性",
  FEMALE: "女性",
  OTHER: "その他",
};

export const CLINIC_TYPE_LABELS: Record<string, string> = {
  CLINIC: "診療所",
  HOSPITAL: "病院",
  DENTAL: "歯科",
  PHARMACY: "薬局",
  NURSING_HOME: "介護施設",
};

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  IN_PERSON: "対面",
  ONLINE: "オンライン",
  PHONE: "電話",
};

export const INTERVIEW_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "予定",
  IN_PROGRESS: "実施中",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

export const INTERVIEW_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export const KANBAN_COLUMNS = [
  "NEW",
  "SCREENING",
  "INTERVIEW_1",
  "INTERVIEW_2",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
