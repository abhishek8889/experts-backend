-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('read', 'create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('self', 'any');

DELETE FROM "role_permission";
DELETE FROM "permissions";

DROP INDEX IF EXISTS "permissions_name_key";

ALTER TABLE "permissions" DROP COLUMN "name";
ALTER TABLE "permissions" DROP COLUMN "description";
ALTER TABLE "permissions" DROP COLUMN "createdAt";
ALTER TABLE "permissions" DROP COLUMN "updatedAt";

ALTER TABLE "permissions" ADD COLUMN "resource" TEXT NOT NULL;
ALTER TABLE "permissions" ADD COLUMN "action" "PermissionAction" NOT NULL;
ALTER TABLE "permissions" ADD COLUMN "scope" "PermissionScope" NOT NULL;

CREATE UNIQUE INDEX "permissions_resource_action_scope_key" ON "permissions"("resource", "action", "scope");
