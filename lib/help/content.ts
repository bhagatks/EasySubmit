import {
  BookOpen,
  CircleDollarSign,
  LifeBuoy,
  Puzzle,
  Rocket,
  Settings,
  Target,
} from "lucide-react";
import type { HelpArticle, HelpCategory } from "@/lib/help/types";
import type { LegalBlock, LegalInline } from "@/src/lib/services/legal-documents-config";

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "Create your account, complete onboarding, and set up your first resume profile.",
    icon: Rocket,
  },
  {
    id: "chrome-extension",
    title: "Chrome Extension",
    description:
      "Install the extension, capture jobs from career sites, and apply with tailored materials.",
    icon: Puzzle,
  },
  {
    id: "resume-tailoring",
    title: "Resume & Tailoring",
    description:
      "Build ATS-friendly resumes, run Enhance with AI, and export PDF or Word.",
    icon: Target,
  },
  {
    id: "job-tracker",
    title: "Job Tracker",
    description:
      "Save applications, review tailored resume and cover letter, and track progress.",
    icon: BookOpen,
  },
  {
    id: "account-settings",
    title: "Account & Settings",
    description:
      "Manage your profile, API keys, extension preferences, and connected accounts.",
    icon: Settings,
  },
  {
    id: "billing",
    title: "Billing & Plans",
    description: "Understand the free plan, BYOK, daily limits, and upcoming paid tiers.",
    icon: CircleDollarSign,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    description: "Fix common issues with login, the extension, AI enhancements, and exports.",
    icon: LifeBuoy,
  },
];

const mail = (label: string, email = "support@easysubmit.ai") =>
  ({ kind: "mailto", email, label }) as const;

const link = (label: string, href: string, external = false) =>
  ({ kind: "href", label, href, external }) as const;

const p = (...inlines: LegalInline[]): LegalBlock => ({
  kind: "p",
  inlines,
});

