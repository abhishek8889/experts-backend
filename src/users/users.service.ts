import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DbClient = Prisma.TransactionClient;

const userAccessInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{
  include: typeof userAccessInclude;
}>;

export type PublicPermission = {
  resource: string;
  action: string;
  scope: string;
};

export type PublicUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
  isActive: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  permissions: PublicPermission[];
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone: string;
      roleName: string;
    },
    tx?: DbClient,
  ) {
    const execute = async (db: DbClient) => {
      const role = await db.role.findUnique({
        where: { name: input.roleName },
      });

      if (!role) {
        throw new BadRequestException('auth.INVALID_ROLE');
      }

      return db.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          userRoles: {
            create: { roleId: role.id },
          },
        },
        include: userAccessInclude,
      });
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  findByPhone(phone: string, tx?: DbClient) {
    return this.client(tx).user.findUnique({
      where: { phone },
      include: userAccessInclude,
    });
  }

  findByEmail(email: string, tx?: DbClient) {
    return this.client(tx).user.findUnique({
      where: { email },
      include: userAccessInclude,
    });
  }

  findById(id: string, tx?: DbClient) {
    return this.client(tx).user.findUnique({
      where: { id },
      include: userAccessInclude,
    });
  }

  async markEmailVerified(email: string, tx?: DbClient) {
    const execute = (db: DbClient) =>
      db.user.update({
        where: { email },
        data: {
          verifiedAt: new Date(),
          isActive: true,
        },
        include: userAccessInclude,
      });

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  private client(tx?: DbClient) {
    return tx ?? this.prisma;
  }

  toPublic(user: UserWithAccess): PublicUser {
    const roles = [...new Set(user.userRoles.map((userRole) => userRole.role.name))];
    const permissionMap = new Map<string, PublicPermission>();

    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        const permission: PublicPermission = {
          resource: rolePermission.permission.resource,
          action: rolePermission.permission.action,
          scope: rolePermission.permission.scope,
        };
        permissionMap.set(
          `${permission.resource}:${permission.action}:${permission.scope}`,
          permission,
        );
      }
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      isActive: user.isActive,
      verifiedAt: user.verifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles,
      permissions: [...permissionMap.values()],
    };
  }
}
