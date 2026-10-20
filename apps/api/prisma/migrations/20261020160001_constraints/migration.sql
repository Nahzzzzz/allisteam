-- Custom constraints and indexes that Prisma schema cannot express.
-- Kept in a separate migration so the generated initial migration stays untouched.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" ON "Post" USING GIN (title gin_trgm_ops);

ALTER TABLE "Post" ADD CONSTRAINT "post_capacity_range" CHECK (capacity BETWEEN 2 AND 20);
ALTER TABLE "Post" ADD CONSTRAINT "post_member_count_range" CHECK ("memberCount" >= 1 AND "memberCount" <= capacity);
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range" CHECK (rating BETWEEN 1 AND 5);
