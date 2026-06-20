-- Split users.name into firstName and lastName for login identity.

ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT;

UPDATE "users"
SET
  "firstName" = NULLIF(split_part(trim("name"), ' ', 1), ''),
  "lastName" = NULLIF(
    CASE
      WHEN strpos(trim("name"), ' ') > 0 THEN trim(
        substring(trim("name") FROM strpos(trim("name"), ' ') + 1)
      )
      ELSE NULL
    END,
    ''
  )
WHERE "name" IS NOT NULL AND trim("name") <> '';
