const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("en-US");

export function formatDashboardInteger(value: number): string {
  return integerFormatter.format(Math.max(0, Math.floor(value)));
}

export function formatDashboardUsd(value: number): string {
  return usdFormatter.format(Math.max(0, value));
}

export function formatDashboardPercent(value: number | null): string {
  if (value === null || value <= 0) return "—";
  return `${Math.round(value)}`;
}

export function formatDashboardDeltaSpend(spendUsd: number): string {
  return `${formatDashboardUsd(spendUsd)} spent`;
}
