INSERT INTO public."User" ("id","email","fullName","role","passwordHash","deletedAt","createdAt","updatedAt")
VALUES
  (replace(gen_random_uuid()::text,'-',''),'superadmin@wop.local','Seeded Super Admin','SUPER_ADMIN','$2b$12$oacs.IRJbnoMgTeGfpqSD./vi/Y/Dcsz2M1lEHLNumBsz7ovrj0Py',NULL,NOW(),NOW()),
  (replace(gen_random_uuid()::text,'-',''),'admin@wop.local','Seeded Admin','ADMIN','$2b$12$oacs.IRJbnoMgTeGfpqSD./vi/Y/Dcsz2M1lEHLNumBsz7ovrj0Py',NULL,NOW(),NOW()),
  (replace(gen_random_uuid()::text,'-',''),'moderator@wop.local','Seeded Moderator','MODERATOR','$2b$12$oacs.IRJbnoMgTeGfpqSD./vi/Y/Dcsz2M1lEHLNumBsz7ovrj0Py',NULL,NOW(),NOW())
ON CONFLICT ("email") DO UPDATE
SET
  "fullName" = EXCLUDED."fullName",
  "role" = EXCLUDED."role",
  "passwordHash" = EXCLUDED."passwordHash",
  "deletedAt" = NULL,
  "updatedAt" = NOW();

SELECT "id","email","role","fullName","deletedAt" FROM public."User"
WHERE "email" IN ('superadmin@wop.local','admin@wop.local','moderator@wop.local')
ORDER BY "email";
