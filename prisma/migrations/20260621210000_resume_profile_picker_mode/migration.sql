-- Extension resume profile picker preference
CREATE TYPE "ResumeProfilePickerMode" AS ENUM ('DEFAULT', 'LAST_SELECTED');

ALTER TABLE "users" ADD COLUMN "resumeProfilePickerMode" "ResumeProfilePickerMode" NOT NULL DEFAULT 'DEFAULT';