function inlineText(value: string): LegalInline {
  return { kind: "text", value };
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "create-your-account",
    categoryId: "getting-started",
    title: "Create your EasySubmit account",
    summary: "Sign in with Google or LinkedIn and choose your plan to get started.",
    blocks: [
      p(
        inlineText("Visit "),
        link("easysubmit.ai/login", "/login"),
        inlineText(" and sign in with Google or LinkedIn. We use OAuth — no separate password."),
      ),
      { kind: "h2", text: "After sign-in" },
      {
        kind: "ul",
        items: [
          "Choose a plan on the plan picker (Free with your own AI key is available now).",
          "Complete the Unified Workbench: Identity → Import → Studio.",
          "Land on your dashboard with your default resume profile ready to tailor.",
        ],
      },
    ],
  },
  {
    slug: "onboarding-workbench",
    categoryId: "getting-started",
    title: "Complete the onboarding workbench",
    summary: "Walk through Identity, Import, and Studio to build your first resume profile.",
    blocks: [
      p(
        inlineText(
          "After login, the Unified Workbench at /onboarding guides you through three phases.",
        ),
      ),
      { kind: "h2", text: "Phase 1 · Identity" },
      p(inlineText("Enter your name and target role. This seeds your resume header and summary direction.")),
      { kind: "h2", text: "Phase 2 · Import" },
      p(
        inlineText(
          "Upload a PDF or DOCX resume, or skip and build manually. We parse your file into editable sections.",
        ),
      ),
      { kind: "h2", text: "Phase 3 · Studio" },
      p(
        inlineText(
          "Review and fix sections in Resume Studio. Resolve validation errors, then click Finalize & continue.",
        ),
      ),
    ],
  },
  {
    slug: "install-chrome-extension",
    categoryId: "getting-started",
    title: "Install the Chrome extension",
    summary: "Add EasySubmit to Chrome and connect it to your dashboard account.",
    blocks: [
      p(link("Open the extension page", "/extension"), inlineText(" and follow Add to Chrome.")),
      {
        kind: "ul",
        items: [
          "Pin the extension for quick access.",
          "Open the dashboard and complete the extension connect bridge if prompted.",
          "Visit a supported job site — you should see the EasySubmit job card.",
        ],
      },
      p(
        inlineText("Supported sites include LinkedIn, Indeed, Workday, Greenhouse, Lever, and more."),
      ),
    ],
  },
  {
    slug: "first-tailored-resume",
    categoryId: "getting-started",
    title: "Tailor your first resume to a job",
    summary: "Save a job with the extension or dashboard, then run Enhance with AI.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Save a job from a career site using the extension card, or choose Add job on the Job Tracker page and paste the description.",
          "Open the job in Review Screen from the dashboard or extension.",
          "Run Enhance with AI on the Resume tab to tailor content to the job description.",
          "Export PDF or Word when you are ready to apply.",
        ],
      },
      p(
        inlineText("ATS scoring and keyword gap analysis are free — they do not count against your AI enhance quota."),
      ),
    ],
  },
  {
    slug: "connect-byok-key",
    categoryId: "getting-started",
    title: "Connect your AI key (BYOK)",
    summary: "Use your own OpenAI, Anthropic, Gemini, or Groq key on the free plan.",
    blocks: [
      p(
        inlineText(
          "BYOK (Bring Your Own Key) lets the free plan call your provider directly. You pay the provider per use.",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Open Settings → AI enhancements and add a vaulted provider key.",
          "Complete the Ignition Gate handshake to validate the key and pick a model.",
          "Turn on AI enhancements when you are ready to tailor resumes.",
        ],
      },
      p(link("Read more about BYOK", "/help/billing/what-is-byok")),
    ],
  },
  {
    slug: "extension-overview",
    categoryId: "chrome-extension",
    title: "How the extension works",
    summary: "The in-page job card captures jobs and runs the tailor pipeline on supported sites.",
    blocks: [
      p(
        inlineText(
          "On supported job pages, EasySubmit injects a card into the page (Shadow DOM — it won't break site styles).",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Unsaved job → Apply with EasySubmit.ai saves the job and starts tailoring.",
          "Resume ready → review resume, cover letter, and ATS insights inline.",
          "Ready to apply → use autofill assist where the site supports it.",
          "Applied → mark complete when you submit the application.",
        ],
      },
    ],
  },
  {
    slug: "save-jobs-from-career-sites",
    categoryId: "chrome-extension",
    title: "Save jobs from career sites",
    summary: "Capture job title, company, description, and URL from supported ATS pages.",
    blocks: [
      p(
        inlineText(
          "When you click Apply with EasySubmit.ai, we extract the job posting and sync it to your Job Tracker.",
        ),
      ),
      { kind: "h2", text: "Manual capture" },
      p(
        inlineText(
          "If auto-detect fails, use manual capture from the extension popup to paste job details.",
        ),
      ),
    ],
  },
  {
    slug: "extension-autofill",
    categoryId: "chrome-extension",
    title: "Autofill application forms",
    summary: "Fill common application fields from your application profile and resume.",
    blocks: [
      p(
        inlineText(
          "After your application profile is set up, the extension can suggest values for form fields on apply pages.",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Complete application profile setup on first Apply (screens 1–2).",
          "Review suggestions before submitting — you are responsible for accuracy.",
          "Some ATS forms block automation; fill those fields manually.",
        ],
      },
    ],
  },
  {
    slug: "extension-not-showing",
    categoryId: "chrome-extension",
    title: "Extension card not appearing",
    summary: "Check install, permissions, supported sites, and force-upgrade requirements.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Confirm the extension is installed and enabled in chrome://extensions.",
          "Refresh the job page after install.",
          "Check that the site is supported — generic company career pages may need manual capture.",
          "If you see an update banner, install the latest version from the Chrome Web Store.",
        ],
      },
      p(mail("Contact support"), inlineText(" with the job URL if the issue persists.")),
    ],
  },
  {
    slug: "extension-dashboard-sync",
    categoryId: "chrome-extension",
    title: "Keep extension and dashboard in sync",
    summary: "Jobs and tailored documents sync between the extension card and web dashboard.",
    blocks: [
      p(
        inlineText(
          "Sign in to the same account in the browser and extension. Changes in Review Screen appear in both places.",
        ),
      ),
      p(
        inlineText("Use "),
        link("Open in dashboard", "/dashboard/job-tracker"),
        inlineText(" from the extension when you need the full Review Screen or export tools."),
      ),
    ],
  },
  {
    slug: "resume-studio-basics",
    categoryId: "resume-tailoring",
    title: "Edit resumes in Resume Studio",
    summary: "Use the Studio editor for section-based editing, layout, and ATS validation.",
    blocks: [
      p(
        inlineText(
          "Resume Studio is available during onboarding and from Resume profiles in the dashboard.",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Editor tab — collapsible sections: Header, Summary, Skills, Experience, Education, and more.",
          "Layout tab (dashboard) — font, page size, and resume length (Auto, 1, or 2 pages).",
          "Red borders indicate mandatory validation errors before finalize or export.",
        ],
      },
      p(link("ATS resume rules", "/dashboard/ats-guidelines")),
    ],
  },
  {
    slug: "enhance-with-ai",
    categoryId: "resume-tailoring",
    title: "Enhance with AI",
    summary: "Tailor resume and cover letter content to a specific job description.",
    blocks: [
      p(
        inlineText(
          "Enhance with AI rewrites summary, skills, and experience bullets to align with the job — without inventing employers or credentials.",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Requires AI enhancements on and a valid BYOK or system key.",
          "Each enhance counts toward your daily quota on the free plan.",
          "Review all output before submitting to employers.",
        ],
      },
      p(link("What counts as an enhance?", "/help/billing/ai-enhance-quota")),
    ],
  },
  {
    slug: "ats-score-and-keywords",
    categoryId: "resume-tailoring",
    title: "ATS score and keyword gap",
    summary: "See readiness score, missing keywords, and bullet quality without using AI credits.",
    blocks: [
      p(
        inlineText(
          "Open the ATS Analysis tab in Review Screen for parse simulation, keyword gap, and bullet quality checks.",
        ),
      ),
      p(
        inlineText(
          "These analyses do not consume enhance quota — use them freely while refining a tailored resume.",
        ),
      ),
    ],
  },
  {
    slug: "export-pdf-word",
    categoryId: "resume-tailoring",
    title: "Export PDF and Word",
    summary: "Download ATS-safe resumes from Review Screen or Resume Studio.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Review Screen → Resume tab → download PDF or Word.",
          "Exports follow single-column ATS rules: standard fonts, real bullet lists, fixed section order.",
          "LaTeX export is available for advanced users in Review Screen.",
        ],
      },
    ],
  },
  {
    slug: "multiple-resume-profiles",
    categoryId: "resume-tailoring",
    title: "Multiple resume profiles",
    summary: "Create profiles for different target roles while keeping a default base profile.",
    blocks: [
      p(link("Resume profiles", "/dashboard/resume-profiles"), inlineText(" supports multiple profiles per account.")),
      {
        kind: "ul",
        items: [
          "Set one profile as default for extension and quick actions.",
          "Copy the default or upload a new file to start a variant.",
          "Job-specific tailored versions stay linked to each job without overwriting your base profile.",
        ],
      },
    ],
  },
  {
    slug: "job-tracker-overview",
    categoryId: "job-tracker",
    title: "Job Tracker overview",
    summary: "All saved jobs, statuses, and tailored documents in one place.",
    blocks: [
      p(link("Job Tracker", "/dashboard/job-tracker"), inlineText(" lists applications from saved through applied.")),
      {
        kind: "ul",
        items: [
          "Click a row to open Review Screen.",
          "Tabs: Job details, Resume, Cover letter, ATS Analysis.",
          "Status updates from the extension sync automatically.",
        ],
      },
    ],
  },
  {
    slug: "review-screen",
    categoryId: "job-tracker",
    title: "Using Review Screen",
    summary: "Preview, edit, enhance, and export job-specific resume and cover letter.",
    blocks: [
      p(
        inlineText(
          "Review Screen is the full-screen modal for a single job. It opens from Job Tracker or the extension.",
        ),
      ),
      {
        kind: "ul",
        items: [
          "Resume and Cover tabs share zoom and export toolbar.",
          "Enhance with AI available on resume and cover when engine is active.",
          "ATS Analysis tab shows readiness and gaps for the current tailored resume.",
        ],
      },
    ],
  },
  {
    slug: "cover-letters",
    categoryId: "job-tracker",
    title: "Cover letters per job",
    summary: "Generate, edit, and enhance cover letters tied to each application.",
    blocks: [
      p(
        inlineText(
          "Each job can have a tailored cover letter. The pipeline seeds a deterministic draft; Enhance with AI can refine it.",
        ),
      ),
      p(inlineText("Edit inline in Review Screen and save before export or autofill.")),
    ],
  },
  {
    slug: "mark-applied",
    categoryId: "job-tracker",
    title: "Mark jobs as applied",
    summary: "Track completion from the extension or dashboard.",
    blocks: [
      p(
        inlineText(
          "After you submit an application, mark the job Applied from the extension card or Job Tracker.",
        ),
      ),
      p(
        inlineText(
          "The extension can auto-detect some confirmation pages; always verify status matches reality.",
        ),
      ),
    ],
  },
  {
    slug: "settings-overview",
    categoryId: "account-settings",
    title: "Settings overview",
    summary: "Account, AI keys, extension preferences, and privacy in one place.",
    blocks: [
      p(link("Settings", "/dashboard/settings"), inlineText(" groups:")),
      {
        kind: "ul",
        items: [
          "Account — name, email, connected OAuth providers.",
          "AI enhancements — toggle, vaulted BYOK keys, provider selection.",
          "Extension — install status and preferences.",
          "Privacy — terms, AI data handling.",
        ],
      },
    ],
  },
  {
    slug: "manage-api-keys",
    categoryId: "account-settings",
    title: "Manage API keys",
    summary: "Add, rotate, and revoke BYOK keys stored in Supabase Vault.",
    blocks: [
      p(
        inlineText(
          "Keys are encrypted at rest. Add a key in Settings, complete validation, then enable AI enhancements.",
        ),
      ),
      p(
        inlineText(
          "Revoke a key anytime — the dashboard will prompt you to reconnect if enhancements are on.",
        ),
      ),
    ],
  },
  {
    slug: "sign-in-providers",
    categoryId: "account-settings",
    title: "Google and LinkedIn sign-in",
    summary: "Link providers that share the same email address.",
    blocks: [
      p(
        inlineText(
          "You can sign in with Google or LinkedIn. Providers with the same email link to one EasySubmit account.",
        ),
      ),
      p(
        inlineText("Sign out from Settings or the profile menu. Use "),
        link("login", "/login"),
        inlineText(" to return."),
      ),
    ],
  },
  {
    slug: "delete-account-data",
    categoryId: "account-settings",
    title: "Account and data requests",
    summary: "Contact support for account deletion or data export questions.",
    blocks: [
      p(
        inlineText("For deletion, export, or privacy requests, email "),
        mail("support@easysubmit.ai"),
        inlineText(" from your account email."),
      ),
      p(link("Privacy Policy", "/privacy")),
    ],
  },
  {
    slug: "free-plan-and-limits",
    categoryId: "billing",
    title: "Free plan and daily limits",
    summary: "Free forever with your own AI key; daily enhance cap resets at midnight UTC.",
    blocks: [
      p(link("Pricing", "/pricing"), inlineText(" describes current plans.")),
      {
        kind: "ul",
        items: [
          "Free plan requires BYOK for AI enhancements.",
          "Daily enhance limits reset at midnight UTC.",
          "ATS scoring, keyword gap, and bullet quality do not count toward the enhance limit.",
        ],
      },
    ],
  },
  {
    slug: "what-is-byok",
    categoryId: "billing",
    title: "What is BYOK?",
    summary: "Bring Your Own Key — connect OpenAI, Anthropic, Gemini, or Groq and pay the provider directly.",
    blocks: [
      p(
        inlineText(
          "BYOK means you add your own API key. EasySubmit calls your provider; you are billed by them (typically cents per resume).",
        ),
      ),
      p(
        inlineText(
          "Paid plans with EasySubmit AI (no key required) are coming soon — see pricing for updates.",
        ),
      ),
    ],
  },
  {
    slug: "ai-enhance-quota",
    categoryId: "billing",
    title: "What counts as an AI enhance?",
    summary: "Each Enhance with AI run on resume or cover counts once; analysis tools are free.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Counts: Enhance with AI on resume or cover letter for a job.",
          "Does not count: ATS readiness score, keyword gap, bullet quality, parse preview.",
          "BYOK users with unlimited daily flag bypass the free-plan cap when configured.",
        ],
      },
    ],
  },
  {
    slug: "login-issues",
    categoryId: "troubleshooting",
    title: "Login and redirect issues",
    summary: "Fix OAuth loops, plan picker redirects, and onboarding gates.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Clear cookies for easysubmit.ai and retry OAuth.",
          "New users must complete the plan picker before accessing the dashboard.",
          "Incomplete onboarding redirects to /onboarding until Studio is finalized.",
        ],
      },
    ],
  },
  {
    slug: "ai-enhance-failed",
    categoryId: "troubleshooting",
    title: "AI enhance failed or blocked",
    summary: "Check BYOK key, quota, provider outage, and AI enhancements toggle.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Confirm AI enhancements are on in Settings.",
          "Validate your BYOK key via Ignition Gate — revoke and re-add if expired.",
          "Daily quota exhausted — wait for UTC midnight reset or switch provider.",
          "Check the header BYOK badge for engine health warnings.",
        ],
      },
    ],
  },
  {
    slug: "resume-parse-issues",
    categoryId: "troubleshooting",
    title: "Resume upload or parse issues",
    summary: "PDF and DOCX tips when import fails or sections look wrong.",
    blocks: [
      {
        kind: "ul",
        items: [
          "Use PDF or DOCX — not scanned images without OCR text.",
          "Multi-column or text-box layouts may parse incorrectly; fix sections manually in Studio.",
          "Try exporting from Word as a simpler single-column PDF.",
        ],
      },
    ],
  },
  {
    slug: "contact-support",
    categoryId: "troubleshooting",
    title: "Contact support",
    summary: "Reach the EasySubmit team for bugs, billing, and feature requests.",
    blocks: [
      p(
        inlineText("Email "),
        mail("support@easysubmit.ai"),
        inlineText(" with your account email, browser version, and steps to reproduce."),
      ),
      p(
        inlineText("Include the job URL for extension issues and screenshots when possible."),
      ),
    ],
  },
];

export const HELP_ARTICLE_LIST: HelpArticle[] = HELP_ARTICLES;

export const HELP_CATEGORIES_BY_ID = Object.fromEntries(
  HELP_CATEGORIES.map((category) => [category.id, category]),
) as Record<HelpArticle["categoryId"], HelpCategory>;

export function getHelpCategory(categoryId: string): HelpCategory | undefined {
  return HELP_CATEGORIES_BY_ID[categoryId as HelpArticle["categoryId"]];
}

export function getArticlesForCategory(categoryId: string): HelpArticle[] {
  return HELP_ARTICLE_LIST.filter((article) => article.categoryId === categoryId);
}

export function getHelpArticle(categoryId: string, slug: string): HelpArticle | undefined {
  return HELP_ARTICLE_LIST.find(
    (article) => article.categoryId === categoryId && article.slug === slug,
  );
}

export function getAllHelpArticles(): HelpArticle[] {
  return HELP_ARTICLE_LIST;
}

export function getArticleHref(article: HelpArticle, basePath = "/help"): string {
  return `${basePath}/${article.categoryId}/${article.slug}`;
}
