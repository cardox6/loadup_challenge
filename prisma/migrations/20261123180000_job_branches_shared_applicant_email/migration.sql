-- DropIndex
DROP INDEX "public"."Applicant_email_key";

-- CreateTable
CREATE TABLE "public"."JobBranch" (
    "jobId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobBranch_pkey" PRIMARY KEY ("jobId","branchId")
);

-- CreateIndex
CREATE INDEX "JobBranch_branchId_idx" ON "public"."JobBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_companyId_key" ON "public"."Branch"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_id_companyId_key" ON "public"."Job"("id", "companyId");

-- AddForeignKey
ALTER TABLE "public"."JobBranch" ADD CONSTRAINT "JobBranch_jobId_companyId_fkey" FOREIGN KEY ("jobId", "companyId") REFERENCES "public"."Job"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobBranch" ADD CONSTRAINT "JobBranch_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "public"."Branch"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;



-- Backfill: until now a job could be ranked at any branch of its company,
-- so every existing job is offered at all of its company's branches.
INSERT INTO "public"."JobBranch" ("jobId", "branchId", "companyId")
SELECT j."id", b."id", j."companyId"
FROM "public"."Job" j
JOIN "public"."Branch" b ON b."companyId" = j."companyId";
