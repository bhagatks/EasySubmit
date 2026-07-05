/**
 * Browser-console helper: paste into DevTools on /dashboard/job-tracker
 * to manual-add jobs sequentially (dashboard path re-run).
 */
const JOBS = [
  {
    company: "CVS Health",
    title: "Lead Director - Software Engineering (Health100 Platform)",
    url: "https://jobs.cvshealth.com/us/en/job/CVSCHLUSR0554608EXTERNALENUS/Lead-Director-Software-Engineering-Health100-Platform",
    description:
      "Lead Director Software Engineering for Health100 platform modernization. Own engineering strategy, DevOps practices, cloud-native delivery, API ecosystems, and healthcare platform reliability. Requires engineering leadership, Java, Kubernetes, AWS, DevOps, microservices, and healthcare technology experience.",
  },
  {
    company: "Hightouch",
    title: "Manager, Solutions Engineering",
    url: "https://job-boards.greenhouse.io/hightouch/jobs/5727573004",
    description:
      "Manager Solutions Engineering at Hightouch leading pre-sales technical teams for Composable CDP and data activation. Deep expertise in Snowflake, BigQuery, Databricks, SQL, Python, JavaScript, APIs, and enterprise SaaS customer engagements required.",
  },
  {
    company: "Suvoda",
    title: "Director, Software Engineering",
    url: "https://www.suvoda.com/careers/job-openings?gh_jid=8521135002",
    description:
      "Director Software Engineering leading clinical trial technology platforms. Responsibilities include engineering organization leadership, SaaS architecture, cloud delivery, API platforms, security, and regulated healthcare software. Requires Java, AWS, microservices, MySQL, and engineering management experience.",
  },
  {
    company: "iRhythm",
    title: "Senior Manager, Software Engineering",
    url: "https://irhythmtech.wd5.myworkdayjobs.com/iRhythm/job/Remote---US/Sr-Manager--Software-Engineering_JR1346",
    description:
      "Senior Manager Software Engineering for remote US digital health platform teams. Lead software delivery, MySQL data services, cloud infrastructure, API development, and cross-functional product engineering. Requires Java, Python, AWS, MySQL, Agile leadership, and medical device software experience.",
  },
  {
    company: "RELX",
    title: "Manager, Software Engineering",
    url: "https://relx.wd3.myworkdayjobs.com/en-US/relx/details/Manager-Software-Engineering_R109104-1",
    description:
      "Manager Software Engineering for legal and risk analytics platforms. Lead engineering teams building JavaScript and Java services, Anti-Money Laundering compliance systems, cloud APIs, and data pipelines. Requires software engineering management, financial crime technology, and enterprise SaaS delivery experience.",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setVal(el, value) {
  if (!el) return;
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForModalClose(maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const heading = [...document.querySelectorAll("h2")].find((h) =>
      (h.textContent ?? "").includes("Add job to Job Tracker"),
    );
    if (!heading) return true;
    await sleep(250);
  }
  return false;
}

async function addJob(job) {
  const addBtn = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent ?? "").trim() === "Add job",
  );
  if (!addBtn) throw new Error("Add job button not found");
  addBtn.click();
  await sleep(1200);

  setVal(document.getElementById("manual-job-title"), job.title);
  setVal(document.getElementById("manual-job-company"), job.company);
  setVal(document.getElementById("manual-job-description"), job.description);
  setVal(document.getElementById("manual-job-url"), job.url);
  await sleep(400);

  const saveBtn = [...document.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes("Save to Job Tracker"),
  );
  if (!saveBtn || saveBtn.disabled) {
    throw new Error(`Save disabled for ${job.company}`);
  }
  saveBtn.click();
  await waitForModalClose();
  await sleep(1500);
  return job.company;
}

(async () => {
  const done = [];
  for (const job of JOBS) {
    try {
      done.push(await addJob(job));
      console.log("[dashboard-batch] saved", job.company);
    } catch (error) {
      console.error("[dashboard-batch] failed", job.company, error);
      break;
    }
  }
  console.log("[dashboard-batch] complete", done);
})();
