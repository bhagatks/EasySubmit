export const PROFILE_SALARY_RANGE_MIN = 40_000;
export const PROFILE_SALARY_RANGE_MAX = 300_000;
export const PROFILE_SALARY_RANGE_STEP = 5_000;
export const PROFILE_SALARY_DEFAULT_MIN = 100_000;
export const PROFILE_SALARY_DEFAULT_MAX = 150_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapProfileSalary(value: number): number {
  const snapped =
    Math.round(value / PROFILE_SALARY_RANGE_STEP) * PROFILE_SALARY_RANGE_STEP;
  return clamp(snapped, PROFILE_SALARY_RANGE_MIN, PROFILE_SALARY_RANGE_MAX);
}

export function normalizeProfileSalaryRange(
  minRaw: string,
  maxRaw: string,
): { min: number; max: number } {
  const parsedMin = Number.parseInt(minRaw, 10);
  const parsedMax = Number.parseInt(maxRaw, 10);

  let min =
    Number.isFinite(parsedMin) && parsedMin > 0
      ? snapProfileSalary(parsedMin)
      : PROFILE_SALARY_DEFAULT_MIN;
  let max =
    Number.isFinite(parsedMax) && parsedMax > 0
      ? snapProfileSalary(parsedMax)
      : PROFILE_SALARY_DEFAULT_MAX;

  if (min > max) {
    max = min;
  }

  return { min, max };
}

export function salaryRangeToPercent(value: number): number {
  const span = PROFILE_SALARY_RANGE_MAX - PROFILE_SALARY_RANGE_MIN;
  if (span <= 0) return 0;
  return ((value - PROFILE_SALARY_RANGE_MIN) / span) * 100;
}

export function salaryRangeFromPercent(percent: number): number {
  const span = PROFILE_SALARY_RANGE_MAX - PROFILE_SALARY_RANGE_MIN;
  return snapProfileSalary(PROFILE_SALARY_RANGE_MIN + (percent / 100) * span);
}

const salaryFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatProfileSalary(value: number): string {
  return salaryFormatter.format(value);
}

export function formatProfileSalaryRangeLabel(min: number, max: number): string {
  return `${formatProfileSalary(min)} – ${formatProfileSalary(max)}`;
}
