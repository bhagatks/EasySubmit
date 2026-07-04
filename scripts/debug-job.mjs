import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const jobId = process.argv[2] || "cmr5ktsw800004hxn72c7j0kj";

async function main() {
  const job = await prisma.jobTrackerEntry.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      canonicalUrl: true,
      platform: true,
      targetTitle: true,
      company: true,
      status: true,
      createdAt: true,
      enhanceTraceId: true,
      jobDescription: true,
    },
  });

  if (!job) {
    console.log("Job not found");
    process.exit(1);
  }

  console.log("=== JOB DETAILS ===\n");
  console.log(`ID: ${job.id}`);
  console.log(`URL: ${job.canonicalUrl}`);
  console.log(`Platform (stored): ${job.platform || "NOT SET"}`);
  console.log(`Company: ${job.company}`);
  console.log(`Target Role: ${job.targetTitle}`);
  console.log(`Status: ${job.status}`);
  console.log(`Enhance Trace: ${job.enhanceTraceId || "NONE"}`);
  console.log(`Created: ${job.createdAt}`);
  console.log(`JD Length: ${job.jobDescription?.length || 0} chars`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
