-- Restore default AI enhancements to on for new users.
ALTER TABLE "users" ALTER COLUMN "aiSourcePreference" SET DEFAULT 'auto';
