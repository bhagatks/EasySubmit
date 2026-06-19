"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import type { RefineryFormValues } from "@/lib/resume/refineryForm";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/45 focus:outline-none focus:ring-1 focus:ring-primary/30";

const TEXTAREA_CLASS = cn(INPUT_CLASS, "min-h-[72px] resize-y");

function EngineLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
    >
      {children}
    </label>
  );
}

function SkillsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (!value || tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  return (
    <div>
      <EngineLabel>Skills</EngineLabel>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            placeholder="Add skill…"
            className={cn(INPUT_CLASS, "flex-1")}
          />
          <button
            type="button"
            onClick={addTag}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ExperienceBullets({ nestIndex }: { nestIndex: number }) {
  const { register, setValue, watch } = useFormContext<RefineryFormValues>();
  const bullets = watch(`experience.${nestIndex}.description`) ?? [];

  function addBullet() {
    setValue(`experience.${nestIndex}.description`, [...bullets, ""], {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeBullet(bulletIndex: number) {
    setValue(
      `experience.${nestIndex}.description`,
      bullets.filter((_, index) => index !== bulletIndex),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  return (
    <div className="space-y-2">
      <EngineLabel>Bullets</EngineLabel>
      {bullets.map((_, bulletIndex) => (
        <div key={`bullet-${nestIndex}-${bulletIndex}`} className="flex gap-2">
          <textarea
            {...register(`experience.${nestIndex}.description.${bulletIndex}`)}
            placeholder="Achievement or responsibility…"
            rows={2}
            className={TEXTAREA_CLASS}
          />
          <button
            type="button"
            onClick={() => removeBullet(bulletIndex)}
            className="mt-2 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Remove bullet"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addBullet}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80"
      >
        <Plus className="h-3.5 w-3.5" />
        Add bullet
      </button>
    </div>
  );
}

function ExperienceFieldCard({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onToggleHidden,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onToggleHidden: (hidden: boolean) => void;
}) {
  const { register, watch } = useFormContext<RefineryFormValues>();
  const hidden = watch(`experience.${index}.hidden`);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-opacity",
        hidden && "opacity-45",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Entry {index + 1}
          {hidden ? " · Hidden" : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleHidden(!hidden)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label={hidden ? "Show section on canvas" : "Hide section on canvas"}
          >
            {hidden ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Remove experience"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <input
          {...register(`experience.${index}.company`)}
          placeholder="Company"
          className={INPUT_CLASS}
        />
        <input
          {...register(`experience.${index}.role`)}
          placeholder="Role"
          className={INPUT_CLASS}
        />
        <input
          {...register(`experience.${index}.date`)}
          placeholder="Jan 2020 – Present"
          className={INPUT_CLASS}
        />
        <ExperienceBullets nestIndex={index} />
      </div>
    </div>
  );
}

function RefineryEditorForm() {
  const { control, register, getValues } = useFormContext<RefineryFormValues>();
  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
    move: moveExperience,
    update: updateExperience,
  } = useFieldArray({ control, name: "experience" });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
    move: moveEducation,
  } = useFieldArray({ control, name: "education" });

  return (
    <form className="space-y-5 pb-6">
      <div>
        <EngineLabel htmlFor="wb-name">Name</EngineLabel>
        <input id="wb-name" {...register("name")} className={INPUT_CLASS} />
      </div>

      <div>
        <EngineLabel htmlFor="wb-job-title">Job Title</EngineLabel>
        <input
          id="wb-job-title"
          {...register("jobTitle")}
          placeholder="Senior Software Engineer"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <EngineLabel htmlFor="wb-email">Email</EngineLabel>
        <input id="wb-email" type="email" {...register("email")} className={INPUT_CLASS} />
      </div>

      <div>
        <EngineLabel htmlFor="wb-phone">Phone</EngineLabel>
        <input id="wb-phone" {...register("phone")} className={INPUT_CLASS} />
      </div>

      <Controller
        control={control}
        name="skills"
        render={({ field }) => (
          <SkillsEditor tags={field.value ?? []} onChange={field.onChange} />
        )}
      />

      <div>
        <EngineLabel>Experience</EngineLabel>
        <div className="space-y-4">
          {experienceFields.map((field, index) => (
            <ExperienceFieldCard
              key={field.id}
              index={index}
              total={experienceFields.length}
              onMoveUp={() => moveExperience(index, index - 1)}
              onMoveDown={() => moveExperience(index, index + 1)}
              onRemove={() => removeExperience(index)}
              onToggleHidden={(hidden) => {
                const current = getValues(`experience.${index}`);
                updateExperience(index, { ...current, hidden });
              }}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              appendExperience({
                company: "",
                role: "",
                date: "",
                description: [],
                hidden: false,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:border-primary/35 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add experience
          </button>
        </div>
      </div>

      <div>
        <EngineLabel>Education</EngineLabel>
        <div className="space-y-4">
          {educationFields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Entry {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveEducation(index, index - 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move education up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === educationFields.length - 1}
                    onClick={() => moveEducation(index, index + 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move education down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label="Remove education"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  {...register(`education.${index}.school`)}
                  placeholder="Institution"
                  className={INPUT_CLASS}
                />
                <input
                  {...register(`education.${index}.degree`)}
                  placeholder="Degree"
                  className={INPUT_CLASS}
                />
                <input
                  {...register(`education.${index}.date`)}
                  placeholder="2018 – 2022"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              appendEducation({ school: "", degree: "", date: "" })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:border-primary/35 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add education
          </button>
        </div>
      </div>
    </form>
  );
}

type RefineryEditorPanelProps = {
  className?: string;
};

export function RefineryEditorPanel({ className }: RefineryEditorPanelProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <p
        className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary"
        style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
      >
        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
        Step 3 · Refinery
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Engine tuning
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Edits sync instantly to the resume canvas — zero latency illusion.
      </p>
      <div className="mt-6">
        <RefineryEditorForm />
      </div>
    </div>
  );
}
