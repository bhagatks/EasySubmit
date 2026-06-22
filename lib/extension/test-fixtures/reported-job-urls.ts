/** Real URLs reported for manual QA — keep in sync with integration tests. */
export const REPORTED_JOB_URLS = {
  slalom:
    "https://jobs.slalom.com/en_US/careersmarketplace/JobDetail?jobId=1959?source=LinkedIn&src=LinkedIn",
  linkedin:
    "https://www.linkedin.com/jobs/view/4409341964/?alternateChannel=search&eBP=CwEAAAGe7PaqQpsIUfuW1Y6pwS9I7gm3E4qkscXfNN2cxMnI6lf5cqfmkrpRU6FU9qPQWdJzTCK7Vzd2VNZ3B8jMxaOJNrzN0Phn21EAL0Ino5OxGskUQEZbHAVrieiAAzi_7tivSy5SvHXK67DC2PcK0XdO6lwJI4RRqo4MlLZJimyxzO24QS1Fu-dmTCJuMZ-ebBc2nDpzEgYa4iAagUsACFN1DXADnJ2Xk9WUk8koGZPdVH-13H8N5HHEq-Ic6dy7B3epnRQH1hSoKPsDYlQHXdmisyY810DFRwSHWbjLSuOmP-p7mQAoBHLbXlm9-ZXBcxIEhn_6F12ikEC2Yo3amXmfESNOeaTEuKv1yPeTxEoJ2gMMgfdYxGQSW8FOcG8mcSjYlrgxHucYC2GUUSZ43HfiZ-nV20pwXS-fYFa0Q5ertQiY7m7t-uUaSiSBLrUdcj_khXARl0OtS9IjIDErpt4TGyuUZNWmRWpqiA&trk=d_flagship3_jobs_discovery_jymbii&refId=MqUrSwGHbXrpSUoZbegI8Q%3D%3D&trackingId=QUrDKCbvn9oqcNFqHiQDkw%3D%3D",
  optimum:
    "https://www.optimumcareers.com/job/Plano-Manager-Software-Engineering-TX-75024/1322795100/?feedId=414300&utm_source=linkedin&utm_campaign=Altice_Circa",
  walmartDetails:
    "https://walmart.wd504.myworkdayjobs.com/en-US/WalmartExternal/details/Senior-Manager--Program-Management_R-2463788-1?q=manager",
  cvs: "https://jobs.cvshealth.com/us/en/job/R0942300/Lead-Director-Software-Development-Engineering",
} as const;

export type ReportedJobSite = keyof typeof REPORTED_JOB_URLS;
