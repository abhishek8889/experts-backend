import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly dbHost: string;
  private readonly dbPort: number;
  private readonly dbName: string;
  private connectionVerified = false;

  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.getOrThrow<string>('DATABASE_URL'),
        },
      },
      log:
        configService.get<string>('NODE_ENV') === 'development'
          ? ['error', 'warn']
          : ['error'],
    });

    this.dbHost = configService.getOrThrow<string>('DB_HOST');
    this.dbPort = configService.getOrThrow<number>('DB_PORT');
    this.dbName = configService.getOrThrow<string>('DB_NAME');
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.verifyConnection();
  }

  async verifyConnection() {
    if (this.connectionVerified) {
      return;
    }

    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.connectionVerified = true;
      this.logger.log(
        `Database connection OK (${this.dbHost}:${this.dbPort}/${this.dbName})`,
      );
    } catch (error) {
      this.logger.error(
        `Database connection failed (${this.dbHost}:${this.dbPort}/${this.dbName}). Is Postgres running? Check DATABASE_URL.`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
