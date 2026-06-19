import { readFile } from "node:fs/promises";
import { openResumeToStructured } from "@/lib/resume/openResume/adapter";
import { parseResumeFromPdfBuffer } from "@/lib/resume/openResume/index";

async function main() {
  const buf = await readFile("ATS_Bhagath_Sample.pdf");
  const r = await parseResumeFromPdfBuffer(buf);
  const s = openResumeToStructured(r);
  console.log(
    JSON.stringify(
      {
        name: s.name,
        skills: s.skills,
        experience: s.experience.map((e) => ({
          role: e.role,
          company: e.company,
          date: e.date,
          bulletCount: e.description.length,
        })),
        education: s.education,
        certifications: s.certifications,
        projects: s.projects,
        summaryLen: s.summary?.length ?? 0,
        rawSections: Object.keys(r as unknown as Record<string, unknown>),
      },
      null,
      2,
    ),
  );
}

main().catch(console.error);
