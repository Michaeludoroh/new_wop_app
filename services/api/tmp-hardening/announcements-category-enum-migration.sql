DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementCategory') THEN
    CREATE TYPE "AnnouncementCategory" AS ENUM ('NEWS','EVENT','GENERAL_UPDATE','PRAYER_MEETING','CONFERENCE');
  END IF;
END $$;

ALTER TABLE "Announcement"
  ALTER COLUMN "category" TYPE "AnnouncementCategory"
  USING CASE
    WHEN "category" IN ('NEWS','EVENT','GENERAL_UPDATE','PRAYER_MEETING','CONFERENCE')
      THEN "category"::"AnnouncementCategory"
    ELSE 'GENERAL_UPDATE'::"AnnouncementCategory"
  END;

ALTER TABLE "Announcement"
  ALTER COLUMN "category" SET DEFAULT 'GENERAL_UPDATE'::"AnnouncementCategory";

SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'AnnouncementCategory';

SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_name = 'Announcement' AND column_name = 'category';
