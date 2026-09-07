import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Gender, Prisma } from '@prisma/client';
import { TranslatedResult } from '../common/types/translated-result';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../rbac/rbac.constants';
import {
  type PublicUser,
  type UserWithAccess,
  UsersService,
} from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type DbClient = Prisma.TransactionClient;

type PublicExpertProfile = {
  id: string;
  dob: Date | null;
  gender: Gender | null;
  yearsOfExperience: number | null;
  termsAndConditions: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfilePayload = PublicUser & {
  expertProfile: PublicExpertProfile | null;
};

const TRANSACTION_OPTIONS = {
  maxWait: 5000,
  timeout: 15_000,
} as const;

const userProfileInclude = {
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
  expertProfile: true,
} satisfies Prisma.UserInclude;

type UserWithProfile = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async updateProfile(
    currentUser: UserWithAccess,
    dto: UpdateProfileDto,
  ): Promise<TranslatedResult<ProfilePayload>> {
    this.ensureHasUpdates(dto);

    const phone = dto.phone?.trim();
    if (phone && phone !== currentUser.phone) {
      const existingPhone = await this.usersService.findByPhone(phone);
      if (existingPhone && existingPhone.id !== currentUser.id) {
        throw new ConflictException('profile.PHONE_ALREADY_EXISTS');
      }
    }

    const isExpert = currentUser.userRoles.some(
      (userRole) => userRole.role.name === RoleName.EXPERT,
    );
    const hasExpertOnlyFields = this.hasExpertOnlyFields(dto);

    if (hasExpertOnlyFields && !isExpert) {
      throw new BadRequestException('profile.EXPERT_FIELDS_NOT_ALLOWED');
    }

    const shouldUpsertExpert =
      isExpert && (hasExpertOnlyFields || dto.gender !== undefined);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.updateUserFields(tx, currentUser.id, dto, phone);

        if (shouldUpsertExpert) {
          await this.upsertExpertProfile(tx, currentUser.id, dto);
        }

        return tx.user.findUniqueOrThrow({
          where: { id: currentUser.id },
          include: userProfileInclude,
        });
      }, TRANSACTION_OPTIONS);

      return {
        messageKey: 'profile.UPDATE_SUCCESS',
        data: this.toProfilePayload(updated),
      };
    } catch (error) {
      if (this.isUniqueViolation(error, 'phone')) {
        throw new ConflictException('profile.PHONE_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  private ensureHasUpdates(dto: UpdateProfileDto) {
    const hasAny =
      dto.first_name !== undefined ||
      dto.last_name !== undefined ||
      dto.phone !== undefined ||
      dto.gender !== undefined ||
      dto.age !== undefined ||
      dto.dob !== undefined ||
      dto.years_of_experience !== undefined ||
      dto.terms_and_conditions !== undefined;

    if (!hasAny) {
      throw new BadRequestException('profile.NO_FIELDS_TO_UPDATE');
    }
  }

  private hasExpertOnlyFields(dto: UpdateProfileDto) {
    return (
      dto.dob !== undefined ||
      dto.years_of_experience !== undefined ||
      dto.terms_and_conditions !== undefined
    );
  }

  private async updateUserFields(
    tx: DbClient,
    userId: string,
    dto: UpdateProfileDto,
    phone?: string,
  ) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.first_name !== undefined) {
      data.firstName = dto.first_name.trim();
    }
    if (dto.last_name !== undefined) {
      data.lastName = dto.last_name.trim();
    }
    if (phone !== undefined) {
      data.phone = phone;
    }
    if (dto.gender !== undefined) {
      data.gender = dto.gender;
    }
    if (dto.age !== undefined) {
      data.age = dto.age;
    }

    if (Object.keys(data).length === 0) {
      return;
    }

    await tx.user.update({
      where: { id: userId },
      data,
    });
  }

  private async upsertExpertProfile(
    tx: DbClient,
    userId: string,
    dto: UpdateProfileDto,
  ) {
    const data: Prisma.ExpertProfileUpdateInput = {};

    if (dto.dob !== undefined) {
      data.dob = new Date(dto.dob);
    }
    if (dto.gender !== undefined) {
      data.gender = dto.gender;
    }
    if (dto.years_of_experience !== undefined) {
      data.yearsOfExperience = dto.years_of_experience;
    }
    if (dto.terms_and_conditions !== undefined) {
      data.termsAndConditions = dto.terms_and_conditions;
    }

    if (Object.keys(data).length === 0) {
      return;
    }

    const existing = await tx.expertProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      await tx.expertProfile.update({
        where: { userId },
        data,
      });
      return;
    }

    await tx.expertProfile.create({
      data: {
        userId,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        gender: dto.gender,
        yearsOfExperience: dto.years_of_experience,
        termsAndConditions: dto.terms_and_conditions ?? false,
      },
    });
  }

  private toProfilePayload(user: UserWithProfile): ProfilePayload {
    return {
      ...this.usersService.toPublic(user),
      expertProfile: user.expertProfile
        ? {
            id: user.expertProfile.id,
            dob: user.expertProfile.dob,
            gender: user.expertProfile.gender,
            yearsOfExperience: user.expertProfile.yearsOfExperience,
            termsAndConditions: user.expertProfile.termsAndConditions,
            status: user.expertProfile.status,
            createdAt: user.expertProfile.createdAt,
            updatedAt: user.expertProfile.updatedAt,
          }
        : null,
    };
  }

  private isUniqueViolation(error: unknown, field: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes(field)
    );
  }
}
