CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE public."User"
ALTER COLUMN "id" SET DEFAULT replace(gen_random_uuid()::text, '-', '');
SELECT column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='User' AND column_name='id';
