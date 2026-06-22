import { redirect } from "next/navigation";

/** Legacy route — use /dashboard/job-tracker */
export default function ApplicationsRedirectPage() {
  redirect("/dashboard/job-tracker");
}
