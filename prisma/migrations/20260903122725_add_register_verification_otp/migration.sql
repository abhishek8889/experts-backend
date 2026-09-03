-- CreateTable
CREATE TABLE "register_verification_otp" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "otp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "register_verification_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "register_verification_otp_email_idx" ON "register_verification_otp"("email");

-- CreateIndex
CREATE INDEX "register_verification_otp_otp_idx" ON "register_verification_otp"("otp");
