import { PrismaClient } from '@prisma/client';
import { Permissions, RoleName, type PermissionKey } from '../src/rbac/rbac.constants';

const prisma = new PrismaClient();

const roles = [
  { name: RoleName.USER, description: 'Default application user' },
  { name: RoleName.EXPERT, description: 'Expert who can manage their profile' },
  { name: RoleName.ADMIN, description: 'Administrator with full access' },
];

const permissions: PermissionKey[] = [
  Permissions.PROFILE_READ_SELF,
  Permissions.PROFILE_UPDATE_SELF,
  Permissions.PROFILE_READ_ANY,
  Permissions.PROFILE_UPDATE_ANY,
  Permissions.USERS_READ_ANY,
  Permissions.USERS_UPDATE_ANY,
  Permissions.EXPERTS_UPDATE_SELF,
  Permissions.ROLES_UPDATE_ANY,
];

const rolePermissions: Record<string, PermissionKey[]> = {
  [RoleName.USER]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
  ],
  [RoleName.EXPERT]: [
    Permissions.PROFILE_READ_SELF,
    Permissions.PROFILE_UPDATE_SELF,
    Permissions.EXPERTS_UPDATE_SELF,
  ],
  [RoleName.ADMIN]: [
    Permissions.PROFILE_READ_ANY,
    Permissions.PROFILE_UPDATE_ANY,
    Permissions.USERS_READ_ANY,
    Permissions.USERS_UPDATE_ANY,
    Permissions.EXPERTS_UPDATE_SELF,
    Permissions.ROLES_UPDATE_ANY,
  ],
};

function permissionLookupKey(permission: PermissionKey) {
  return `${permission.resource}:${permission.action}:${permission.scope}`;
}

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action_scope: {
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
        },
      },
      update: {},
      create: permission,
    });
  }

  const storedRoles = await prisma.role.findMany();
  const storedPermissions = await prisma.permission.findMany();
  const roleByName = new Map(storedRoles.map((role) => [role.name, role]));
  const permissionByKey = new Map(
    storedPermissions.map((permission) => [
      permissionLookupKey(permission),
      permission,
    ]),
  );

  for (const [roleName, assignedPermissions] of Object.entries(rolePermissions)) {
    const role = roleByName.get(roleName);
    if (!role) {
      continue;
    }

    for (const assigned of assignedPermissions) {
      const permission = permissionByKey.get(permissionLookupKey(assigned));
      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const userRole = roleByName.get(RoleName.USER);
  if (userRole) {
    const usersWithoutRole = await prisma.user.findMany({
      where: { userRoles: { none: {} } },
      select: { id: true },
    });

    for (const user of usersWithoutRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: userRole.id },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
