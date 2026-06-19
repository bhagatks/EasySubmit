import type { ResumeWorkExperience } from "@/lib/resume/openResume/types";
import type {
  TextItem,
  FeatureSet,
  ResumeSectionToLines,
  Lines,
} from "@/lib/resume/openResume/types";
import { getSectionLinesByKeywords } from "@/lib/resume/openResume/extract-resume-from-sections/lib/get-section-lines";
import {
  DATE_FEATURE_SETS,
  hasNumber,
  getHasText,
  isBold,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/common-features";
import { divideSectionIntoSubsections } from "@/lib/resume/openResume/extract-resume-from-sections/lib/subsections";
import { getTextWithHighestFeatureScore } from "@/lib/resume/openResume/extract-resume-from-sections/lib/feature-scoring-system";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/bullet-points";
import {
  extractTrailingDateRange,
  firstNonBulletHeaderLine,
  splitCompanyLocation,
  splitPipeCompanyLocation,
  splitTabLine,
} from "@/lib/resume/openResume/extract-resume-from-sections/lib/tab-line-headers";
import { lineHasDateText } from "@/lib/resume/dates";

// prettier-ignore
const WORK_EXPERIENCE_KEYWORDS_LOWERCASE = ['work', 'experience', 'employment', 'history', 'job'];
// prettier-ignore
const JOB_TITLES = ['Accountant', 'Administrator', 'Advisor', 'Agent', 'Analyst', 'Apprentice', 'Architect', 'Assistant', 'Associate', 'Auditor', 'Bartender', 'Biologist', 'Bookkeeper', 'Buyer', 'Carpenter', 'Cashier', 'CEO', 'Clerk', 'Co-op', 'Co-Founder', 'Consultant', 'Coordinator', 'CTO', 'Developer', 'Designer', 'Director', 'Driver', 'Editor', 'Electrician', 'Engineer', 'Extern', 'Founder', 'Freelancer', 'Head', 'Intern', 'Janitor', 'Journalist', 'Laborer', 'Lawyer', 'Lead', 'Manager', 'Mechanic', 'Member', 'Nurse', 'Officer', 'Operator', 'Operation', 'Photographer', 'President', 'Producer', 'Recruiter', 'Representative', 'Researcher', 'Sales', 'Server', 'Scientist', 'Specialist', 'Supervisor', 'Teacher', 'Technician', 'Trader', 'Trainee', 'Treasurer', 'Tutor', 'Vice', 'VP', 'Volunteer', 'Webmaster', 'Worker'];

const hasJobTitle = (item: TextItem) =>
  JOB_TITLES.some((jobTitle) =>
    item.text.split(/\s/).some((word) => word === jobTitle)
  );
const hasMoreThan5Words = (item: TextItem) => item.text.split(/\s/).length > 5;
const JOB_TITLE_FEATURE_SET: FeatureSet[] = [
  [hasJobTitle, 4],
  [hasNumber, -4],
  [hasMoreThan5Words, -2],
];

function joinLine(line: Lines[number]): string {
  return line.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
}

function parseTabStopSubsection(subsectionLines: Lines): {
  jobTitle: string;
  company: string;
  location: string;
  date: string;
  descriptionsLineIdx: number;
} | null {
  if (subsectionLines.length === 0) return null;

  const descriptionsLineIdx =
    getDescriptionsLineIdx(subsectionLines) ?? subsectionLines.length;

  const headerEnd = Math.min(descriptionsLineIdx, subsectionLines.length);
  const headerLines = subsectionLines.slice(0, headerEnd);
  if (headerLines.length === 0) return null;

  const firstIdx = firstNonBulletHeaderLine(headerLines, 0);
  const firstLine = joinLine(headerLines[firstIdx]);
  const secondIdx = firstIdx + 1;
  const secondLine =
    secondIdx < headerLines.length ? joinLine(headerLines[secondIdx]) : "";

  // Pattern: Company | Location on line 1, Title ... | Date on line 2
  const pipeCompany = splitPipeCompanyLocation(firstLine);
  if (pipeCompany && secondLine && lineHasDateText(secondLine)) {
    const trailing = extractTrailingDateRange(secondLine);
    if (trailing) {
      return {
        jobTitle: trailing.title,
        company: pipeCompany.company,
        location: pipeCompany.location,
        date: trailing.date,
        descriptionsLineIdx,
      };
    }
  }

  const tabSplit = splitTabLine(headerLines[firstIdx]);
  if (tabSplit) {
    let company = "";
    let location = "";
    if (secondLine && !lineHasDateText(secondLine)) {
      const parsed = splitCompanyLocation(secondLine);
      company = parsed.company;
      location = parsed.location;
    }

    return {
      jobTitle: tabSplit.left,
      company,
      location,
      date: tabSplit.right,
      descriptionsLineIdx,
    };
  }

  if (secondLine) {
    const trailing = extractTrailingDateRange(secondLine);
    if (trailing) {
      const parsed = splitCompanyLocation(firstLine);
      return {
        jobTitle: trailing.title,
        company: parsed.company || firstLine,
        location: parsed.location,
        date: trailing.date,
        descriptionsLineIdx,
      };
    }
  }

  return null;
}

export const extractWorkExperience = (sections: ResumeSectionToLines) => {
  const workExperiences: ResumeWorkExperience[] = [];
  const workExperiencesScores = [];
  const lines = getSectionLinesByKeywords(
    sections,
    WORK_EXPERIENCE_KEYWORDS_LOWERCASE
  );
  const subsections = divideSectionIntoSubsections(lines);

  for (const subsectionLines of subsections) {
    const tabParsed = parseTabStopSubsection(subsectionLines);

    if (tabParsed) {
      const subsectionDescriptionsLines = subsectionLines.slice(
        tabParsed.descriptionsLineIdx
      );
      const descriptions = getBulletPointsFromLines(subsectionDescriptionsLines);

      workExperiences.push({
        company: tabParsed.location
          ? `${tabParsed.company} — ${tabParsed.location}`.trim()
          : tabParsed.company,
        jobTitle: tabParsed.jobTitle,
        date: tabParsed.date,
        descriptions,
      });
      workExperiencesScores.push({
        companyScores: [],
        jobTitleScores: [],
        dateScores: [],
      });
      continue;
    }

    const descriptionsLineIdx = getDescriptionsLineIdx(subsectionLines) ?? 2;

    const subsectionInfoTextItems = subsectionLines
      .slice(0, descriptionsLineIdx)
      .flat();
    const [date, dateScores] = getTextWithHighestFeatureScore(
      subsectionInfoTextItems,
      DATE_FEATURE_SETS
    );
    const [jobTitle, jobTitleScores] = getTextWithHighestFeatureScore(
      subsectionInfoTextItems,
      JOB_TITLE_FEATURE_SET
    );
    const COMPANY_FEATURE_SET: FeatureSet[] = [
      [isBold, 2],
      [getHasText(date), -4],
      [getHasText(jobTitle), -4],
    ];
    const [company, companyScores] = getTextWithHighestFeatureScore(
      subsectionInfoTextItems,
      COMPANY_FEATURE_SET,
      false
    );

    const subsectionDescriptionsLines =
      subsectionLines.slice(descriptionsLineIdx);
    const descriptions = getBulletPointsFromLines(subsectionDescriptionsLines);

    workExperiences.push({ company, jobTitle, date, descriptions });
    workExperiencesScores.push({
      companyScores,
      jobTitleScores,
      dateScores,
    });
  }
  return { workExperiences, workExperiencesScores };
};
