-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_popupId_idx" ON "Review"("popupId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "Popup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
