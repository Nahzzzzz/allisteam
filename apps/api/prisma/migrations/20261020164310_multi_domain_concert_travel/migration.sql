-- CreateEnum
CREATE TYPE "ConcertSeat" AS ENUM ('STAND', 'INNER', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "TravelTransport" AS ENUM ('PLANE', 'TRAIN', 'SELF_DRIVE', 'BUS', 'ANY');

-- CreateEnum
CREATE TYPE "TravelIntensity" AS ENUM ('RELAXED', 'MODERATE', 'INTENSE');

-- CreateTable
CREATE TABLE "ConcertInfo" (
    "postId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "tourName" TEXT,
    "venue" TEXT,
    "seatType" "ConcertSeat" NOT NULL DEFAULT 'UNDECIDED',
    "hasTicket" BOOLEAN NOT NULL DEFAULT true,
    "ticketNote" TEXT,

    CONSTRAINT "ConcertInfo_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "TravelInfo" (
    "postId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "transport" "TravelTransport" NOT NULL DEFAULT 'ANY',
    "intensity" "TravelIntensity" NOT NULL DEFAULT 'MODERATE',
    "shareRoom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TravelInfo_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE INDEX "ConcertInfo_artist_idx" ON "ConcertInfo"("artist");

-- CreateIndex
CREATE INDEX "ConcertInfo_artist_trgm_idx" ON "ConcertInfo" USING GIN ("artist" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "TravelInfo_destination_trgm_idx" ON "TravelInfo" USING GIN ("destination" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "TravelInfo_budgetMax_idx" ON "TravelInfo"("budgetMax");

-- AddForeignKey
ALTER TABLE "ConcertInfo" ADD CONSTRAINT "ConcertInfo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelInfo" ADD CONSTRAINT "TravelInfo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
