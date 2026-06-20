-- Split profiles.fullName into firstName and lastName.

ALTER TABLE "profiles" ADD COLUMN "firstName" TEXT;
ALTER TABLE "profiles" ADD COLUMN "lastName" TEXT;

UPDATE "profiles"
SET
  "firstName" = NULLIF(split_part(trim("fullName"), ' ', 1), ''),
  "lastName" = NULLIF(
    CASE
      WHEN strpos(trim("fullName"), ' ') > 0 THEN trim(
        substring(trim("fullName") FROM strpos(trim("fullName"), ' ') + 1)
      )
      ELSE NULL
    END,
    ''
  )
WHERE "fullName" IS NOT NULL AND trim("fullName") <> '';

ALTER TABLE "profiles" DROP COLUMN "fullName";
