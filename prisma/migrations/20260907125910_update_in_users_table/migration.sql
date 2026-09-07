/*
  Warnings:

  - You are about to drop the column `age` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "roles" RENAME CONSTRAINT "role_pkey" TO "roles_pkey";

-- AlterTable
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey",
DROP COLUMN "age",
DROP COLUMN "gender";

-- RenameIndex
ALTER INDEX "role_name_key" RENAME TO "roles_name_key";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "User_phone_key" RENAME TO "users_phone_key";
