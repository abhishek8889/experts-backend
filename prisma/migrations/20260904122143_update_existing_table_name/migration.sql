-- Rename existing tables in place (keeps data + foreign keys).
-- Do NOT drop/recreate User/role — that orphans user_role rows.

ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "role" RENAME TO "roles";
