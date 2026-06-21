type PrivacyContentProps = {
  onOpenTerms?: () => void;
};

export function PrivacyContent({ onOpenTerms }: PrivacyContentProps) {
  return (
    <>
      <p>
        EasySubmit.ai (&quot;EasySubmit,&quot; &quot;we,&quot; &quot;us&quot;) respects your privacy. This
        policy explains what we collect, how we use it, and your choices. By using
        EasySubmit you agree to this policy and our{" "}
        {onOpenTerms ? (
          <button
            type="button"
            onClick={onOpenTerms}
            className="font-medium text-primary hover:underline"
          >
            Terms of Service
          </button>
        ) : (
          <a href="/terms" className="text-primary hover:underline">
            Terms of Service
          </a>
        )}
        .
      </p>

      <h2>1. Information we collect</h2>
      <h3>Account &amp; sign-in</h3>
      <p>
        When you sign in with Google or LinkedIn we receive name, email, and profile image
        from your OAuth provider, plus which provider you used.
      </p>
      <h3>Resume &amp; career content</h3>
      <p>
        Resume profiles, work history, skills, education, job descriptions you paste for
        tailoring, and related career data you enter in the dashboard or extension.
      </p>
      <h3>AI usage</h3>
      <p>
        We log AI request metadata (model, token estimates, timestamps) for quotas,
        billing analytics, and abuse prevention — not for selling your data.
      </p>
      <h3>Technical data</h3>
      <p>
        Device/browser type, IP address, and usage events needed to secure and improve the
        service (similar to industry-standard analytics practices used by job platforms
        like Simplify and Teal).
      </p>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide resume editing, AI enhancement, and application automation features.</li>
        <li>Authenticate you and maintain your account.</li>
        <li>Enforce daily AI quotas on EasySubmit-provided AI.</li>
        <li>Improve product reliability and support.</li>
        <li>Comply with legal obligations.</li>
      </ul>
      <p>
        <strong>We do not sell your personal information</strong> to third parties for
        advertising or data brokerage, consistent with commitments made by leading resume
        tools in this category.
      </p>

      <h2>3. AI processing &amp; third-party providers</h2>
      <p>
        When you use <strong>EasySubmit AI</strong>, resume body content (summary, skills,
        experience bullets, etc.) is sent to <strong>Google Gemini</strong> via our server
        infrastructure. We intentionally <strong>do not send contact fields</strong> (name,
        email, phone, LinkedIn URL, address) to AI providers for enhancement requests.
      </p>
      <p>
        When you use <strong>Bring Your Own Key (BYOK)</strong>, requests go to your chosen
        provider (OpenAI, Anthropic, Gemini, etc.) under that provider&apos;s terms. Paid
        API tiers typically do not use your content to train public models — check your
        provider&apos;s documentation.
      </p>
      <p>
        Google&apos;s Gemini API terms apply to EasySubmit AI usage:{" "}
        <a
          href="https://ai.google.dev/gemini-api/terms"
          target="_blank"
          rel="noopener noreferrer"
        >
          ai.google.dev/gemini-api/terms
        </a>
        . Free-tier API usage may be subject to additional Google data-use policies.
      </p>

      <h2>4. Data retention</h2>
      <p>
        Resume profiles remain until you delete them or close your account. AI usage logs
        are retained for operational and billing records. OAuth tokens are stored per
        NextAuth/Supabase conventions.
      </p>

      <h2>5. Security</h2>
      <p>
        BYOK secrets are stored in Supabase Vault — not in plain text in our application
        database. We use industry-standard transport encryption (HTTPS) and access controls
        on production systems.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You may access, export, or delete resume data through the dashboard. You may
        disconnect OAuth providers or sign out at any time. California and EU residents
        may have additional rights — contact us to exercise them.
      </p>

      <h2>7. Children</h2>
      <p>EasySubmit is not intended for users under 18.</p>

      <h2>8. Changes</h2>
      <p>
        We will post updates on this page with a revised date. Material changes to AI
        processing will be reflected here and in product settings.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:privacy@easysubmit.ai">privacy@easysubmit.ai</a>
      </p>
    </>
  );
}
