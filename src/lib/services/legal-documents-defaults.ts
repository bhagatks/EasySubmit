import type { LegalDocumentsConfig } from "@/src/lib/services/legal-documents-config";

/** Bundled fallback when `app_config.legalDocuments` is missing or invalid. */
export const LEGAL_DOCUMENTS_DEFAULTS: LegalDocumentsConfig = {
  terms: {
    title: "Terms of Service",
    updatedLabel: "Last updated June 20, 2026",
    blocks: [
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              'These Terms of Service ("Terms") govern your use of EasySubmit.ai ("EasySubmit," "we," "us"). By creating an account or using our website, dashboard, or Chrome extension, you agree to these Terms and our ',
          },
          { kind: "docLink", doc: "privacy", label: "Privacy Policy" },
          { kind: "text", value: "." },
        ],
      },
      { kind: "h2", text: "1. The service" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "EasySubmit helps job seekers build ATS-friendly resumes, manage resume profiles, and (where available) automate parts of the job application process using AI-assisted tools. Features may change over time; we will not materially reduce core free functionality without notice where practicable.",
          },
        ],
      },
      { kind: "h2", text: "2. Accounts" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "You must be at least 18 years old. You are responsible for activity under your account and for keeping your sign-in credentials secure. You may connect Google or LinkedIn OAuth providers that share the same email address.",
          },
        ],
      },
      { kind: "h2", text: "3. AI-powered features" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              'EasySubmit includes AI-assisted resume enhancement, tailoring, and related suggestions ("AI Features"). When you use AI Features:',
          },
        ],
      },
      {
        kind: "ul",
        items: [
          "Your resume content (excluding contact details we intentionally exclude from AI requests) may be processed by EasySubmit AI or your own API key (BYOK).",
          "AI output is provided for informational and assistive purposes only — not as legal, career counseling, or employment advice.",
          {
            inlines: [
              { kind: "strong", value: "You are solely responsible" },
              {
                kind: "text",
                value: " for reviewing, verifying, and approving all content before submitting it to employers.",
              },
            ],
          },
          "Do not misrepresent qualifications, invent employers or credentials, or submit inaccurate information.",
        ],
      },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "Similar to platforms such as Teal and Rezi, we may use third-party AI providers (e.g. Google Gemini) when you use EasySubmit AI, or your chosen provider when you use BYOK.",
          },
        ],
      },
      { kind: "h2", text: "4. Bring Your Own Key (BYOK)" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "If you provide your own AI provider API key, usage is billed by your provider under their terms. You are responsible for key security, rotation, and compliance with provider policies.",
          },
        ],
      },
      { kind: "h2", text: "5. Acceptable use" },
      {
        kind: "p",
        inlines: [{ kind: "text", value: "You agree not to:" }],
      },
      {
        kind: "ul",
        items: [
          "Use the service for unlawful, fraudulent, or deceptive purposes.",
          "Attempt to bypass usage limits, scrape, or reverse engineer the platform.",
          "Upload malware or content you do not have the right to use.",
          "Resell or redistribute the service without written permission.",
        ],
      },
      { kind: "h2", text: "6. Intellectual property" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "You retain ownership of resume content you create. You grant EasySubmit a limited license to host, process, and display your content solely to operate the service. EasySubmit branding, software, and documentation remain our property.",
          },
        ],
      },
      { kind: "h2", text: "7. Disclaimers" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE INTERVIEWS, OFFERS, OR ATS PARSING OUTCOMES — THOSE DEPEND ON EMPLOYERS, MARKETS, AND YOUR ACCURATE INFORMATION.',
          },
        ],
      },
      { kind: "h2", text: "8. Limitation of liability" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "TO THE MAXIMUM EXTENT PERMITTED BY LAW, EASYSUBMIT WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.",
          },
        ],
      },
      { kind: "h2", text: "9. Termination" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "You may stop using EasySubmit at any time. We may suspend or terminate access for violations of these Terms or to protect the service and other users.",
          },
        ],
      },
      { kind: "h2", text: "10. Changes" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "We may update these Terms. Material changes will be posted on this page with an updated date. Continued use after changes constitutes acceptance.",
          },
        ],
      },
      { kind: "h2", text: "11. Contact" },
      {
        kind: "p",
        inlines: [
          { kind: "text", value: "Questions: " },
          { kind: "mailto", email: "support@easysubmit.ai", label: "support@easysubmit.ai" },
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updatedLabel: "Last updated June 20, 2026",
    blocks: [
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              'EasySubmit.ai ("EasySubmit," "we," "us") respects your privacy. This policy explains what we collect, how we use it, and your choices. By using EasySubmit you agree to this policy and our ',
          },
          { kind: "docLink", doc: "terms", label: "Terms of Service" },
          { kind: "text", value: "." },
        ],
      },
      { kind: "h2", text: "1. Information we collect" },
      { kind: "h3", text: "Account & sign-in" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "When you sign in with Google or LinkedIn we receive name, email, and profile image from your OAuth provider, plus which provider you used.",
          },
        ],
      },
      { kind: "h3", text: "Resume & career content" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "Resume profiles, work history, skills, education, job descriptions you paste for tailoring, and related career data you enter in the dashboard or extension.",
          },
        ],
      },
      { kind: "h3", text: "AI usage" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "We log AI request metadata (model, token estimates, timestamps) for quotas, billing analytics, and abuse prevention — not for selling your data.",
          },
        ],
      },
      { kind: "h3", text: "Technical data" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "Device/browser type, IP address, and usage events needed to secure and improve the service (similar to industry-standard analytics practices used by job platforms like Simplify and Teal).",
          },
        ],
      },
      { kind: "h2", text: "2. How we use information" },
      {
        kind: "ul",
        items: [
          "Provide resume editing, AI enhancement, and application automation features.",
          "Authenticate you and maintain your account.",
          "Enforce daily AI quotas on EasySubmit-provided AI.",
          "Improve product reliability and support.",
          "Comply with legal obligations.",
        ],
      },
      {
        kind: "p",
        inlines: [
          { kind: "strong", value: "We do not sell your personal information" },
          {
            kind: "text",
            value:
              " to third parties for advertising or data brokerage, consistent with commitments made by leading resume tools in this category.",
          },
        ],
      },
      { kind: "h2", text: "3. AI processing & third-party providers" },
      {
        kind: "p",
        inlines: [
          { kind: "text", value: "When you use " },
          { kind: "strong", value: "EasySubmit AI" },
          {
            kind: "text",
            value:
              ", resume body content (summary, skills, experience bullets, etc.) is sent to ",
          },
          { kind: "strong", value: "Google Gemini" },
          {
            kind: "text",
            value:
              " via our server infrastructure. We intentionally ",
          },
          { kind: "strong", value: "do not send contact fields" },
          {
            kind: "text",
            value:
              " (name, email, phone, LinkedIn URL, address) to AI providers for enhancement requests.",
          },
        ],
      },
      {
        kind: "p",
        inlines: [
          { kind: "text", value: "When you use " },
          { kind: "strong", value: "Bring Your Own Key (BYOK)" },
          {
            kind: "text",
            value:
              ", requests go to your chosen provider (OpenAI, Anthropic, Gemini, etc.) under that provider's terms. Paid API tiers typically do not use your content to train public models — check your provider's documentation.",
          },
        ],
      },
      {
        kind: "p",
        inlines: [
          { kind: "text", value: "Google's Gemini API terms apply to EasySubmit AI usage: " },
          {
            kind: "href",
            href: "https://ai.google.dev/gemini-api/terms",
            label: "ai.google.dev/gemini-api/terms",
            external: true,
          },
          { kind: "text", value: ". Free-tier API usage may be subject to additional Google data-use policies." },
        ],
      },
      { kind: "h2", text: "4. Data retention" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "Resume profiles remain until you delete them or close your account. AI usage logs are retained for operational and billing records. OAuth tokens are stored per NextAuth/Supabase conventions.",
          },
        ],
      },
      { kind: "h2", text: "5. Security" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "BYOK secrets are stored in Supabase Vault — not in plain text in our application database. We use industry-standard transport encryption (HTTPS) and access controls on production systems.",
          },
        ],
      },
      { kind: "h2", text: "6. Your rights" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "You may access, export, or delete resume data through the dashboard. You may disconnect OAuth providers or sign out at any time. California and EU residents may have additional rights — contact us to exercise them.",
          },
        ],
      },
      { kind: "h2", text: "7. Children" },
      {
        kind: "p",
        inlines: [{ kind: "text", value: "EasySubmit is not intended for users under 18." }],
      },
      { kind: "h2", text: "8. Changes" },
      {
        kind: "p",
        inlines: [
          {
            kind: "text",
            value:
              "We will post updates on this page with a revised date. Material changes to AI processing will be reflected here and in product settings.",
          },
        ],
      },
      { kind: "h2", text: "9. Contact" },
      {
        kind: "p",
        inlines: [
          { kind: "text", value: "Privacy questions: " },
          { kind: "mailto", email: "privacy@easysubmit.ai", label: "privacy@easysubmit.ai" },
        ],
      },
    ],
  },
};
