import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { TranslatedResult } from '../common/types/translated-result';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  type PublicUser,
  type UserWithAccess,
  UsersService,
} from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

type AuthPayload = {
  user: PublicUser;
  accessToken: string;
};

type DbClient = Prisma.TransactionClient;

const TRANSACTION_OPTIONS = {
  maxWait: 5000,
  timeout: 20_000,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TranslatedResult<{ email: string }>> {
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone.trim();
    const existingEmail = await this.usersService.findByEmail(email);

    if (existingEmail) {
      throw new ConflictException('auth.EMAIL_ALREADY_EXISTS');
    }

    const existingPhone = await this.usersService.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('auth.PHONE_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.usersService.create(
          {
            email,
            passwordHash,
            firstName: dto.first_name.trim(),
            lastName: dto.last_name.trim(),
            phone,
            roleName: dto.role.trim().toLowerCase(),
          },
          tx,
        );
        await this.createAndSendOtp(email, phone, tx);
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (this.isUniqueViolation(error, 'email')) {
        throw new ConflictException('auth.EMAIL_ALREADY_EXISTS');
      }
      if (this.isUniqueViolation(error, 'phone')) {
        throw new ConflictException('auth.PHONE_ALREADY_EXISTS');
      }
      throw error;
    }

    return {
      messageKey: 'auth.REGISTER_SUCCESS',
      data: { email },
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<TranslatedResult<AuthPayload>> {
    const email = dto.email.toLowerCase().trim();
    const otp = dto.otp.trim();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('auth.INVALID_OTP');
    }

    if (user.verifiedAt) {
      throw new ConflictException('auth.ALREADY_VERIFIED');
    }

    const record = await this.prisma.registerVerificationOtp.findFirst({
      where: { email, otp },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('auth.INVALID_OTP');
    }

    if (this.isOtpExpired(record.createdAt)) {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.registerVerificationOtp.delete({
            where: { id: record.id },
          });
        },
        TRANSACTION_OPTIONS,
      );
      throw new BadRequestException('auth.OTP_EXPIRED');
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      const verified = await this.usersService.markEmailVerified(email, tx);
      await tx.registerVerificationOtp.deleteMany({ where: { email } });
      return verified;
    }, TRANSACTION_OPTIONS);

    return {
      messageKey: 'auth.VERIFY_EMAIL_SUCCESS',
      data: {
        user: this.usersService.toPublic(verifiedUser),
        accessToken: await this.signToken(verifiedUser),
      },
    };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<TranslatedResult<{ email: string }>> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('auth.ACCOUNT_NOT_FOUND');
    }

    if (user.verifiedAt) {
      throw new ConflictException('auth.ALREADY_VERIFIED');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.createAndSendOtp(email, user.phone, tx);
    }, TRANSACTION_OPTIONS);

    return {
      messageKey: 'auth.RESEND_VERIFICATION_SUCCESS',
      data: { email },
    };
  }

  async login(dto: LoginDto): Promise<TranslatedResult<AuthPayload>> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('auth.INVALID_CREDENTIALS');
    }

    if (!user.verifiedAt) {
      throw new ForbiddenException('auth.EMAIL_NOT_VERIFIED');
    }

    return {
      messageKey: 'auth.LOGIN_SUCCESS',
      data: {
        user: this.usersService.toPublic(user),
        accessToken: await this.signToken(user),
      },
    };
  }

  getProfile(user: UserWithAccess): TranslatedResult<PublicUser> {
    return {
      messageKey: 'auth.PROFILE_SUCCESS',
      data: this.usersService.toPublic(user),
    };
  }

  private async createAndSendOtp(
    email: string,
    phone: string | null,
    tx: DbClient,
  ) {
    const otp = String(randomInt(100000, 1000000));

    await tx.registerVerificationOtp.deleteMany({ where: { email } });
    await tx.registerVerificationOtp.create({
      data: { email, phone, otp },
    });
    await this.mailService.sendVerificationOtp(email, otp);
  }

  private isOtpExpired(createdAt: Date) {
    const expiresMinutes = Number(
      this.configService.get('OTP_EXPIRES_MINUTES') ?? 10,
    );
    return createdAt.getTime() + expiresMinutes * 60 * 1000 < Date.now();
  }

  private signToken(user: UserWithAccess) {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
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
