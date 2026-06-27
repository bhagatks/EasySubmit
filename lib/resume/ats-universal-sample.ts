import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";

/** Static preview of the ATS Universal golden template (PDF + DOCX share this layout). */
export const ATS_UNIVERSAL_SAMPLE_RESUME: PrimeResumeData = {
  fullName: "FULL NAME",
  location: "City, State",
  phone: "(555) 123-4567",
  email: "email@example.com",
  linkedIn: "linkedin.com/in/username",
  summary:
    "Results-oriented professional with experience delivering measurable outcomes in fast-paced environments. " +
    "Skilled at cross-functional collaboration, process improvement, and translating business goals into clear execution plans. " +
    "Known for concise communication, attention to detail, and adapting quickly to new tools and workflows. " +
    "Seeking a role where structured impact and ATS-friendly presentation support long-term career growth.",
  skills: [
    "Project Management",
    "Data Analysis",
    "Stakeholder Communication",
    "Process Improvement",
    "Microsoft Excel",
    "SQL",
    "Customer Success",
    "Agile Methodologies",
  ],
  experience: [
    {
      id: "exp-1",
      title: "Job Title",
      company: "Company Name",
      location: "City, State",
      startDate: "Jan 2022",
      endDate: "Present",
      bullets: [
        "Led a cross-functional initiative that improved workflow efficiency by 25% across three teams.",
        "Partnered with stakeholders to define requirements and deliver quarterly roadmap milestones on schedule.",
        "Documented processes and training materials that reduced onboarding time for new hires by 30%.",
      ],
    },
    {
      id: "exp-2",
      title: "Previous Job Title",
      company: "Previous Company",
      location: "City, State",
      startDate: "Jun 2018",
      endDate: "Dec 2021",
      bullets: [
        "Managed day-to-day operations for a portfolio of accounts totaling $1.2M in annual revenue.",
        "Built reporting dashboards used by leadership for weekly performance reviews and planning.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      school: "University Name",
      degree: "Bachelor of Science, Major",
      startDate: "2014",
      endDate: "2018",
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
};
