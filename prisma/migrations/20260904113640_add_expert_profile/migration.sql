-- CreateEnum
CREATE TYPE "ExpertProfileStatus" AS ENUM ('verified', 'unverified', 'suspended');

-- CreateTable
CREATE TABLE "expert_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "idVerification" TEXT,
    "yearsOfExperience" INTEGER,
    "experienceProofDocument" TEXT,
    "termsAndConditions" BOOLEAN NOT NULL DEFAULT false,
    "status" "ExpertProfileStatus" NOT NULL DEFAULT 'unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expert_profile_userId_key" ON "expert_profile"("userId");

-- AddForeignKey
ALTER TABLE "expert_profile" ADD CONSTRAINT "expert_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
