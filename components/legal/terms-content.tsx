type TermsContentProps = {
  /** When set, Privacy Policy opens in-app overlay instead of navigating away. */
  onOpenPrivacy?: () => void;
};

export function TermsContent({ onOpenPrivacy }: TermsContentProps) {
  return (
    <>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of EasySubmit.ai
        (&quot;EasySubmit,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account or using our
        website, dashboard, or Chrome extension, you agree to these Terms and our{" "}
        {onOpenPrivacy ? (
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </button>
        ) : (
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
        )}
        .
      </p>

      <h2>1. The service</h2>
      <p>
        EasySubmit helps job seekers build ATS-friendly resumes, manage resume profiles,
        and (where available) automate parts of the job application process using AI-assisted
        tools. Features may change over time; we will not materially reduce core free
        functionality without notice where practicable.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must be at least 18 years old. You are responsible for activity under your
        account and for keeping your sign-in credentials secure. You may connect Google or
        LinkedIn OAuth providers that share the same email address.
      </p>

      <h2>3. AI-powered features</h2>
      <p>
        EasySubmit includes AI-assisted resume enhancement, tailoring, and related
        suggestions (&quot;AI Features&quot;). When you use AI Features:
      </p>
      <ul>
        <li>
          Your resume content (excluding contact details we intentionally exclude from AI
          requests) may be processed by EasySubmit AI or your own API key (BYOK).
        </li>
        <li>
          AI output is provided for informational and assistive purposes only — not as
          legal, career counseling, or employment advice.
        </li>
        <li>
          <strong>You are solely responsible</strong> for reviewing, verifying, and approving
          all content before submitting it to employers.
        </li>
        <li>
          Do not misrepresent qualifications, invent employers or credentials, or submit
          inaccurate information.
        </li>
      </ul>
      <p>
        Similar to platforms such as Teal and Rezi, we may use third-party AI providers
        (e.g. Google Gemini) when you use EasySubmit AI, or your chosen provider when you
        use BYOK.
      </p>

      <h2>4. Bring Your Own Key (BYOK)</h2>
      <p>
        If you provide your own AI provider API key, usage is billed by your provider under
        their terms. You are responsible for key security, rotation, and compliance with
        provider policies.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for unlawful, fraudulent, or deceptive purposes.</li>
        <li>Attempt to bypass usage limits, scrape, or reverse engineer the platform.</li>
        <li>Upload malware or content you do not have the right to use.</li>
        <li>Resell or redistribute the service without written permission.</li>
      </ul>

      <h2>6. Intellectual property</h2>
      <p>
        You retain ownership of resume content you create. You grant EasySubmit a limited
        license to host, process, and display your content solely to operate the service.
        EasySubmit branding, software, and documentation remain our property.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
        GUARANTEE INTERVIEWS, OFFERS, OR ATS PARSING OUTCOMES — THOSE DEPEND ON EMPLOYERS,
        MARKETS, AND YOUR ACCURATE INFORMATION.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, EASYSUBMIT WILL NOT BE LIABLE FOR INDIRECT,
        INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using EasySubmit at any time. We may suspend or terminate access for
        violations of these Terms or to protect the service and other users.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms. Material changes will be posted on this page with an
        updated date. Continued use after changes constitutes acceptance.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:support@easysubmit.ai">support@easysubmit.ai</a>
      </p>
    </>
  );
}
