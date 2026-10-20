-- CreateIndex
CREATE INDEX "Post_status_startTime_idx" ON "Post"("status", "startTime");

-- CreateIndex
CREATE INDEX "Report_reporterId_targetType_targetId_createdAt_idx" ON "Report"("reporterId", "targetType", "targetId", "createdAt" DESC);
