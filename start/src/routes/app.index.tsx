import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Briefcase, Sparkles, TrendingUp, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

const stats = [
  { label: "Resumes generated", value: "12", delta: "+3 this week", icon: FileText },
  { label: "Applications sent", value: "47", delta: "+11 this week", icon: Briefcase },
  { label: "Avg ATS score", value: "96", delta: "+4 vs last month", icon: TrendingUp },
  { label: "AI calls (BYOK)", value: "1,284", delta: "$2.41 spent", icon: Sparkles },
];

const applications = [
  { role: "Senior Product Manager", company: "Linear", status: "Applied", score: 98, when: "2h ago" },
  { role: "Staff Engineer, Platform", company: "Vercel", status: "Interview", score: 96, when: "Yesterday" },
  { role: "Head of Growth", company: "Cal.com", status: "Applied", score: 94, when: "2 days ago" },
  { role: "Product Designer", company: "Raycast", status: "Draft", score: 91, when: "3 days ago" },
];

const statusStyle: Record<string, string> = {
  Applied: "bg-primary/15 text-primary",
  Interview: "bg-mint/15 text-mint",
  Draft: "bg-muted text-muted-foreground",
};

function Overview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back, Alex</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your job hunt at a glance.</p>
        </div>
        <Button variant="hero">
          <Plus className="h-4 w-4" /> New tailored resume
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 font-display text-3xl font-semibold">{s.value}</div>
            <div className="mt-1 text-xs text-mint">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/60 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent applications</h2>
            <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {applications.map((a) => (
              <div key={a.role} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{a.role}</div>
                  <div className="text-xs text-muted-foreground">{a.company} · {a.when}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">ATS {a.score}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[a.status]}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/40 bg-surface p-6 shadow-glow">
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-[10px] font-medium text-mint">
            ATS Guarantee · Active
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold">Every resume verified</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Last 12 resumes parsed cleanly through Workday, Greenhouse, Lever, and 5 more.
          </p>
          <div className="mt-5 space-y-3">
            {[
              { l: "Parse integrity", v: 100 },
              { l: "Keyword match", v: 96 },
              { l: "Recruiter readability", v: 95 },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{m.l}</span><span className="text-foreground">{m.v}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-to-r from-primary to-mint" style={{ width: `${m.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
