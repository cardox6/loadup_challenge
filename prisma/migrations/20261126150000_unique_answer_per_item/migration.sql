-- DropIndex
DROP INDEX "public"."SubmissionAnswer_submissionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionAnswer_submissionId_itemId_key" ON "public"."SubmissionAnswer"("submissionId", "itemId");

