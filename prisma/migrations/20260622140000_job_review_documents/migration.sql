-- Per-job review documents: cover letter + LaTeX sources
ALTER TABLE "job_resume_tailors"
  ADD COLUMN IF NOT EXISTS "coverLetter" TEXT,
  ADD COLUMN IF NOT EXISTS "resumeLatex" TEXT,
  ADD COLUMN IF NOT EXISTS "coverLetterLatex" TEXT;
