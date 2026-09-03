export const RoleName = {
  USER: 'user',
  EXPERT: 'expert',
  ADMIN: 'admin',
} as const;

export const PermissionResource = {
  PROFILE: 'profile',
  USERS: 'users',
  EXPERTS: 'experts',
  ROLES: 'roles',
} as const;

export const PermissionAction = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export const PermissionScope = {
  SELF: 'self',
  ANY: 'any',
} as const;

export type PermissionKey = {
  resource: string;
  action: (typeof PermissionAction)[keyof typeof PermissionAction];
  scope: (typeof PermissionScope)[keyof typeof PermissionScope];
};

export const Permissions = {
  PROFILE_READ_SELF: {
    resource: PermissionResource.PROFILE,
    action: PermissionAction.READ,
    scope: PermissionScope.SELF,
  },
  PROFILE_UPDATE_SELF: {
    resource: PermissionResource.PROFILE,
    action: PermissionAction.UPDATE,
    scope: PermissionScope.SELF,
  },
  PROFILE_READ_ANY: {
    resource: PermissionResource.PROFILE,
    action: PermissionAction.READ,
    scope: PermissionScope.ANY,
  },
  PROFILE_UPDATE_ANY: {
    resource: PermissionResource.PROFILE,
    action: PermissionAction.UPDATE,
    scope: PermissionScope.ANY,
  },
  USERS_READ_ANY: {
    resource: PermissionResource.USERS,
    action: PermissionAction.READ,
    scope: PermissionScope.ANY,
  },
  USERS_UPDATE_ANY: {
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
    scope: PermissionScope.ANY,
  },
  EXPERTS_UPDATE_SELF: {
    resource: PermissionResource.EXPERTS,
    action: PermissionAction.UPDATE,
    scope: PermissionScope.SELF,
  },
  ROLES_UPDATE_ANY: {
    resource: PermissionResource.ROLES,
    action: PermissionAction.UPDATE,
    scope: PermissionScope.ANY,
  },
} as const satisfies Record<string, PermissionKey>;

export function permissionKey(permission: PermissionKey) {
  return `${permission.resource}:${permission.action}:${permission.scope}`;
}
