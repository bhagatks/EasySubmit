/** Canonical screen ids — keep in sync with `docs/SCREENS.md`. */
export type ScreenId =
  | "marketing_landing"
  | "pricing"
  | "select_plan"
  | "extension_landing"
  | "extension_bridge"
  | "login"
  | "signup_legacy"
  | "terms"
  | "privacy"
  | "help_center"
  | "onboarding_workbench"
  | "onboarding_phase_identity"
  | "onboarding_phase_import"
  | "onboarding_phase_studio"
  | "onboarding_step4_legacy"
  | "synthesis_transition"
  | "byok_setup_modal"
  | "extension_install_modal"
  | "ignition_gate"
  | "dashboard_overview"
  | "resume_profiles_list"
  | "resume_profile_new"
  | "resume_studio"
  | "job_tracker"
  | "review_screen"
  | "job_review_studio"
  | "ats_scores"
  | "ats_guidelines"
  | "dashboard_extension"
  | "video_tutorials"
  | "settings"
  | "about"
  | "testing_resume"
  | "extension_popup"
  | "extension_job_card"
  | "application_profile_screen_1"
  | "application_profile_screen_2"
  | "unknown";

export type ScreenAuthZone = "public" | "auth" | "dashboard" | "extension" | "overlay";

export type ScreenCatalogEntry = {
  id: ScreenId;
  name: string;
  zone: ScreenAuthZone;
};

/** Human-readable labels for operator logs. */
export const SCREEN_CATALOG: Record<ScreenId, ScreenCatalogEntry> = {
  marketing_landing: { id: "marketing_landing", name: "Marketing landing", zone: "public" },
  pricing: { id: "pricing", name: "Pricing", zone: "public" },
  select_plan: { id: "select_plan", name: "Select plan", zone: "public" },
  extension_landing: { id: "extension_landing", name: "Extension landing", zone: "public" },
  extension_bridge: { id: "extension_bridge", name: "Extension auth bridge", zone: "public" },
  login: { id: "login", name: "Login", zone: "public" },
  signup_legacy: { id: "signup_legacy", name: "Sign up (legacy)", zone: "public" },
  terms: { id: "terms", name: "Terms of Service", zone: "public" },
  privacy: { id: "privacy", name: "Privacy Policy", zone: "public" },
  help_center: { id: "help_center", name: "Help Center", zone: "public" },
  onboarding_workbench: { id: "onboarding_workbench", name: "Unified Workbench", zone: "auth" },
  onboarding_phase_identity: { id: "onboarding_phase_identity", name: "Onboarding · Identity", zone: "auth" },
  onboarding_phase_import: { id: "onboarding_phase_import", name: "Onboarding · Import", zone: "auth" },
  onboarding_phase_studio: { id: "onboarding_phase_studio", name: "Onboarding · Studio", zone: "auth" },
  onboarding_step4_legacy: { id: "onboarding_step4_legacy", name: "Resume mapping (legacy)", zone: "auth" },
  synthesis_transition: { id: "synthesis_transition", name: "Synthesis Transition", zone: "overlay" },
  byok_setup_modal: { id: "byok_setup_modal", name: "BYOK setup modal", zone: "overlay" },
  extension_install_modal: { id: "extension_install_modal", name: "Extension install modal", zone: "overlay" },
  ignition_gate: { id: "ignition_gate", name: "Ignition Gate", zone: "overlay" },
  dashboard_overview: { id: "dashboard_overview", name: "Overview", zone: "dashboard" },
  resume_profiles_list: { id: "resume_profiles_list", name: "Resume profiles", zone: "dashboard" },
  resume_profile_new: { id: "resume_profile_new", name: "New resume profile", zone: "dashboard" },
  resume_studio: { id: "resume_studio", name: "Resume Studio", zone: "dashboard" },
  job_tracker: { id: "job_tracker", name: "Job Tracker", zone: "dashboard" },
  review_screen: { id: "review_screen", name: "Review Screen", zone: "overlay" },
  job_review_studio: { id: "job_review_studio", name: "Job Review Studio", zone: "dashboard" },
  ats_scores: { id: "ats_scores", name: "ATS Scores", zone: "dashboard" },
  ats_guidelines: { id: "ats_guidelines", name: "ATS Guidelines", zone: "dashboard" },
  dashboard_extension: { id: "dashboard_extension", name: "Extension (dashboard)", zone: "dashboard" },
  video_tutorials: { id: "video_tutorials", name: "Video Tutorials", zone: "dashboard" },
  settings: { id: "settings", name: "Settings", zone: "dashboard" },
  about: { id: "about", name: "About", zone: "dashboard" },
  testing_resume: { id: "testing_resume", name: "Testing resume (dev)", zone: "dashboard" },
  extension_popup: { id: "extension_popup", name: "Extension popup", zone: "extension" },
  extension_job_card: { id: "extension_job_card", name: "Extension job card", zone: "extension" },
  application_profile_screen_1: {
    id: "application_profile_screen_1",
    name: "Application profile · Screen 1",
    zone: "extension",
  },
  application_profile_screen_2: {
    id: "application_profile_screen_2",
    name: "Application profile · Screen 2",
    zone: "extension",
  },
  unknown: { id: "unknown", name: "Unknown route", zone: "public" },
};
