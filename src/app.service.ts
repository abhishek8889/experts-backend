import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslatedResult } from './common/types/translated-result';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getHello(): TranslatedResult {
    return {
      messageKey: 'common.HELLO',
      messageArgs: {
        appName: this.configService.getOrThrow<string>('APP_NAME'),
      },
    };
  }

  async checkDatabase(): Promise<TranslatedResult<{ database: string }>> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      messageKey: 'common.DATABASE_CONNECTED',
      data: { database: 'connected' },
    };
  }
}
