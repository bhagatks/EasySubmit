/** Whole minutes between config/catalog refresh cycles (e.g. 1440 = 24 hours). */
export type RefreshIntervalMinutes = number;

/** Parsed `app_config.dataRefresh` payload — `interval` is always minutes. */
export interface DataRefreshConfig {
  interval: RefreshIntervalMinutes;
  aiModelsUpdate?: RefreshIntervalMinutes;
  description?: string;
}

/** Hardcoded safety default when `dataRefresh` is absent or invalid in the database. */
export const DATA_REFRESH_SAFETY_DEFAULT: DataRefreshConfig = {
  interval: 1440,
};
