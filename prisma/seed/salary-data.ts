export interface SalaryBenchmarkEntry {
  prefecture: string;
  jobTitle: string;
  employmentType: "FULL_TIME" | "PART_TIME";
  median: number;
  percentile25: number;
  percentile75: number;
  min: number;
  max: number;
  sampleSize: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Base median values (FULL_TIME = monthly salary in JPY, PART_TIME = hourly in JPY)
// Sources modeled on publicly available medical industry salary surveys in Japan.
// ──────────────────────────────────────────────────────────────────────────────

const PREFECTURES = [
  "東京都",
  "大阪府",
  "愛知県",
  "福岡県",
  "北海道",
  "神奈川県",
  "埼玉県",
  "千葉県",
] as const;

const JOB_TITLES = [
  "看護師",
  "歯科衛生士",
  "歯科助手",
  "医療事務",
  "理学療法士",
  "薬剤師",
  "作業療法士",
  "介護福祉士",
] as const;

export type Prefecture = (typeof PREFECTURES)[number];
export type JobTitle = (typeof JOB_TITLES)[number];

export { PREFECTURES, JOB_TITLES };

// Base full-time median monthly salaries for Tokyo (reference point)
const BASE_FULL_TIME: Record<string, number> = {
  看護師: 300000,
  歯科衛生士: 280000,
  歯科助手: 200000,
  医療事務: 220000,
  理学療法士: 285000,
  薬剤師: 350000,
  作業療法士: 275000,
  介護福祉士: 250000,
};

// Base part-time hourly rates for Tokyo
const BASE_PART_TIME: Record<string, number> = {
  看護師: 1800,
  歯科衛生士: 1600,
  歯科助手: 1150,
  医療事務: 1200,
  理学療法士: 1750,
  薬剤師: 2200,
  作業療法士: 1700,
  介護福祉士: 1400,
};

// Regional multipliers (Tokyo = 1.00)
const REGIONAL_MULTIPLIER: Record<string, number> = {
  東京都: 1.0,
  神奈川県: 0.97,
  大阪府: 0.95,
  愛知県: 0.93,
  千葉県: 0.94,
  埼玉県: 0.93,
  福岡県: 0.89,
  北海道: 0.88,
};

// Sample size base per region (larger metro = larger samples)
const SAMPLE_SIZE_BASE: Record<string, number> = {
  東京都: 1200,
  神奈川県: 680,
  大阪府: 900,
  愛知県: 620,
  千葉県: 520,
  埼玉県: 500,
  福岡県: 480,
  北海道: 400,
};

function round100(n: number): number {
  return Math.round(n / 100) * 100;
}

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

function generateEntry(
  prefecture: string,
  jobTitle: string,
  employmentType: "FULL_TIME" | "PART_TIME"
): SalaryBenchmarkEntry {
  const mult = REGIONAL_MULTIPLIER[prefecture] ?? 1;
  const baseSample = SAMPLE_SIZE_BASE[prefecture] ?? 500;

  if (employmentType === "FULL_TIME") {
    const base = BASE_FULL_TIME[jobTitle] ?? 250000;
    const median = round100(base * mult);
    const percentile25 = round100(median * 0.88);
    const percentile75 = round100(median * 1.13);
    const min = round100(median * 0.72);
    const max = round100(median * 1.32);
    const sampleSize = Math.round(baseSample * (0.7 + Math.random() * 0.6));
    return {
      prefecture,
      jobTitle,
      employmentType,
      median,
      percentile25,
      percentile75,
      min,
      max,
      sampleSize,
    };
  }

  // PART_TIME (hourly)
  const base = BASE_PART_TIME[jobTitle] ?? 1300;
  const median = round10(base * mult);
  const percentile25 = round10(median * 0.9);
  const percentile75 = round10(median * 1.12);
  const min = round10(median * 0.78);
  const max = round10(median * 1.3);
  const sampleSize = Math.round(baseSample * 0.6 * (0.7 + Math.random() * 0.6));
  return {
    prefecture,
    jobTitle,
    employmentType,
    median,
    percentile25,
    percentile75,
    min,
    max,
    sampleSize,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Generate deterministic data (seed the "random" with a fixed set)
// We pre-generate and export so the data is stable across imports.
// ──────────────────────────────────────────────────────────────────────────────

function buildSalaryData(): SalaryBenchmarkEntry[] {
  // Fix pseudo-random via a simple seeded generator for reproducible sample sizes
  let seed = 42;
  const origRandom = Math.random;
  Math.random = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const data: SalaryBenchmarkEntry[] = [];
  for (const prefecture of PREFECTURES) {
    for (const jobTitle of JOB_TITLES) {
      data.push(generateEntry(prefecture, jobTitle, "FULL_TIME"));
      data.push(generateEntry(prefecture, jobTitle, "PART_TIME"));
    }
  }

  Math.random = origRandom;
  return data;
}

export const salaryBenchmarkData: SalaryBenchmarkEntry[] = buildSalaryData();
