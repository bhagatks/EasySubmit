"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PrimeResumeData } from "@/lib/resume/refineryForm";
import { cn } from "@/lib/utils";

type GhostTypewriterResumeProps = {
  data: PrimeResumeData;
  onComplete?: () => void;
  className?: string;
};

type QueueItem = {
  key: string;
  text: string;
  className?: string;
  section: "header" | "experience" | "education" | "skills";
  bullet?: boolean;
};

function buildQueue(data: PrimeResumeData): QueueItem[] {
  const items: QueueItem[] = [];

  items.push({
    key: "name",
    text: data.name?.trim() || "Your Name",
    className: "text-[1.75rem] font-bold leading-none tracking-tight",
    section: "header",
  });

  if (data.jobTitle?.trim()) {
    items.push({
      key: "job-title",
      text: data.jobTitle.trim(),
      className: "mt-2 text-[13px] italic text-primary",
      section: "header",
    });
  }

  const contact = [data.email, data.phone].filter(Boolean).join("  |  ");
  if (contact) {
    items.push({
      key: "contact",
      text: contact,
      className:
        "mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[oklch(0.25_0.02_268/0.65)]",
      section: "header",
    });
  }

  data.experience.forEach((entry, index) => {
    if (entry.company) {
      items.push({
        key: `exp-${index}-company`,
        text: entry.company,
        className: "text-[13px] font-bold",
        section: "experience",
      });
    }
    if (entry.role) {
      items.push({
        key: `exp-${index}-role`,
        text: entry.role,
        className: "text-[12px] italic text-primary",
        section: "experience",
      });
    }
    if (entry.date) {
      items.push({
        key: `exp-${index}-date`,
        text: entry.date,
        className:
          "font-mono text-[9px] tabular-nums tracking-wide text-[oklch(0.25_0.02_268/0.55)]",
        section: "experience",
      });
    }
    entry.description.forEach((bullet, bulletIndex) => {
      items.push({
        key: `exp-${index}-bullet-${bulletIndex}`,
        text: bullet,
        className: "text-[12px] leading-[1.55] text-[oklch(0.25_0.02_268/0.88)]",
        section: "experience",
        bullet: true,
      });
    });
  });

  data.education.forEach((entry, index) => {
    if (entry.school) {
      items.push({
        key: `edu-${index}-school`,
        text: entry.school,
        className: "text-[13px] font-bold",
        section: "education",
      });
    }
    if (entry.degree) {
      items.push({
        key: `edu-${index}-degree`,
        text: entry.degree,
        className: "text-[12px] italic text-primary",
        section: "education",
      });
    }
    if (entry.date) {
      items.push({
        key: `edu-${index}-date`,
        text: entry.date,
        className:
          "font-mono text-[9px] tabular-nums tracking-wide text-[oklch(0.25_0.02_268/0.55)]",
        section: "education",
      });
    }
  });

  if (data.skills.length > 0) {
    items.push({
      key: "skills",
      text: data.skills.join("  |  "),
      className: "text-[11px] leading-relaxed text-[oklch(0.25_0.02_268/0.85)]",
      section: "skills",
    });
  }

  return items;
}

function GhostLine({
  text,
  className,
  ghost,
  bullet,
}: {
  text: string;
  className?: string;
  ghost: boolean;
  bullet?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", bullet && "mt-1.5")}>
      {bullet ? (
        <span className="mt-1 font-mono text-[8px] text-[oklch(0.25_0.02_268/0.35)]">|</span>
      ) : null}
      <p
        className={className}
        style={{
          color: ghost ? "oklch(0.25 0.02 268 / 0.36)" : "oklch(0.25 0.02 268)",
          transition: "color 0.4s ease",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function SectionHeading({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;

  return (
    <motion.h2
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 mt-9 text-[10px] font-semibold uppercase tracking-[0.22em] text-[oklch(0.25_0.02_268/0.5)] first:mt-0"
    >
      {label}
    </motion.h2>
  );
}

export function GhostTypewriterResume({
  data,
  onComplete,
  className,
}: GhostTypewriterResumeProps) {
  const queue = useMemo(() => buildQueue(data), [data]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [solidCount, setSolidCount] = useState(0);

  const activeItem = queue[activeIndex];
  const doneItems = queue.slice(0, solidCount);
  const isTyping = solidCount === activeIndex && activeItem;

  const visibleSections = useMemo(() => {
    const sections = new Set<QueueItem["section"]>();
    for (const item of doneItems) sections.add(item.section);
    if (activeItem) sections.add(activeItem.section);
    return sections;
  }, [activeItem, doneItems]);

  const advanceLine = useCallback(() => {
    setSolidCount((value) => value + 1);
    setCharIndex(0);

    if (activeIndex + 1 >= queue.length) {
      onComplete?.();
      return;
    }

    setActiveIndex((value) => value + 1);
  }, [activeIndex, onComplete, queue.length]);

  useEffect(() => {
    if (queue.length === 0) {
      onComplete?.();
      return;
    }

    if (!activeItem?.text) {
      advanceLine();
      return;
    }

    if (charIndex >= activeItem.text.length) {
      const timer = window.setTimeout(advanceLine, 200);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setCharIndex((value) => value + 1);
    }, 12);

    return () => window.clearTimeout(timer);
  }, [activeItem, advanceLine, charIndex, onComplete, queue.length]);

  const renderSection = (section: QueueItem["section"]) =>
    queue
      .map((item, index) => {
        const isDone = index < solidCount;
        const isActive = index === activeIndex;
        if (item.section !== section) return null;
        if (!isDone && !isActive) return null;

        const text = isActive ? item.text.slice(0, charIndex) : item.text;
        return (
          <GhostLine
            key={item.key}
            text={text}
            className={item.className}
            ghost={isActive}
            bullet={item.bullet}
          />
        );
      })
      .filter(Boolean);

  return (
    <div className={cn("flex w-full justify-center", className)}>
      <article className="resume-paper relative box-border min-h-0 w-full max-w-[210mm] px-[14mm] py-[16mm]">
        <header className="mb-8">
          {renderSection("header")}
          <div
            className="mt-3 h-px w-full bg-primary transition-opacity duration-500"
            style={{ opacity: visibleSections.has("header") ? 1 : 0 }}
            aria-hidden="true"
          />
        </header>

        <SectionHeading label="Experience" visible={visibleSections.has("experience")} />
        <div className="space-y-2">{renderSection("experience")}</div>

        <SectionHeading label="Education" visible={visibleSections.has("education")} />
        <div className="space-y-2">{renderSection("education")}</div>

        <SectionHeading label="Skills" visible={visibleSections.has("skills")} />
        <div>{renderSection("skills")}</div>

        {isTyping ? (
          <span
            className="sr-only"
            aria-live="polite"
          >
            Loading resume content
          </span>
        ) : null}
      </article>
    </div>
  );
}
