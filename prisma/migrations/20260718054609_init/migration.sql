-- CreateEnum
CREATE TYPE "Category" AS ENUM ('FASHION', 'BEAUTY', 'FOOD', 'GOODS', 'EXHIBIT', 'ETC');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('upcoming', 'ongoing', 'ended');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('manual', 'user_submit', 'brand_official');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT,
    "description" TEXT,
    "category" "Category" NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "Status" NOT NULL DEFAULT 'upcoming',
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "images" TEXT[],
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagramHandle" TEXT,
    "contactEmail" TEXT,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "popupData" JSONB NOT NULL,
    "submitterContact" TEXT,
    "status" "SubStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Popup_lat_lng_idx" ON "Popup"("lat", "lng");

-- CreateIndex
CREATE INDEX "Popup_status_idx" ON "Popup"("status");

-- CreateIndex
CREATE INDEX "Popup_category_idx" ON "Popup"("category");

-- AddForeignKey
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
